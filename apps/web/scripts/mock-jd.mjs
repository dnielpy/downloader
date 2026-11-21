// A fake JDownloader local API for developing the web without the engine: `pnpm --filter web mock`, then
// `pnpm dev` (JD_API_URL defaults to http://localhost:3128). Downloads advance on their own; the state is in memory.
import { createServer } from "node:http";

const PORT = Number(process.env.PORT ?? 3128);
const MB = 1024 * 1024;
let nextId = 1000;
const id = () => nextId++;

const state = {
  running: true,
  paused: false,
  limit: false,
  limitSpeed: 2 * MB,
  stopAfter: false,
  reconnect: false,
  premium: true,
  stopMark: -1,
  packages: [],
  links: [],
  grabberPackages: [],
  grabberLinks: [],
  accounts: [
    {
      uuid: id(),
      hostname: "rapidgator.net",
      username: "me@example.com",
      enabled: true,
      valid: true,
      trafficLeft: 38 * 1024 * MB,
      trafficMax: 50 * 1024 * MB,
      validUntil: Date.now() + 40 * 86400000,
    },
  ],
  basicAuths: [],
  captchas: [
    {
      id: id(),
      hoster: "filefactory.com",
      type: "ImageCaptchaChallenge",
      explain: "Escribe los caracteres",
      created: Date.now(),
      timeout: 300000,
    },
  ],
  config: [
    {
      interfaceName: "org.jdownloader.settings.GeneralSettings",
      key: "DefaultDownloadFolder",
      abstractType: "STRING",
      value: "/output",
      defaultValue: "/output",
      docs: null,
    },
    {
      interfaceName: "org.jdownloader.settings.GeneralSettings",
      key: "MaxSimultaneDownloads",
      abstractType: "INT",
      value: 3,
      defaultValue: 3,
      docs: "How many downloads should run at the same time",
    },
    {
      interfaceName: "org.jdownloader.settings.GeneralSettings",
      key: "MaxChunksPerFile",
      abstractType: "INT",
      value: 1,
      defaultValue: 1,
      docs: null,
    },
    {
      interfaceName: "org.jdownloader.settings.GeneralSettings",
      key: "DownloadSpeedLimit",
      abstractType: "INT",
      value: 2 * MB,
      defaultValue: 0,
      docs: null,
    },
    {
      interfaceName: "org.jdownloader.settings.GeneralSettings",
      key: "DownloadSpeedLimitEnabled",
      abstractType: "BOOLEAN",
      value: false,
      defaultValue: false,
      docs: null,
    },
    {
      interfaceName: "org.jdownloader.settings.GeneralSettings",
      key: "IfFileExistsAction",
      abstractType: "ENUM",
      value: "ASK_FOR_EACH_FILE",
      defaultValue: "ASK_FOR_EACH_FILE",
      enumOptions: [
        ["ASK_FOR_EACH_FILE", "Ask"],
        ["SKIP_FILE", "Skip"],
        ["OVERWRITE_FILE", "Overwrite"],
        ["AUTO_RENAME", "Rename"],
      ],
      docs: null,
    },
    {
      interfaceName: "org.jdownloader.extensions.extraction.ExtractionConfig",
      key: "PasswordList",
      abstractType: "STRING_LIST",
      value: ["secret"],
      defaultValue: [],
      docs: "Passwords tried on every archive",
    },
    {
      interfaceName: "org.jdownloader.extensions.extraction.ExtractionConfig",
      key: "SubpathEnabled",
      abstractType: "BOOLEAN",
      value: false,
      defaultValue: false,
      docs: null,
    },
    {
      interfaceName: "org.jdownloader.controlling.linkcollector.LinkCollectorConfig",
      key: "DoLinkCheck",
      abstractType: "BOOLEAN",
      value: true,
      defaultValue: true,
      docs: null,
    },
  ],
};

