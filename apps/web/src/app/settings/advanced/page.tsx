import type { Metadata } from "next";

import { AdvancedView } from "@/components/settings/advanced-view";

export const metadata: Metadata = { title: "Ajustes avanzados · Downloader" };

export default function Page() {
  return <AdvancedView />;
}
