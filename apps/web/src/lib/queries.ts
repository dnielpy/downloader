"use client";

import { type QueryKey, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useToast } from "@/components/ui/toast";

import { api } from "./jd/api";
import { JdError } from "./jd/client";

/** Every cached query, so actions can refresh what they change. */
export const keys = {
  toolbar: ["toolbar"],
  downloadPackages: ["downloads", "packages"],
  downloadLinks: (ids: number[]) => ["downloads", "links", ids],
  downloads: ["downloads"],
  stopMark: ["downloads", "stopMark"],
  grabber: ["grabber"],
  grabberPackages: ["grabber", "packages"],
  grabberLinks: (ids: number[]) => ["grabber", "links", ids],
  grabberJobs: ["grabber", "jobs"],
  captchas: ["captchas"],
  accounts: ["accounts"],
  hosters: ["accounts", "hosters"],
  basicAuths: ["accounts", "basicAuths"],
  extraction: ["extraction"],
  config: (query: string) => ["config", query],
  system: ["system"],
  storage: ["system", "storage"],
  update: ["system", "update"],
} satisfies Record<string, QueryKey | ((...args: never[]) => QueryKey)>;

/** How often the live views refresh, in ms. */
export const LIVE = 1000;

export function useToolbar() {
  return useQuery({ queryKey: keys.toolbar, queryFn: api.toolbar.status, refetchInterval: LIVE });
}

/** Captchas waiting for an answer, read everywhere for the badge in the menu. */
export function useCaptchas() {
  return useQuery({ queryKey: keys.captchas, queryFn: api.captcha.list, refetchInterval: 3000 });
}

/** Free space of the downloads folder. */
export function useStorage() {
  return useQuery({
    queryKey: keys.storage,
    queryFn: () => api.system.storage("/output"),
    refetchInterval: 30_000,
  });
}

/** Whether the last error means JDownloader is not reachable. */
export function isOffline(error: unknown): boolean {
  return error instanceof JdError && error.offline;
}

type ActionOptions = {
  /** Shown when it works; none shows nothing. */
  success?: string;
  /** Queries to refresh afterwards (all of them when left out). */
  refresh?: QueryKey[];
};

/** Runs an action against JDownloader, shows its error as a toast and refreshes the views. */
export function useAction() {
  const client = useQueryClient();
  const toast = useToast();
  return useCallback(
    async <T>(run: () => Promise<T>, options: ActionOptions = {}): Promise<T | undefined> => {
      try {
        const result = await run();
        if (options.success) toast(options.success);
        return result;
      } catch (error) {
        toast(error instanceof Error ? error.message : String(error), "error");
        return undefined;
      } finally {
        if (options.refresh) {
          await Promise.all(
            options.refresh.map((queryKey) => client.invalidateQueries({ queryKey })),
          );
        } else {
          await client.invalidateQueries();
        }
      }
    },
    [client, toast],
  );
}
