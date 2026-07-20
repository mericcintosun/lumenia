#![cfg(test)]
extern crate std;

use super::*;
use ed25519_dalek::{Signer, SigningKey};
use soroban_sdk::testutils::{Address as _, Ledger as _};
use soroban_sdk::{token, Address, Bytes, BytesN, Env};

/// A deterministic Ed25519 link key (no rng needed) from a one-byte seed.
fn link_key(seed: u8) -> SigningKey {
    SigningKey::from_bytes(&[seed; 32])
}
fn link_pub(env: &Env, sk: &SigningKey) -> BytesN<32> {
    BytesN::from_array(env, &sk.verifying_key().to_bytes())
}
/// Sign the EXACT message the contract will rebuild (parity is the whole point).
fn sign(env: &Env, sk: &SigningKey, msg: &Bytes) -> BytesN<64> {
    let bytes: std::vec::Vec<u8> = msg.iter().collect();
    BytesN::from_array(env, &sk.sign(&bytes).to_bytes())
}

struct Fixture<'a> {
    env: Env,
    client: LumenDropClient<'a>,
    token: token::Client<'a>,
    sac: token::StellarAssetClient<'a>,
}

fn setup<'a>() -> Fixture<'a> {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(admin);
    let token_addr = sac.address();
    let id = env.register(LumenDrop, (token_addr.clone(),));
    Fixture {
        client: LumenDropClient::new(&env, &id),
        token: token::Client::new(&env, &token_addr),
        sac: token::StellarAssetClient::new(&env, &token_addr),
        env,
    }
}

fn funded_sender(f: &Fixture, amount: i128) -> Address {
    let s = Address::generate(&f.env);
    f.sac.mint(&s, &amount);
    s
}

/* --------------------------------- one-to-one -------------------------------- */

#[test]
fn deposit_then_claim_to_late_bound_payout() {
    let f = setup();
    let sender = funded_sender(&f, 100);
    let sk = link_key(7);
    let link = link_pub(&f.env, &sk);

    f.client.deposit(&sender, &link, &50, &2000);
    assert_eq!(f.token.balance(&sender), 50);

    // payout chosen AT CLAIM TIME (late binding) — no pre-created account.
    let payout = Address::generate(&f.env);
    let msg = f.client.claim_message(&1, &link, &payout);
    let sig = sign(&f.env, &sk, &msg);

    f.client.claim(&link, &payout, &sig);
    assert_eq!(f.token.balance(&payout), 50);
    assert!(f.client.get_drop(&link).unwrap().claimed);

    // second claim is rejected.
    assert!(f.client.try_claim(&link, &payout, &sig).is_err());
}

#[test]
fn relayer_cannot_redirect_funds() {
    let f = setup();
    let sender = funded_sender(&f, 100);
    let sk = link_key(9);
    let link = link_pub(&f.env, &sk);
    f.client.deposit(&sender, &link, &40, &2000);

    let payout_a = Address::generate(&f.env);
    let attacker = Address::generate(&f.env);
    // The link key signs for payout_a only.
    let sig_a = sign(&f.env, &sk, &f.client.claim_message(&1, &link, &payout_a));

    // A malicious relayer tries to claim to `attacker` with A's signature → trap.
    assert!(f.client.try_claim(&link, &attacker, &sig_a).is_err());
    assert_eq!(f.token.balance(&attacker), 0);

    // The legitimate payout still works and funds are intact.
    f.client.claim(&link, &payout_a, &sig_a);
    assert_eq!(f.token.balance(&payout_a), 40);
    assert_eq!(f.token.balance(&attacker), 0);
}

#[test]
fn wrong_link_key_is_rejected() {
    let f = setup();
    let sender = funded_sender(&f, 100);
    let real = link_key(1);
    let link = link_pub(&f.env, &real);
    f.client.deposit(&sender, &link, &10, &2000);

    let payout = Address::generate(&f.env);
    // A different key signs the correct message → verification fails.
    let forger = link_key(2);
    let sig = sign(&f.env, &forger, &f.client.claim_message(&1, &link, &payout));
    assert!(f.client.try_claim(&link, &payout, &sig).is_err());
    assert_eq!(f.token.balance(&payout), 0);
}

