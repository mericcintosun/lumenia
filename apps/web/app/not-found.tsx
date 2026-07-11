import Link from "next/link";
import { copy } from "../lib/copy";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-paper px-6 text-center text-ink">
      <p className="text-ink-soft">{copy.errors.notFound}</p>
      <Link href="/" className="font-semibold text-money underline-offset-2 hover:underline">
        Go home
      </Link>
    </main>
  );
}
