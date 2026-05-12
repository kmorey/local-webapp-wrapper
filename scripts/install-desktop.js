const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const defaultConfigFile = path.join(
  process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"),
  "local-webapp-wrapper",
  "config.json"
);
const configFile = process.env.LOCAL_WEBAPP_CONFIG || (
  fs.existsSync(defaultConfigFile)
    ? defaultConfigFile
    : path.join(__dirname, "..", "config.example.json")
);
const applicationsDir = path.join(
  process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share"),
  "applications"
);
const launcher = path.join(os.homedir(), ".local", "bin", "local-webapp-wrapper");

function desktopEscape(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll("\n", "\\n");
}

function writeDesktop(appId, config) {
  const desktopName = config.desktopName || `${config.windowClass || `local-webapp-${appId}`}.desktop`;
  const windowClass = config.windowClass || `local-webapp-${appId}`;
  const mimeTypes = config.mimeTypes || [];
  const acceptsUrl = mimeTypes.length > 0 || config.acceptsUrl;
  const exec = `${launcher} ${appId}${acceptsUrl ? " %u" : ""}`;
  const categories = config.categories && config.categories.length > 0
    ? `${config.categories.join(";")};`
    : "Network;";
  const lines = [
    "[Desktop Entry]",
    "Version=1.0",
    `Name=${desktopEscape(config.title || appId)}`,
    `Comment=${desktopEscape(config.comment || `${config.title || appId} web app`)}`,
    `Exec=${desktopEscape(exec)}`,
    "Terminal=false",
    "Type=Application",
    `Icon=${desktopEscape(config.icon || "applications-internet")}`,
    "StartupNotify=true",
    `StartupWMClass=${desktopEscape(windowClass)}`,
    `Categories=${desktopEscape(categories)}`
  ];

  if (mimeTypes.length > 0) {
    lines.push(`MimeType=${desktopEscape(`${mimeTypes.join(";")};`)}`);
  }

  const target = path.join(applicationsDir, desktopName);
  fs.writeFileSync(target, `${lines.join("\n")}\n`, { mode: 0o755 });
  fs.chmodSync(target, 0o755);
  console.log(`Wrote ${target}`);
}

const config = JSON.parse(fs.readFileSync(configFile, "utf8"));
fs.mkdirSync(applicationsDir, { recursive: true });

for (const [appId, appConfig] of Object.entries(config.apps || {})) {
  writeDesktop(appId, appConfig);
}