function addPackage(name, files, list = "downloads") {
  const uuid = id();
  const target = list === "downloads" ? state : null;
  if (target) {
    state.packages.push({
      uuid,
      name,
      saveTo: `/output/${name}`,
      enabled: true,
      priority: "DEFAULT",
    });
    for (const [file, size] of files) {
      state.links.push({
        uuid: id(),
        packageUUID: uuid,
        name: file,
        host: "rapidgator.net",
        url: `https://rapidgator.net/file/${id()}/${file}`,
        bytesTotal: size,
        bytesLoaded: 0,
        enabled: true,
        finished: false,
        running: false,
        priority: "DEFAULT",
        addedDate: Date.now(),
      });
    }
  } else {
    state.grabberPackages.push({
      uuid,
      name,
      saveTo: `/output/${name}`,
      enabled: true,
      priority: "DEFAULT",
    });
    for (const [file, size, availability] of files) {
      state.grabberLinks.push({
        uuid: id(),
        packageUUID: uuid,
        name: file,
        host: "mega.nz",
        url: `https://mega.nz/file/${id()}`,
        bytesTotal: size,
        availability,
        enabled: true,
        variants: file.endsWith(".mp4"),
        variant: file.endsWith(".mp4") ? { id: "1080", name: "1080p MP4" } : undefined,
      });
    }
  }
}

addPackage("Ubuntu 24.04", [["ubuntu-24.04-desktop-amd64.iso", 5800 * MB]]);
addPackage("Serie S01", [
  ["S01E01.mkv", 1400 * MB],
  ["S01E02.mkv", 1350 * MB],
  ["S01E03.mkv", 1420 * MB],
]);
addPackage("Backup.part", [
  ["backup.part1.rar", 2000 * MB],
  ["backup.part2.rar", 2000 * MB],
  ["backup.part3.rar", 600 * MB],
]);
state.links[0].bytesLoaded = 1200 * MB;
state.links[1].bytesLoaded = 1400 * MB;
state.links[1].finished = true;
state.links[1].finishedDate = Date.now() - 3600000;
addPackage(
  "Documental",
  [
    ["documental.mp4", 900 * MB, "ONLINE"],
    ["subs.srt", 0.1 * MB, "ONLINE"],
    ["extra.zip", -1, "OFFLINE"],
  ],
  "grabber",
);

// Advance the running downloads every second
setInterval(() => {
  if (!state.running || state.paused) return;
  let budget = state.limit ? state.limitSpeed : 12 * MB;
  const active = state.links.filter((l) => l.enabled && !l.finished).slice(0, 3);
  for (const link of state.links) link.running = false;
  for (const link of active) {
    const step = Math.min(budget / active.length, link.bytesTotal - link.bytesLoaded);
    link.bytesLoaded += step;
    link.speed = step;
    link.running = true;
    if (link.bytesLoaded >= link.bytesTotal) {
      Object.assign(link, { finished: true, running: false, speed: 0, finishedDate: Date.now() });
    }
  }
}, 1000);

function pkgView(pkg) {
  const links = state.links.filter((l) => l.packageUUID === pkg.uuid);
  const sum = (f) => links.reduce((s, l) => s + Math.max(0, l[f] ?? 0), 0);
  const speed = links.reduce((s, l) => s + (l.running ? l.speed : 0), 0);
  const left = sum("bytesTotal") - sum("bytesLoaded");
  return {
    ...pkg,
    childCount: links.length,
    bytesTotal: sum("bytesTotal"),
    bytesLoaded: sum("bytesLoaded"),
    hosts: [...new Set(links.map((l) => l.host))],
    running: links.some((l) => l.running),
    finished: links.every((l) => l.finished),
    speed,
    eta: speed ? Math.round(left / speed) : -1,
  };
}

