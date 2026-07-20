#![no_std]
//! # Lumenia LumenDrop — v2 Soroban escrow (late-bound payout + in-contract anti-drain)
//!
//! The v2 primitive that fuses the best of the Monad sibling (Damla) with Lumenia's own
//! strengths (see docs/V2_SOROBAN_ESCROW.md):
//!
//!   * **Late-bound payout.** A drop is keyed by the link's ephemeral Ed25519 *public key*
//!     (the secret private key lives only in the URL `#fragment`). The recipient picks the
//!     `payout` address AT CLAIM TIME; the link key signs it; the contract releases the USDC
//!     to exactly that address. There is NO pre-created recipient account, NO reserve to lock,
//!     and NO throwaway-account fragmentation — so the whole v1 sweep/consolidation machinery
//!     simply never exists here.
//!   * **In-contract anti-drain (trustless).** ANYONE (a gas-paying relayer) may submit the
//!     claim tx, but the funds can ONLY reach the payout the link key signed. The relayer can
//!     never steal or redirect a single stroop — enforced in auditable bytecode, not by an
//!     off-chain validator. The signature is bound to this contract + network (anti-replay).
//!   * **USDC, not a volatile native token.** The escrow holds a single pinned SAC token
//!     (USDC's Stellar Asset Contract), set at deploy time.
//!   * **Group drops.** One link, `slots` equal shares, first N distinct payouts each claim one
//!     — walletless + gasless, for tips/giveaways/splits. Leftover reclaimable after expiry.
//!
//! Non-custodial: the contract is the escrow; it only ever moves the exact stored amount to the
//! link-signed payout, or refunds the original sender after expiry. Checks-effects-interactions
//! throughout; Soroban's synchronous model rules out classic reentrancy.

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, xdr::ToXdr, Address,
    Bytes, BytesN, Env,
};

/// Persistent-storage TTL bumps (~1 day threshold, ~30 days extend at 5s ledgers).
const TTL_THRESHOLD: u32 = 17_280;
const TTL_EXTEND: u32 = 518_400;

/// Domain-separation tags folded into the signed message so a signature for one drop kind
/// can never be replayed against the other.
const TAG_SINGLE: u8 = 0x01;
const TAG_GROUP: u8 = 0x02;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    AlreadyExists = 1,
    NothingHere = 2,
    AlreadyClaimed = 3,
    NotExpired = 4,
    NotSender = 5,
    BadInput = 6,
    DropEmpty = 7,
    AlreadyClaimedThis = 8,
    Expired = 9,
}

#[contracttype]
#[derive(Clone)]
pub struct Drop {
    pub sender: Address,
    pub amount: i128,
    pub expiry: u64,
    pub claimed: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct Pool {
    pub sender: Address,
    pub amount_per: i128,
    pub remaining: i128,
    pub slots: u32,
    pub claimed: u32,
    pub expiry: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// The pinned USDC SAC token address.
    Token,
    /// A one-to-one drop, keyed by the link's Ed25519 public key.
    Drop(BytesN<32>),
    /// A group pool, keyed by the link's Ed25519 public key.
    Pool(BytesN<32>),
    /// Per-payout claim flag for a group pool (link, payout) → claimed.
    PoolClaimed(BytesN<32>, Address),
}

#[contract]
pub struct LumenDrop;

#[contractimpl]
impl LumenDrop {
    /// Deploy-time init: pin the ONE USDC SAC token this escrow escrows.
    pub fn __constructor(env: Env, token: Address) {
        env.storage().instance().set(&DataKey::Token, &token);
    }

    /* --------------------------- one-to-one link drop --------------------------- */

