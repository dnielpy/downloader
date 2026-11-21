import type { Metadata } from "next";

import { CaptchasView } from "@/components/captchas/captchas-view";

export const metadata: Metadata = { title: "Captchas · Downloader" };

export default function CaptchasPage() {
  return <CaptchasView />;
}