#[test]
fn reclaim_after_expiry_only_by_sender() {
    let f = setup();
    let sender = funded_sender(&f, 100);
    let sk = link_key(3);
    let link = link_pub(&f.env, &sk);
    f.client.deposit(&sender, &link, &60, &2000);

    f.env.ledger().set_timestamp(1000);
    assert!(f.client.try_reclaim(&link).is_err()); // NotExpired

    f.env.ledger().set_timestamp(2500);
    f.client.reclaim(&link);
    assert_eq!(f.token.balance(&sender), 100); // refunded in full
    assert!(f.client.get_drop(&link).unwrap().claimed);
}

#[test]
fn duplicate_deposit_and_bad_amount_rejected() {
    let f = setup();
    let sender = funded_sender(&f, 100);
    let sk = link_key(4);
    let link = link_pub(&f.env, &sk);

    assert_eq!(f.client.try_deposit(&sender, &link, &0, &2000), Err(Ok(Error::BadInput)));
    f.client.deposit(&sender, &link, &20, &2000);
    assert_eq!(f.client.try_deposit(&sender, &link, &20, &2000), Err(Ok(Error::AlreadyExists)));
}

/* ----------------------------------- group ---------------------------------- */

#[test]
fn group_drop_first_n_equal_shares() {
    let f = setup();
    let sender = funded_sender(&f, 100);
    let sk = link_key(11);
    let link = link_pub(&f.env, &sk);
    f.client.create_drop(&sender, &link, &90, &3, &2000); // per = 30

    let mut payouts = std::vec::Vec::new();
    for _ in 0..3 {
        let p = Address::generate(&f.env);
        let sig = sign(&f.env, &sk, &f.client.claim_message(&2, &link, &p));
        f.client.claim_share(&link, &p, &sig);
        assert_eq!(f.token.balance(&p), 30);
        payouts.push(p);
    }
    let pool = f.client.get_pool(&link).unwrap();
    assert_eq!(pool.claimed, 3);
    assert_eq!(pool.remaining, 0);

    // pool is empty for a 4th distinct payout.
    let fourth = Address::generate(&f.env);
    let sig4 = sign(&f.env, &sk, &f.client.claim_message(&2, &link, &fourth));
    assert_eq!(f.client.try_claim_share(&link, &fourth, &sig4), Err(Ok(Error::DropEmpty)));

    // a payout that already claimed cannot double-claim.
    let sig_dupe = sign(&f.env, &sk, &f.client.claim_message(&2, &link, &payouts[0]));
    // (recreate a fresh pool to exercise AlreadyClaimedThis before DropEmpty)
    let sk2 = link_key(12);
    let link2 = link_pub(&f.env, &sk2);
    let sender2 = funded_sender(&f, 100);
    f.client.create_drop(&sender2, &link2, &90, &3, &2000);
    let p = Address::generate(&f.env);
    let sig = sign(&f.env, &sk2, &f.client.claim_message(&2, &link2, &p));
    f.client.claim_share(&link2, &p, &sig);
    assert_eq!(f.client.try_claim_share(&link2, &p, &sig), Err(Ok(Error::AlreadyClaimedThis)));
    let _ = sig_dupe;
}