    /// Sender locks `amount` USDC for whoever holds the link secret for `link` (its Ed25519
    /// public key). `expiry` is a unix timestamp; after it, an unclaimed drop is reclaimable.
    pub fn deposit(
        env: Env,
        from: Address,
        link: BytesN<32>,
        amount: i128,
        expiry: u64,
    ) -> Result<(), Error> {
        from.require_auth();
        if amount <= 0 {
            return Err(Error::BadInput);
        }
        let key = DataKey::Drop(link.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::AlreadyExists);
        }
        // Pull the sender's USDC into the escrow (the sender authorized above).
        token::Client::new(&env, &Self::token(&env)).transfer(
            &from,
            &env.current_contract_address(),
            &amount,
        );
        env.storage().persistent().set(
            &key,
            &Drop { sender: from.clone(), amount, expiry, claimed: false },
        );
        env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND);
        env.events().publish((symbol_short!("deposit"), link), (from, amount, expiry));
        Ok(())
    }

    /// Claim a one-to-one drop to the chosen `payout`. Submittable by ANYONE (a relayer paying
    /// the fee): the funds go ONLY to `payout`, and only if the link key signed exactly this
    /// (contract, network, link, payout). No `require_auth` — the Ed25519 signature IS the
    /// authorization, which is what makes it walletless + gasless.
    pub fn claim(env: Env, link: BytesN<32>, payout: Address, sig: BytesN<64>) -> Result<(), Error> {
        let key = DataKey::Drop(link.clone());
        let mut d: Drop = env.storage().persistent().get(&key).ok_or(Error::NothingHere)?;
        if d.claimed {
            return Err(Error::AlreadyClaimed);
        }
        // In-contract anti-drain: the link key must have signed THIS payout. ed25519_verify
        // panics (traps the tx) if the signature is wrong — the relayer cannot redirect funds.
        let msg = Self::message(&env, TAG_SINGLE, &link, &payout);
        env.crypto().ed25519_verify(&link, &msg, &sig);

        d.claimed = true; // effects before interaction
        env.storage().persistent().set(&key, &d);
        env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND);
        token::Client::new(&env, &Self::token(&env)).transfer(
            &env.current_contract_address(),
            &payout,
            &d.amount,
        );
        env.events().publish((symbol_short!("claim"), link), (payout, d.amount));
        Ok(())
    }

    /// After expiry, the original sender reclaims an unclaimed drop (the 7-day safety net).
    pub fn reclaim(env: Env, link: BytesN<32>) -> Result<(), Error> {
        let key = DataKey::Drop(link.clone());
        let mut d: Drop = env.storage().persistent().get(&key).ok_or(Error::NothingHere)?;
        if d.claimed {
            return Err(Error::AlreadyClaimed);
        }
        if env.ledger().timestamp() < d.expiry {
            return Err(Error::NotExpired);
        }
        d.sender.require_auth();
        d.claimed = true;
        env.storage().persistent().set(&key, &d);
        token::Client::new(&env, &Self::token(&env)).transfer(
            &env.current_contract_address(),
            &d.sender,
            &d.amount,
        );
        env.events().publish((symbol_short!("reclaim"), link), (d.sender, d.amount));
        Ok(())
    }

    pub fn get_drop(env: Env, link: BytesN<32>) -> Option<Drop> {
        env.storage().persistent().get(&DataKey::Drop(link))
    }

    /* ------------------------------- group drop -------------------------------- */

    /// Fund a pool of `slots` equal shares behind `link`. `amount` USDC is pulled from `from`;
    /// each of the first `slots` distinct payouts claims `amount / slots`.
    pub fn create_drop(
        env: Env,
        from: Address,
        link: BytesN<32>,
        amount: i128,
        slots: u32,
        expiry: u64,
    ) -> Result<(), Error> {
        from.require_auth();
        if amount <= 0 || slots == 0 || amount < slots as i128 {
            return Err(Error::BadInput);
        }
        let key = DataKey::Pool(link.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::AlreadyExists);
        }
        let amount_per = amount / (slots as i128);
        token::Client::new(&env, &Self::token(&env)).transfer(
            &from,
            &env.current_contract_address(),
            &amount,
        );
        env.storage().persistent().set(
            &key,
            &Pool { sender: from.clone(), amount_per, remaining: amount, slots, claimed: 0, expiry },
        );
        env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND);
        env.events().publish((symbol_short!("newpool"), link), (from, amount, slots));
        Ok(())
    }

    /// Claim one share of a group pool to `payout`. Submittable by anyone (relayer). Each
    /// distinct payout may claim at most once; funds go only to the link-signed payout.
    pub fn claim_share(
        env: Env,
        link: BytesN<32>,
        payout: Address,
        sig: BytesN<64>,
    ) -> Result<(), Error> {
        let key = DataKey::Pool(link.clone());
        let mut p: Pool = env.storage().persistent().get(&key).ok_or(Error::NothingHere)?;
        // Claims are only valid BEFORE expiry; after it, ONLY reclaim_pool may move funds.
        // Without this gate, a sender could reclaim the pool AND then claim its shares out of
        // the contract's shared token balance — draining OTHER drops' escrow (double-spend).
        if env.ledger().timestamp() >= p.expiry {
            return Err(Error::Expired);
        }
        // Guard on `remaining` too, not just the slot counter (defense in depth: the pool's own
        // funds can never be over-drawn even if the counter and balance ever diverged).
        if p.claimed >= p.slots || p.remaining < p.amount_per {
            return Err(Error::DropEmpty);
        }
        let claimed_key = DataKey::PoolClaimed(link.clone(), payout.clone());
        if env.storage().persistent().has(&claimed_key) {
            return Err(Error::AlreadyClaimedThis);
        }
        let msg = Self::message(&env, TAG_GROUP, &link, &payout);
        env.crypto().ed25519_verify(&link, &msg, &sig);

        p.claimed += 1;
        p.remaining -= p.amount_per; // remaining >= amount_per held by the guard above
        env.storage().persistent().set(&claimed_key, &true);
        env.storage().persistent().extend_ttl(&claimed_key, TTL_THRESHOLD, TTL_EXTEND);
        env.storage().persistent().set(&key, &p);
        env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND);
        token::Client::new(&env, &Self::token(&env)).transfer(
            &env.current_contract_address(),
            &payout,
            &p.amount_per,
        );
        env.events().publish((symbol_short!("share"), link), (payout, p.amount_per, p.claimed));
        Ok(())
    }

    /// After expiry, the sender reclaims any unclaimed shares (and dust) of a pool.
    pub fn reclaim_pool(env: Env, link: BytesN<32>) -> Result<(), Error> {
        let key = DataKey::Pool(link.clone());
        let mut p: Pool = env.storage().persistent().get(&key).ok_or(Error::NothingHere)?;
        if env.ledger().timestamp() < p.expiry {
            return Err(Error::NotExpired);
        }
        p.sender.require_auth();
        let amount = p.remaining;
        if amount <= 0 {
            return Err(Error::DropEmpty);
        }
        p.remaining = 0;
        p.claimed = p.slots; // CLOSE the pool: after a reclaim no claim_share can ever pass its guard
        env.storage().persistent().set(&key, &p);
        token::Client::new(&env, &Self::token(&env)).transfer(
            &env.current_contract_address(),
            &p.sender,
            &amount,
        );
        env.events().publish((symbol_short!("repool"), link), (p.sender, amount));
        Ok(())
    }

    pub fn get_pool(env: Env, link: BytesN<32>) -> Option<Pool> {
        env.storage().persistent().get(&DataKey::Pool(link))
    }

    /* --------------------------------- helpers --------------------------------- */

    /// The EXACT bytes the link key must sign for a claim. Exposed as a view so the client can
    /// build the identical message (or simulate this) — signature parity is critical. Layout:
    ///   tag(1) ++ network_id(32) ++ contract_address_xdr ++ link_pubkey(32) ++ payout_xdr
    /// Binding contract + network blocks cross-contract / cross-network replay.
    pub fn claim_message(env: Env, kind: u32, link: BytesN<32>, payout: Address) -> Bytes {
        let tag = if kind == 2 { TAG_GROUP } else { TAG_SINGLE };
        Self::message(&env, tag, &link, &payout)
    }

    fn message(env: &Env, tag: u8, link: &BytesN<32>, payout: &Address) -> Bytes {
        let mut m = Bytes::new(env);
        m.push_back(tag);
        m.append(&Bytes::from_array(env, &env.ledger().network_id().to_array()));
        m.append(&env.current_contract_address().to_xdr(env));
        m.append(&Bytes::from_array(env, &link.to_array()));
        m.append(&payout.clone().to_xdr(env));
        m
    }

    fn token(env: &Env) -> Address {
        env.storage().instance().get(&DataKey::Token).unwrap()
    }
}

#[cfg(test)]
mod test;
