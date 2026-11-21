import type { Metadata } from "next";

import { SettingsView } from "@/components/settings/settings-view";

export const metadata: Metadata = { title: "Ajustes · Downloader" };

export default function Page() {
  return <SettingsView />;
}