function grabberPkgView(pkg) {
  const links = state.grabberLinks.filter((l) => l.packageUUID === pkg.uuid);
  const count = (a) => links.filter((l) => l.availability === a).length;
  return {
    ...pkg,
    childCount: links.length,
    bytesTotal: links.reduce((s, l) => s + Math.max(0, l.bytesTotal), 0),
    hosts: [...new Set(links.map((l) => l.host))],
    onlineCount: count("ONLINE"),
    offlineCount: count("OFFLINE"),
    unknownCount: count("UNKNOWN"),
  };
}

const inSelection =
  (linkIds = [], packageIds = []) =>
  (l) =>
    linkIds.includes(l.uuid) || packageIds.includes(l.packageUUID);

const CAPTCHA_SVG = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><rect width="200" height="60" fill="#eee"/><text x="30" y="42" font-size="32" font-family="monospace" fill="#333" transform="rotate(-4 100 30)">x7Kp2</text></svg>').toString("base64")}`;

const handlers = {
  "jd/version": () => 2,
  "jd/uptime": () => 5 * 3600000,
  "jd/getCoreRevision": () => 49151,
  "downloadcontroller/start": () => ((state.running = true), (state.paused = false), true),
  "downloadcontroller/stop": () => ((state.running = false), true),
  "downloadcontroller/pause": (v) => ((state.paused = v), true),
  "downloadcontroller/getCurrentState": () =>
    state.running ? (state.paused ? "PAUSE" : "RUNNING") : "IDLE",
  "toolbar/getStatus": () => ({
    running: state.running,
    pause: state.paused,
    state: state.running ? (state.paused ? "PAUSE" : "RUNNING") : "IDLE",
    speed: state.links.reduce((s, l) => s + (l.running ? l.speed : 0), 0),
    limit: state.limit,
    limitspeed: state.limitSpeed,
    stopafter: state.stopAfter,
    reconnect: state.reconnect,
    premium: state.premium,
  }),
  "toolbar/toggleDownloadSpeedLimit": () => (state.limit = !state.limit),
  "toolbar/toggleStopAfterCurrentDownload": () => (state.stopAfter = !state.stopAfter),
  "toolbar/toggleAutomaticReconnect": () => (state.reconnect = !state.reconnect),
  "toolbar/togglePremium": () => (state.premium = !state.premium),
  "reconnect/doReconnect": () => true,
  "downloadsV2/queryPackages": () => state.packages.map(pkgView),
  "downloadsV2/queryLinks": (q) =>
    state.links
      .filter((l) => !q?.packageUUIDs || q.packageUUIDs.includes(l.packageUUID))
      .map((l) => ({
        ...l,
        eta: l.running && l.speed ? Math.round((l.bytesTotal - l.bytesLoaded) / l.speed) : -1,
        status: l.finished
          ? "Terminado"
          : l.running
            ? undefined
            : l.enabled
              ? "En cola"
              : "Desactivado",
      })),
  "downloadsV2/setEnabled": (enabled, linkIds, packageIds) =>
    state.links.filter(inSelection(linkIds, packageIds)).forEach((l) => (l.enabled = enabled)),
  "downloadsV2/setPriority": (priority, linkIds, packageIds) => {
    state.links.filter(inSelection(linkIds, packageIds)).forEach((l) => (l.priority = priority));
    state.packages
      .filter((p) => packageIds.includes(p.uuid))
      .forEach((p) => (p.priority = priority));
  },
  "downloadsV2/removeLinks": (linkIds, packageIds) => {
    state.links = state.links.filter((l) => !inSelection(linkIds, packageIds)(l));
    state.packages = state.packages.filter((p) =>
      state.links.some((l) => l.packageUUID === p.uuid),
    );
  },
  "downloadsV2/cleanup": (linkIds, packageIds, action, mode, selection) => {
    const match = selection === "ALL" ? () => true : inSelection(linkIds, packageIds);
    const drop = (l) =>
      match(l) &&
      (action === "DELETE_ALL" ||
        (action === "DELETE_FINISHED" && l.finished) ||
        (action === "DELETE_DISABLED" && !l.enabled));
    state.links = state.links.filter((l) => !drop(l));
    state.packages = state.packages.filter((p) =>
      state.links.some((l) => l.packageUUID === p.uuid),
    );
  },
  "downloadsV2/resetLinks": (linkIds, packageIds) =>
    state.links
      .filter(inSelection(linkIds, packageIds))
      .forEach((l) => Object.assign(l, { bytesLoaded: 0, finished: false })),
  "downloadsV2/renameLink": (linkId, name) =>
    state.links.filter((l) => l.uuid === linkId).forEach((l) => (l.name = name)),
  "downloadsV2/renamePackage": (packageId, name) =>
    state.packages.filter((p) => p.uuid === packageId).forEach((p) => (p.name = name)),
  "downloadsV2/setDownloadDirectory": (dir, packageIds) =>
    state.packages.filter((p) => packageIds.includes(p.uuid)).forEach((p) => (p.saveTo = dir)),
  "downloadsV2/getStopMark": () => state.stopMark,
  "downloadsV2/setStopMark": (linkId) => (state.stopMark = linkId),
  "downloadsV2/removeStopMark": () => (state.stopMark = -1),
  "linkgrabberv2/queryPackages": () => state.grabberPackages.map(grabberPkgView),
  "linkgrabberv2/queryLinks": (q) =>
    state.grabberLinks.filter((l) => !q?.packageUUIDs || q.packageUUIDs.includes(l.packageUUID)),
  "linkgrabberv2/isCollecting": () => false,
  "linkgrabberv2/addLinks": (q) => {
    const urls = (q.links ?? "").split("\n").filter(Boolean);
    const name = q.packageName || `Paquete ${nextId}`;
    addPackage(
      name,
      urls.map((u) => [u.split("/").pop() || "archivo.bin", 300 * MB, "ONLINE"]),
      "grabber",
    );
    return { id: id() };
  },
  "linkgrabberv2/moveToDownloadlist": (linkIds, packageIds) => {
    for (const pkg of state.grabberPackages.filter(
      (p) =>
        packageIds.includes(p.uuid) ||
        state.grabberLinks.some((l) => l.packageUUID === p.uuid && linkIds.includes(l.uuid)),
    )) {
      const links = state.grabberLinks.filter(
        (l) =>
          l.packageUUID === pkg.uuid && (packageIds.includes(pkg.uuid) || linkIds.includes(l.uuid)),
      );
      addPackage(
        pkg.name,
        links.map((l) => [l.name, l.bytesTotal]),
      );
      state.grabberLinks = state.grabberLinks.filter((l) => !links.includes(l));
    }
    state.grabberPackages = state.grabberPackages.filter((p) =>
      state.grabberLinks.some((l) => l.packageUUID === p.uuid),
    );
  },
  "linkgrabberv2/removeLinks": (linkIds, packageIds) => {
    state.grabberLinks = state.grabberLinks.filter((l) => !inSelection(linkIds, packageIds)(l));
    state.grabberPackages = state.grabberPackages.filter((p) =>
      state.grabberLinks.some((l) => l.packageUUID === p.uuid),
    );
  },
  "linkgrabberv2/clearList": () => ((state.grabberLinks = []), (state.grabberPackages = [])),
  "linkgrabberv2/getVariants": () => [
    { id: "1080", name: "1080p MP4" },
    { id: "720", name: "720p MP4" },
    { id: "audio", name: "Solo audio (M4A)" },
  ],
  "linkgrabberv2/setVariant": (linkId, variantId) =>
    state.grabberLinks
      .filter((l) => l.uuid === linkId)
      .forEach((l) => (l.variant = { id: variantId, name: variantId })),
  "accountsV2/listAccounts": () => state.accounts,
  "accountsV2/listPremiumHoster": () => [
    "rapidgator.net",
    "mega.nz",
    "uploaded.net",
    "1fichier.com",
    "real-debrid.com",
  ],
  "accountsV2/addAccount": (hoster, username) => (
    state.accounts.push({
      uuid: id(),
      hostname: hoster,
      username,
      enabled: true,
      valid: true,
      trafficLeft: -1,
      trafficMax: -1,
      validUntil: -1,
    }),
    true
  ),
  "accountsV2/removeAccounts": (ids) => (
    (state.accounts = state.accounts.filter((a) => !ids.includes(a.uuid))),
    true
  ),
  "accountsV2/enableAccounts": (ids) =>
    state.accounts.filter((a) => ids.includes(a.uuid)).forEach((a) => (a.enabled = true)),
  "accountsV2/disableAccounts": (ids) =>
    state.accounts.filter((a) => ids.includes(a.uuid)).forEach((a) => (a.enabled = false)),
  "accountsV2/refreshAccounts": () => true,
  "accountsV2/listBasicAuth": () => state.basicAuths,
  "accountsV2/addBasicAuth": (type, hostmask, username, password) => (
    state.basicAuths.push({ id: id(), type, hostmask, username, password, enabled: true }),
    nextId
  ),
  "accountsV2/removeBasicAuths": (ids) => (
    (state.basicAuths = state.basicAuths.filter((a) => !ids.includes(a.id))),
    true
  ),
  "captcha/list": () => state.captchas,
  "captcha/get": () => CAPTCHA_SVG,
  "captcha/solve": (cid) => ((state.captchas = state.captchas.filter((c) => c.id !== cid)), true),
  "captcha/skip": (cid) => ((state.captchas = state.captchas.filter((c) => c.id !== cid)), true),
  "extraction/getQueue": () => [
    {
      archiveId: "a1",
      archiveName: "backup.part1.rar",
      controllerId: 7,
      controllerStatus: "RUNNING",
      type: "RAR_MULTI",
    },
  ],
  "extraction/cancelExtraction": () => true,
  "extraction/addArchivePassword": () => true,
  "extraction/startExtractionNow": () => true,
  "config/query": (q) =>
    state.config.filter((e) => !q?.configInterface || e.interfaceName === q.configInterface),
  "config/set": (iface, storage, key, value) => (
    state.config
      .filter((e) => e.interfaceName === iface && e.key === key)
      .forEach((e) => (e.value = value)),
    key === "DownloadSpeedLimit" && (state.limitSpeed = value),
    true
  ),
  "config/reset": (iface, storage, key) => (
    state.config
      .filter((e) => e.interfaceName === iface && e.key === key)
      .forEach((e) => (e.value = e.defaultValue)),
    true
  ),
  "system/getSystemInfos": () => ({
    osName: "Linux",
    osVersion: "6.8",
    archFamily: "X86",
    javaName: "OpenJDK",
    javaVersionString: "17.0.12",
    cpuNum: 2,
    heapUsed: 180 * MB,
    heapMax: 768 * MB,
    headless: true,
  }),
  "system/getStorageInfos": () => [
    { path: "/output", size: 916 * 1024 * MB, free: 843 * 1024 * MB },
  ],
  "system/restartJD": () => null,
  "update/isUpdateAvailable": () => false,
  "update/runUpdateCheck": () => null,
};

createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  const path = url.pathname.slice(1);
  const params = url.search
    ? url.search
        .slice(1)
        .split("&")
        .map((p) => JSON.parse(decodeURIComponent(p)))
    : [];
  const handler = handlers[path];
  res.setHeader("Content-Type", "application/json");
  if (!handler) {
    res.statusCode = 404;
    res.end(JSON.stringify({ type: "API_COMMAND_NOT_FOUND", data: path }));
    return;
  }
  const data = handler(...params);
  res.end(JSON.stringify({ data: data === undefined ? null : data, rid: Date.now() }));
}).listen(PORT, () => console.log(`Mock JDownloader API on http://localhost:${PORT}`));
