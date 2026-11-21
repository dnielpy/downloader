import type { Metadata } from "next";

import { ExtractionView } from "@/components/extraction/extraction-view";

export const metadata: Metadata = { title: "Extracción · Downloader" };

export default function Page() {
  return <ExtractionView />;
}
