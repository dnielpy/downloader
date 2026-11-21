// The shapes JDownloader's API takes and returns, as documented at https://my.jdownloader.org/developers/.
// Fields a query does not ask for are left out of the response, so most are optional.

export type Priority = "HIGHEST" | "HIGHER" | "HIGH" | "DEFAULT" | "LOW" | "LOWER" | "LOWEST";

export const PRIORITY_LABELS: Record<Priority, string> = {
  HIGHEST: "Máxima",
  HIGHER: "Muy alta",
  HIGH: "Alta",
  DEFAULT: "Normal",
  LOW: "Baja",
  LOWER: "Muy baja",
  LOWEST: "Mínima",
};

export const PRIORITIES = Object.keys(PRIORITY_LABELS) as Priority[];

export type CleanupAction =
  | "DELETE_ALL"
  | "DELETE_DISABLED"
  | "DELETE_FAILED"
  | "DELETE_FINISHED"
  | "DELETE_OFFLINE"
  | "DELETE_DUPE"
  | "DELETE_MODE";
export type CleanupMode =
  | "REMOVE_LINKS_ONLY"
  | "REMOVE_LINKS_AND_DELETE_FILES"
  | "REMOVE_LINKS_AND_RECYCLE_FILES";
export type SelectionType = "SELECTED" | "UNSELECTED" | "ALL" | "NONE";

/** Which fields queryPackages returns, plus paging and a filter by package. */
export type PackageQuery = {
  bytesLoaded?: boolean;
  bytesTotal?: boolean;
  childCount?: boolean;
  comment?: boolean;
  enabled?: boolean;
  eta?: boolean;
  finished?: boolean;
  hosts?: boolean;
  priority?: boolean;
  running?: boolean;
  saveTo?: boolean;
  speed?: boolean;
  status?: boolean;
  packageUUIDs?: number[];
  maxResults?: number;
  startAt?: number;
};

export type LinkQuery = {
  addedDate?: boolean;
  bytesLoaded?: boolean;
  bytesTotal?: boolean;
  comment?: boolean;
  enabled?: boolean;
  eta?: boolean;
  extractionStatus?: boolean;
  finished?: boolean;
  finishedDate?: boolean;
  host?: boolean;
  password?: boolean;
  priority?: boolean;
  running?: boolean;
  skipped?: boolean;
  speed?: boolean;
  status?: boolean;
  url?: boolean;
  jobUUIDs?: number[];
  packageUUIDs?: number[];
  maxResults?: number;
  startAt?: number;
};

export type FilePackage = {
  uuid: number;
  name: string;
  activeTask?: string;
  bytesLoaded?: number;
  bytesTotal?: number;
  childCount?: number;
  comment?: string;
  downloadPassword?: string;
  enabled?: boolean;
  eta?: number;
  finished?: boolean;
  hosts?: string[];
  priority?: Priority;
  running?: boolean;
  saveTo?: string;
  speed?: number;
  status?: string;
  statusIconKey?: string;
};

export type DownloadLink = {
  uuid: number;
  packageUUID: number;
  name: string;
  addedDate?: number;
  bytesLoaded?: number;
  bytesTotal?: number;
  comment?: string;
  downloadPassword?: string;
  enabled?: boolean;
  eta?: number;
  extractionStatus?: string;
  finished?: boolean;
  finishedDate?: number;
  host?: string;
  priority?: Priority;
  running?: boolean;
  skipped?: boolean;
  speed?: number;
  status?: string;
  statusIconKey?: string;
  url?: string;
};

export type CrawledPackageQuery = {
  bytesTotal?: boolean;
  childCount?: boolean;
  comment?: boolean;
  enabled?: boolean;
  hosts?: boolean;
  priority?: boolean;
  saveTo?: boolean;
  status?: boolean;
  availableOfflineCount?: boolean;
  availableOnlineCount?: boolean;
  availableTempUnknownCount?: boolean;
  availableUnknownCount?: boolean;
  packageUUIDs?: number[];
  maxResults?: number;
  startAt?: number;
};

export type CrawledLinkQuery = {
  availability?: boolean;
  bytesTotal?: boolean;
  comment?: boolean;
  enabled?: boolean;
  host?: boolean;
  password?: boolean;
  priority?: boolean;
  status?: boolean;
  url?: boolean;
  variantID?: boolean;
  variantIcon?: boolean;
  variantName?: boolean;
  variants?: boolean;
  jobUUIDs?: number[];
  packageUUIDs?: number[];
  maxResults?: number;
  startAt?: number;
};

export type Availability = "ONLINE" | "OFFLINE" | "UNKNOWN" | "TEMP_UNKNOWN";

