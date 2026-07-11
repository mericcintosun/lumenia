import { copy } from "../lib/copy";

export default function NotFound() {
  return (
    <main className="center">
      <p className="muted">{copy.errors.notFound}</p>
    </main>
  );
}
