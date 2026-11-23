import { getSettings, jd, normalizeServerUrl } from "./lib.js";

const form = document.getElementById("form");
const status = document.getElementById("status");
const fields = {
  serverUrl: document.getElementById("serverUrl"),
  enabled: document.getElementById("enabled"),
  autostart: document.getElementById("autostart"),
  excludedHosts: document.getElementById("excludedHosts"),
};

function show(message, kind = "") {
  status.textContent = message;
  status.className = kind;
}

function read() {
  return {
    serverUrl: normalizeServerUrl(fields.serverUrl.value),
    enabled: fields.enabled.checked,
    autostart: fields.autostart.checked,
    excludedHosts: fields.excludedHosts.value,
  };
}

const settings = await getSettings();
fields.serverUrl.value = settings.serverUrl;
fields.enabled.checked = settings.enabled;
fields.autostart.checked = settings.autostart;
fields.excludedHosts.value = settings.excludedHosts;

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await chrome.storage.sync.set(read());
  show("Guardado", "ok");
});

document.getElementById("test").addEventListener("click", async () => {
  show("Probando…");
  try {
    const version = await jd(read().serverUrl, "jd/version");
    show(`Conectado (JDownloader ${version})`, "ok");
  } catch (error) {
    show(error.message, "error");
  }
});