export type CrawledPackage = {
  uuid: number;
  name: string;
  bytesTotal?: number;
  childCount?: number;
  comment?: string;
  enabled?: boolean;
  hosts?: string[];
  priority?: Priority;
  saveTo?: string;
  onlineCount?: number;
  offlineCount?: number;
  tempUnknownCount?: number;
  unknownCount?: number;
};

export type LinkVariant = { id: string; name: string; iconKey?: string };

export type CrawledLink = {
  uuid: number;
  packageUUID: number;
  name: string;
  availability?: Availability;
  bytesTotal?: number;
  comment?: string;
  downloadPassword?: string;
  enabled?: boolean;
  host?: string;
  priority?: Priority;
  url?: string;
  variant?: LinkVariant;
  variants?: boolean;
};

export type AddLinksQuery = {
  links?: string;
  packageName?: string;
  destinationFolder?: string;
  extractPassword?: string;
  downloadPassword?: string;
  sourceUrl?: string;
  comment?: string;
  dataURLs?: string[];
  priority?: Priority;
  autostart?: boolean;
  autoExtract?: boolean;
  deepDecrypt?: boolean;
  assignJobID?: boolean;
  overwritePackagizerRules?: boolean;
};

export type CrawlerJob = {
  jobId: number;
  crawlerId?: number;
  crawling?: boolean;
  checking?: boolean;
  crawled?: number;
  broken?: number;
  filtered?: number;
  unhandled?: number;
};

export type Account = {
  uuid: number;
  hostname: string;
  username?: string;
  enabled?: boolean;
  valid?: boolean;
  errorType?: string;
  errorString?: string;
  trafficLeft?: number;
  trafficMax?: number;
  validUntil?: number;
};

export type AccountQuery = {
  userName?: boolean;
  validUntil?: boolean;
  trafficLeft?: boolean;
  trafficMax?: boolean;
  enabled?: boolean;
  valid?: boolean;
  error?: boolean;
  UUIDList?: number[];
  startAt?: number;
  maxResults?: number;
};

export type BasicAuthType = "FTP" | "HTTP";

export type BasicAuth = {
  id: number;
  type: BasicAuthType;
  hostmask: string;
  username: string;
  password: string;
  enabled: boolean;
  created?: number;
  lastValidated?: number;
};

export type CaptchaJob = {
  id: number;
  hoster: string;
  type: string;
  captchaCategory?: string;
  explain?: string;
  timeout?: number;
  created?: number;
  link?: number;
};

export type CaptchaSkipType =
  | "SINGLE"
  | "BLOCK_HOSTER"
  | "BLOCK_ALL_CAPTCHAS"
  | "BLOCK_PACKAGE"
  | "REFRESH"
  | "STOP_CURRENT_ACTION"
  | "TIMEOUT";

export type ArchiveStatus = {
  archiveId: string;
  archiveName: string;
  controllerId?: number;
  controllerStatus?: "RUNNING" | "QUEUED" | "NA";
  states?: Record<string, string>;
  type?: string;
};

export type AdvancedConfigQuery = {
  configInterface?: string;
  pattern?: string;
  values?: boolean;
  defaultValues?: boolean;
  description?: boolean;
  enumInfo?: boolean;
  includeExtensions?: boolean;
};

export type EnumOption = [value: string, label: string | null];

export type ConfigEntry = {
  interfaceName: string;
  key: string;
  storage?: string | null;
  type?: string;
  abstractType?: string;
  value?: unknown;
  defaultValue?: unknown;
  docs?: string | null;
  enumLabel?: string | null;
  enumOptions?: EnumOption[] | null;
};

export type StorageInfo = { path: string; size: number; free: number; error?: string | null };

export type SystemInfos = {
  osName?: string;
  osVersion?: string;
  osFamily?: string;
  archFamily?: string;
  arch64Bit?: boolean;
  javaName?: string;
  javaVersionString?: string;
  javaVendor?: string;
  headless?: boolean;
  cpuNum?: number;
  startupTimeStamp?: number;
  heapUsed?: number;
  heapCommitted?: number;
  heapMax?: number;
  jvm64Bit?: boolean;
};

/** toolbar/getStatus. The keys are not documented; these are the ones JDownloader sends. */
export type ToolbarStatus = {
  running?: boolean;
  pause?: boolean;
  stopafter?: boolean;
  limit?: boolean;
  limitspeed?: number;
  speed?: number;
  reconnect?: boolean;
  clipboard?: boolean;
  premium?: boolean;
  state?: string;
  download_current?: number;
  download_complete?: number;
  [key: string]: unknown;
};
