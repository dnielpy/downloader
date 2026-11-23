// Cancels Chrome's downloads and sends their links to the downloader's linkgrabber instead.
import { addLink, getSettings, skipReason } from "./lib.js";

const MENU_ID = "send-link";
const ICON = "icons/icon-128.png";

function fileName(url) {
  try {
    const last = new URL(url).pathname.split("/").filter(Boolean).pop();
    return last ? decodeURIComponent(last) : url;
  } catch {
    return url;
  }
}

function notify(id, title, message) {
  chrome.notifications.create(id, { type: "basic", iconUrl: ICON, title, message });
}

async function showState() {
  const { enabled } = await getSettings();
  await chrome.action.setBadgeText({ text: enabled ? "ON" : "OFF" });
  await chrome.action.setBadgeBackgroundColor({ color: enabled ? "#0ea5e9" : "#6b7280" });
}

/** Sends a link; on success the notification opens the linkgrabber when clicked. */
async function send(settings, url, sourceUrl) {
  await addLink(settings, url, sourceUrl);
  notify(`sent:${Date.now()}`, "Enviado al linkgrabber", fileName(url));
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: MENU_ID, title: "Enviar al descargador", contexts: ["link"] });
  showState();
});
chrome.runtime.onStartup.addListener(showState);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && "enabled" in changes) showState();
});

chrome.action.onClicked.addListener(async () => {
  const { enabled } = await getSettings();
  await chrome.storage.sync.set({ enabled: !enabled });
});

chrome.downloads.onCreated.addListener(async (item) => {
  // Downloads this extension started are the fallbacks of failed sends: let them run
  if (item.byExtensionId === chrome.runtime.id || item.state !== "in_progress") return;
  const settings = await getSettings();
  if (!settings.enabled) return;
  const url = item.finalUrl || item.url;
  if (skipReason(settings, url)) return;

  // Cancelled first, so Chrome keeps as little as possible of it
  await chrome.downloads.cancel(item.id).catch(() => {});
  await chrome.downloads.erase({ id: item.id }).catch(() => {});

  try {
    await send(settings, url, item.referrer);
  } catch (error) {
    notify(
      `failed:${Date.now()}`,
      "No se pudo enviar, se descarga en Chrome",
      `${fileName(url)}\n${error.message}`,
    );
    chrome.downloads.download({ url: item.url });
  }
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== MENU_ID || !info.linkUrl) return;
  const settings = await getSettings();
  try {
    await send(settings, info.linkUrl, info.pageUrl);
  } catch (error) {
    notify(`failed:${Date.now()}`, "No se pudo enviar al descargador", error.message);
  }
});

chrome.notifications.onClicked.addListener(async (id) => {
  chrome.notifications.clear(id);
  if (!id.startsWith("sent:")) return;
  const { serverUrl } = await getSettings();
  chrome.tabs.create({ url: `${serverUrl}/linkgrabber` });
});
