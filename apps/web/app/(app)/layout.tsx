/**
 * (app) route group layout — wraps the logged-in app views (/home, /unlock) in the
 * single WalletProvider context + the AppShell. The claim route lives OUTSIDE this
 * group, so it gets neither the provider nor the shell (and stays lean). Route
 * groups don't affect URLs: (app)/home → /home.
 */
import { WalletProvider } from "../../lib/wallet";
import { AppShell } from "../../components/brand/AppShell";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <AppShell>{children}</AppShell>
    </WalletProvider>
  );
}
