/**
 * MoneyMovingAnimation — the single backstage curtain that hides the
 * create-account / trustline / claim sequence behind one calm "money is moving"
 * beat (FRONTEND_PLAN §5 + §5b: one hero moment per flow). Pure CSS (see the
 * .module.css) — NO Motion/animation-library import, so it is safe to render on
 * the Motion-free claim route. Timeboxed component; keep it simple.
 */
import styles from "./MoneyMovingAnimation.module.css";

export function MoneyMovingAnimation({ label }: { label?: string }) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <div className={styles.stage}>
        <span className={`${styles.ring} ${styles.ring1}`} aria-hidden />
        <span className={`${styles.ring} ${styles.ring2}`} aria-hidden />
        <span className={`${styles.ring} ${styles.ring3}`} aria-hidden />
        <span className={styles.core} aria-hidden>
          $
        </span>
      </div>
      {label && <p className={styles.label}>{label}</p>}
    </div>
  );
}
