import type { Metadata } from "next";

import { LinkGrabberView } from "@/components/linkgrabber/linkgrabber-view";

export const metadata: Metadata = { title: "LinkGrabber · Downloader" };

export default function LinkGrabberPage() {
  return <LinkGrabberView />;
}
