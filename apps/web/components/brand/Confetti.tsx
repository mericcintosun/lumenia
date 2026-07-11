/**
 * Confetti — the earned celebration when money arrives (apricot spice + a little
 * money-green). Pure CSS (see the .module.css), so it runs on the Motion-free
 * claim route. Fixed piece layout (no Math.random) → no SSR hydration mismatch.
 */
import styles from "./Confetti.module.css";

const JOY = "#F4A259";
const MONEY = "#1E7A52";

// deterministic scatter: [left%, delay(ms), color, size]
const PIECES: Array<[number, number, string, number]> = [
  [6, 0, JOY, 9], [14, 120, MONEY, 7], [23, 40, JOY, 10], [31, 200, JOY, 8],
  [39, 90, MONEY, 8], [47, 260, JOY, 9], [53, 30, JOY, 7], [61, 170, MONEY, 9],
  [69, 80, JOY, 10], [77, 220, JOY, 8], [85, 50, MONEY, 7], [92, 140, JOY, 9],
  [18, 300, JOY, 8], [74, 320, MONEY, 8],
];

export function Confetti() {
  return (
    <div className={styles.wrap} aria-hidden>
      {PIECES.map(([left, delay, color, size], i) => (
        <span
          key={i}
          className={styles.piece}
          style={{ left: `${left}%`, animationDelay: `${delay}ms`, background: color, width: size, height: size }}
        />
      ))}
    </div>
  );
}
