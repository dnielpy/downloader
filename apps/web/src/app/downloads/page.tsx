import type { Metadata } from "next";

import { DownloadsView } from "@/components/downloads/downloads-view";

export const metadata: Metadata = { title: "Descargas · Downloader" };

export default function DownloadsPage() {
  return <DownloadsView />;
}
