// Every JDownloader call the web makes, with the parameters in the order the API documents.
import { jd } from "./client";
import type {
  Account,
  AccountQuery,
  AddLinksQuery,
  AdvancedConfigQuery,
  ArchiveStatus,
  BasicAuth,
  BasicAuthType,
  CaptchaJob,
  CaptchaSkipType,
  CleanupAction,
  CleanupMode,
  ConfigEntry,
  CrawledLink,
  CrawledLinkQuery,
  CrawledPackage,
  CrawledPackageQuery,
  CrawlerJob,
  DownloadLink,
  FilePackage,
  LinkQuery,
  LinkVariant,
  PackageQuery,
  Priority,
  SelectionType,
  StorageInfo,
  SystemInfos,
  ToolbarStatus,
} from "./types";

/** Links and packages a list action applies to. */
export type Selection = { linkIds: number[]; packageIds: number[] };

const PACKAGE_FIELDS: PackageQuery = {
  bytesLoaded: true,
  bytesTotal: true,
  childCount: true,
  comment: true,
  enabled: true,
  eta: true,
  finished: true,
  hosts: true,
  priority: true,
  running: true,
  saveTo: true,
  speed: true,
  status: true,
};

const LINK_FIELDS: LinkQuery = {
  addedDate: true,
  bytesLoaded: true,
  bytesTotal: true,
  comment: true,
  enabled: true,
  eta: true,
  extractionStatus: true,
  finished: true,
  finishedDate: true,
  host: true,
  password: true,
  priority: true,
  running: true,
  skipped: true,
  speed: true,
  status: true,
  url: true,
};

const CRAWLED_PACKAGE_FIELDS: CrawledPackageQuery = {
  bytesTotal: true,
  childCount: true,
  comment: true,
  enabled: true,
  hosts: true,
  priority: true,
  saveTo: true,
  status: true,
  availableOfflineCount: true,
  availableOnlineCount: true,
  availableTempUnknownCount: true,
  availableUnknownCount: true,
};

const CRAWLED_LINK_FIELDS: CrawledLinkQuery = {
  availability: true,
  bytesTotal: true,
  comment: true,
  enabled: true,
  host: true,
  password: true,
  priority: true,
  status: true,
  url: true,
  variantID: true,
  variantName: true,
  variantIcon: true,
  variants: true,
};

// The parameters travel in the URL, so a long list of links is sent in several calls
const MAX_LINKS_CHARS = 3000;

/** Splits pasted text into groups of whole lines that fit in one call. */
export function chunkLinks(text: string, max = MAX_LINKS_CHARS): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const line of text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)) {
    if (current && current.length + line.length + 1 > max) {
      chunks.push(current);
      current = "";
    }
    current = current ? `${current}\n${line}` : line;
  }
  if (current) chunks.push(current);
  return chunks;
}

