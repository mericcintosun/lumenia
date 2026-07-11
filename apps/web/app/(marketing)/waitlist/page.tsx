import type { Metadata } from "next";
import { EmailCapture } from "../../../components/marketing/EmailCapture";

export const metadata: Metadata = { title: "Join the waitlist — Lumenia" };

export default function Waitlist() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-20 text-center">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
        Be first when real money goes live
      </h1>
      <p className="mx-auto mt-4 max-w-lg text-ink-soft">
        Lumenia is in pilot on a test network today. Leave your email and we&apos;ll tell you the moment you
        can send real money home. Your email is kept on its own — never tied to any money or account.
      </p>
      <div className="mt-8 flex justify-center">
        <EmailCapture list="waitlist" cta="Join the waitlist" />
      </div>
    </main>
  );
}