#[test]
fn group_reclaim_leftover_after_expiry() {
    let f = setup();
    let sender = funded_sender(&f, 100);
    let sk = link_key(13);
    let link = link_pub(&f.env, &sk);
    f.client.create_drop(&sender, &link, &90, &3, &2000); // 3 × 30

    let p = Address::generate(&f.env);
    let sig = sign(&f.env, &sk, &f.client.claim_message(&2, &link, &p));
    f.client.claim_share(&link, &p, &sig); // one share taken → 60 left

    f.env.ledger().set_timestamp(2500);
    f.client.reclaim_pool(&link);
    // sender started 100, funded 90 into the pool (−90 → 10), one share left (−30 to payout),
    // reclaims the remaining 60 → 10 + 60 = 70.
    assert_eq!(f.token.balance(&sender), 70);
    assert_eq!(f.token.balance(&p), 30);
}

#[test]
fn group_signature_is_domain_separated_from_single() {
    let f = setup();
    let sender = funded_sender(&f, 100);
    let sk = link_key(21);
    let link = link_pub(&f.env, &sk);
    f.client.create_drop(&sender, &link, &30, &1, &2000);

    let payout = Address::generate(&f.env);
    // A SINGLE-tag signature must NOT authorize a GROUP claim (different domain tag).
    let single_sig = sign(&f.env, &sk, &f.client.claim_message(&1, &link, &payout));
    assert!(f.client.try_claim_share(&link, &payout, &single_sig).is_err());
    // The correct group-tag signature works.
    let group_sig = sign(&f.env, &sk, &f.client.claim_message(&2, &link, &payout));
    f.client.claim_share(&link, &payout, &group_sig);
    assert_eq!(f.token.balance(&payout), 30);
}

#[test]
fn group_claim_blocked_after_expiry() {
    let f = setup();
    let sender = funded_sender(&f, 100);
    let sk = link_key(30);
    let link = link_pub(&f.env, &sk);
    f.client.create_drop(&sender, &link, &90, &3, &2000);

    f.env.ledger().set_timestamp(2500); // past expiry → only reclaim may move funds
    let payout = Address::generate(&f.env);
    let sig = sign(&f.env, &sk, &f.client.claim_message(&2, &link, &payout));
    assert_eq!(f.client.try_claim_share(&link, &payout, &sig), Err(Ok(Error::Expired)));
    assert_eq!(f.token.balance(&payout), 0);
}

/// REGRESSION (critical): a pool creator must NOT be able to reclaim the pool AND then claim its
/// shares out of the contract's SHARED token balance — which would drain OTHER drops' escrow.
#[test]
fn reclaimed_pool_cannot_drain_another_drops_escrow() {
    let f = setup();

    // A victim escrows 100 USDC as a normal one-to-one drop in the SAME contract.
    let victim = funded_sender(&f, 100);
    let vk = link_key(50);
    let vlink = link_pub(&f.env, &vk);
    f.client.deposit(&victim, &vlink, &100, &2000);

    // The attacker (who holds their own pool's link secret) escrows 100 as a 3-slot pool.
    let attacker = funded_sender(&f, 100);
    let ak = link_key(51);
    let alink = link_pub(&f.env, &ak);
    f.client.create_drop(&attacker, &alink, &100, &3, &2000);

    // Time passes; the attacker reclaims their pool (gets their own 100 back).
    f.env.ledger().set_timestamp(2500);
    f.client.reclaim_pool(&alink);
    assert_eq!(f.token.balance(&attacker), 100);

    // The exploit attempt: also claim shares of the now-reclaimed pool → MUST fail (Expired +
    // the pool is closed). Nothing leaves the contract.
    let evil = Address::generate(&f.env);
    let sig = sign(&f.env, &ak, &f.client.claim_message(&2, &alink, &evil));
    assert_eq!(f.client.try_claim_share(&alink, &evil, &sig), Err(Ok(Error::Expired)));
    assert_eq!(f.token.balance(&evil), 0);

    // Proof the victim's escrow was never touched: their drop still pays out the full 100.
    let vpayout = Address::generate(&f.env);
    let vsig = sign(&f.env, &vk, &f.client.claim_message(&1, &vlink, &vpayout));
    f.client.claim(&vlink, &vpayout, &vsig);
    assert_eq!(f.token.balance(&vpayout), 100);
}
