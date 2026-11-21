import type { Metadata } from "next";

import { AccountsView } from "@/components/accounts/accounts-view";

export const metadata: Metadata = { title: "Cuentas · Downloader" };

export default function Page() {
  return <AccountsView />;
}