export const api = {
  jd: {
    version: () => jd<number>("jd/version"),
    uptime: () => jd<number>("jd/uptime"),
    coreRevision: () => jd<number>("jd/getCoreRevision"),
  },

  controller: {
    start: () => jd<boolean>("downloadcontroller/start"),
    stop: () => jd<boolean>("downloadcontroller/stop"),
    pause: (value: boolean) => jd<boolean>("downloadcontroller/pause", value),
    state: () => jd<string>("downloadcontroller/getCurrentState"),
    speed: () => jd<number>("downloadcontroller/getSpeedInBps"),
  },

  toolbar: {
    status: () => jd<ToolbarStatus>("toolbar/getStatus"),
    toggleSpeedLimit: () => jd<boolean>("toolbar/toggleDownloadSpeedLimit"),
    toggleStopAfterCurrent: () => jd<boolean>("toolbar/toggleStopAfterCurrentDownload"),
    toggleReconnect: () => jd<boolean>("toolbar/toggleAutomaticReconnect"),
    togglePremium: () => jd<boolean>("toolbar/togglePremium"),
    toggleClipboard: () => jd<boolean>("toolbar/toggleClipboardMonitoring"),
  },

  downloads: {
    packages: () => jd<FilePackage[]>("downloadsV2/queryPackages", PACKAGE_FIELDS),
    links: (packageUUIDs?: number[]) =>
      jd<DownloadLink[]>("downloadsV2/queryLinks", { ...LINK_FIELDS, packageUUIDs }),
    resume: (s: Selection) => jd("downloadsV2/resumeLinks", s.linkIds, s.packageIds),
    force: (s: Selection) => jd("downloadsV2/forceDownload", s.linkIds, s.packageIds),
    reset: (s: Selection) => jd("downloadsV2/resetLinks", s.linkIds, s.packageIds),
    remove: (s: Selection) => jd("downloadsV2/removeLinks", s.linkIds, s.packageIds),
    checkOnline: (s: Selection) =>
      jd("downloadsV2/startOnlineStatusCheck", s.linkIds, s.packageIds),
    setEnabled: (enabled: boolean, s: Selection) =>
      jd("downloadsV2/setEnabled", enabled, s.linkIds, s.packageIds),
    setPriority: (priority: Priority, s: Selection) =>
      jd("downloadsV2/setPriority", priority, s.linkIds, s.packageIds),
    cleanup: (s: Selection, action: CleanupAction, mode: CleanupMode, selection: SelectionType) =>
      jd("downloadsV2/cleanup", s.linkIds, s.packageIds, action, mode, selection),
    renameLink: (linkId: number, name: string) => jd("downloadsV2/renameLink", linkId, name),
    renamePackage: (packageId: number, name: string) =>
      jd("downloadsV2/renamePackage", packageId, name),
    moveToNewPackage: (s: Selection, name: string, downloadPath: string) =>
      jd("downloadsV2/movetoNewPackage", s.linkIds, s.packageIds, name, downloadPath),
    setDirectory: (directory: string, packageIds: number[]) =>
      jd("downloadsV2/setDownloadDirectory", directory, packageIds),
    setPassword: (s: Selection, password: string) =>
      jd("downloadsV2/setDownloadPassword", s.linkIds, s.packageIds, password),
    setStopMark: (linkId: number, packageId: number) =>
      jd("downloadsV2/setStopMark", linkId, packageId),
    removeStopMark: () => jd("downloadsV2/removeStopMark"),
    stopMark: () => jd<number>("downloadsV2/getStopMark"),
    unskip: (s: Selection) => jd("downloadsV2/unskip", s.packageIds, s.linkIds, null),
    splitByHoster: (s: Selection) =>
      jd("downloadsV2/splitPackageByHoster", s.linkIds, s.packageIds),
  },

  grabber: {
    /** Adds pasted links, in as many calls as needed; returns the crawler job ids. */
    addLinks: async (text: string, options: Omit<AddLinksQuery, "links" | "dataURLs">) => {
      const ids: number[] = [];
      for (const links of chunkLinks(text)) {
        const job = await jd<{ id: number }>("linkgrabberv2/addLinks", {
          ...options,
          links,
          assignJobID: true,
        });
        if (job?.id !== undefined) ids.push(job.id);
      }
      return ids;
    },
    /** Adds container files (DLC, CCF, RSDF…) given as data: URLs. */
    addContainers: (dataURLs: string[], options: Omit<AddLinksQuery, "links" | "dataURLs">) =>
      jd<{ id: number }>("linkgrabberv2/addLinks", { ...options, dataURLs, assignJobID: true }),
    packages: () => jd<CrawledPackage[]>("linkgrabberv2/queryPackages", CRAWLED_PACKAGE_FIELDS),
    links: (packageUUIDs?: number[]) =>
      jd<CrawledLink[]>("linkgrabberv2/queryLinks", { ...CRAWLED_LINK_FIELDS, packageUUIDs }),
    jobs: () =>
      jd<CrawlerJob[]>("linkgrabberv2/queryLinkCrawlerJobs", { collectorInfo: true, jobIds: null }),
    isCollecting: () => jd<boolean>("linkgrabberv2/isCollecting"),
    abort: () => jd<boolean>("linkgrabberv2/abort"),
    moveToDownloads: (s: Selection) =>
      jd("linkgrabberv2/moveToDownloadlist", s.linkIds, s.packageIds),
    remove: (s: Selection) => jd("linkgrabberv2/removeLinks", s.linkIds, s.packageIds),
    clear: () => jd("linkgrabberv2/clearList"),
    setEnabled: (enabled: boolean, s: Selection) =>
      jd("linkgrabberv2/setEnabled", enabled, s.linkIds, s.packageIds),
    setPriority: (priority: Priority, s: Selection) =>
      jd("linkgrabberv2/setPriority", priority, s.linkIds, s.packageIds),
    renameLink: (linkId: number, name: string) => jd("linkgrabberv2/renameLink", linkId, name),
    renamePackage: (packageId: number, name: string) =>
      jd("linkgrabberv2/renamePackage", packageId, name),
    setDirectory: (directory: string, packageIds: number[]) =>
      jd("linkgrabberv2/setDownloadDirectory", directory, packageIds),
    moveToNewPackage: (s: Selection, name: string, downloadPath: string) =>
      jd("linkgrabberv2/movetoNewPackage", s.linkIds, s.packageIds, name, downloadPath),
    checkOnline: (s: Selection) =>
      jd("linkgrabberv2/startOnlineStatusCheck", s.linkIds, s.packageIds),
    cleanup: (s: Selection, action: CleanupAction, mode: CleanupMode, selection: SelectionType) =>
      jd("linkgrabberv2/cleanup", s.linkIds, s.packageIds, action, mode, selection),
    variants: (linkId: number) => jd<LinkVariant[]>("linkgrabberv2/getVariants", linkId),
    setVariant: (linkId: number, variantId: string) =>
      jd("linkgrabberv2/setVariant", linkId, variantId),
  },

  accounts: {
    list: () =>
      jd<Account[]>("accountsV2/listAccounts", {
        userName: true,
        validUntil: true,
        trafficLeft: true,
        trafficMax: true,
        enabled: true,
        valid: true,
        error: true,
      } satisfies AccountQuery),
    hosters: () => jd<string[]>("accountsV2/listPremiumHoster"),
    add: (hoster: string, username: string, password: string) =>
      jd<boolean>("accountsV2/addAccount", hoster, username, password),
    update: (id: number, username: string, password: string) =>
      jd<boolean>("accountsV2/setUserNameAndPassword", id, username, password),
    enable: (ids: number[]) => jd("accountsV2/enableAccounts", ids),
    disable: (ids: number[]) => jd("accountsV2/disableAccounts", ids),
    remove: (ids: number[]) => jd("accountsV2/removeAccounts", ids),
    refresh: (ids: number[]) => jd("accountsV2/refreshAccounts", ids),
    basicAuths: () => jd<BasicAuth[]>("accountsV2/listBasicAuth"),
    addBasicAuth: (type: BasicAuthType, hostmask: string, username: string, password: string) =>
      jd<number>("accountsV2/addBasicAuth", type, hostmask, username, password),
    updateBasicAuth: (auth: BasicAuth) => jd<boolean>("accountsV2/updateBasicAuth", auth),
    removeBasicAuths: (ids: number[]) => jd<boolean>("accountsV2/removeBasicAuths", ids),
  },

  captcha: {
    list: () => jd<CaptchaJob[]>("captcha/list"),
    image: (id: number) => jd<string>("captcha/get", id),
    solve: (id: number, result: string) => jd<boolean>("captcha/solve", id, result),
    skip: (id: number, type: CaptchaSkipType) => jd<boolean>("captcha/skip", id, type),
  },

  extraction: {
    queue: () => jd<ArchiveStatus[]>("extraction/getQueue"),
    cancel: (controllerId: number) => jd<boolean>("extraction/cancelExtraction", controllerId),
    startNow: (s: Selection) => jd("extraction/startExtractionNow", s.linkIds, s.packageIds),
    archiveInfo: (s: Selection) =>
      jd<ArchiveStatus[]>("extraction/getArchiveInfo", s.linkIds, s.packageIds),
    addPassword: (password: string) => jd("extraction/addArchivePassword", password),
  },

  config: {
    query: (query: AdvancedConfigQuery) => jd<ConfigEntry[]>("config/query", query),
    set: (interfaceName: string, storage: string | null, key: string, value: unknown) =>
      jd<boolean>("config/set", interfaceName, storage, key, value),
    reset: (interfaceName: string, storage: string | null, key: string) =>
      jd<boolean>("config/reset", interfaceName, storage, key),
  },

  system: {
    infos: () => jd<SystemInfos>("system/getSystemInfos"),
    storage: (path: string) => jd<StorageInfo[]>("system/getStorageInfos", path),
    restart: () => jd("system/restartJD"),
  },

  update: {
    available: () => jd<boolean>("update/isUpdateAvailable"),
    check: () => jd("update/runUpdateCheck"),
    restartAndUpdate: () => jd("update/restartAndUpdate"),
  },

  reconnect: () => jd("reconnect/doReconnect"),
};
