"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { type ReactNode, useState } from "react";

import { JdError } from "@/lib/jd/client";

import { AddLinksProvider } from "./add-links";
import { PromptProvider } from "./ui/prompt";
import { ToastProvider } from "./ui/toast";

// next-themes' inline script must only run from the server HTML: on the client it is marked as data so React
// does not warn about a script tag inside a component
const clientScriptProps = typeof window === "undefined" ? undefined : { type: "application/json" };

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Live data: always refetched, kept on screen while it refreshes
            staleTime: 0,
            refetchOnWindowFocus: true,
            // JDownloader down: the banner says so; no need to hammer it with retries
            retry: (count, error) => !(error instanceof JdError && error.offline) && count < 1,
          },
        },
      }),
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      scriptProps={clientScriptProps}
    >
      <QueryClientProvider client={client}>
        <ToastProvider>
          <PromptProvider>
            <AddLinksProvider>{children}</AddLinksProvider>
          </PromptProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
