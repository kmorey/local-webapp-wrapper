const { app, BrowserWindow, Menu, Tray, Notification, ipcMain, nativeImage, nativeTheme, net, session } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const appRoot = path.resolve(__dirname, "..");
const appId = process.argv[2];
const launchUrl = process.argv[3];

const configPaths = [
  process.env.LOCAL_WEBAPP_CONFIG,
  path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), "local-webapp-wrapper", "config.json"),
  path.join(appRoot, "config.example.json")
].filter(Boolean);

const readConfig = () => {
  for (const file of configPaths) {
    if (!fs.existsSync(file)) {
      continue;
    }

    return JSON.parse(fs.readFileSync(file, "utf8"));
  }

  throw new Error(`No config found. Tried: ${configPaths.join(", ")}`);
};

const allConfig = readConfig();
const apps = allConfig.apps || {};
const config = apps[appId];

if (!config) {
  console.error(`Usage: local-webapp-wrapper ${Object.keys(apps).join("|")}`);
  process.exit(64);
}

const title = config.title || appId;
const windowClass = config.windowClass || `local-webapp-${appId}`;
const desktopName = config.desktopName || `${windowClass}.desktop`;
const patchPageNotifications = config.patchPageNotifications !== false;

app.setName(title);
app.setDesktopName(desktopName);
app.commandLine.appendSwitch("class", windowClass);
nativeTheme.themeSource = config.theme || "system";
app.setPath(
  "userData",
  path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), "local-webapp-wrapper", appId)
);

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
}

let mainWindow = null;
let tray = null;
let isQuitting = false;

const logFile = path.join(app.getPath("userData"), "local-webapp-wrapper.log");

const log = (message) => {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.appendFileSync(logFile, `${new Date().toISOString()} ${message}\n`);
};

const showWindow = () => {
  log("showWindow requested");

  if (!mainWindow) {
    createWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.moveTop();
  mainWindow.focus();

  // Some Wayland compositors are conservative about raising windows from
  // notification callbacks. Briefly toggling always-on-top makes the focus
  // request visible without leaving the window pinned.
  mainWindow.setAlwaysOnTop(true);
  setTimeout(() => {
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(false);
    }
  }, 250);
};

const resolveLaunchUrl = (url) => {
  if (url && config.mailtoBaseUrl && url.startsWith("mailto:")) {
    return `${config.mailtoBaseUrl}${encodeURIComponent(url)}`;
  }

  return url || config.startUrl;
};

const handleLaunchUrl = (url) => {
  const targetUrl = resolveLaunchUrl(url);

  if (mainWindow && targetUrl) {
    mainWindow.loadURL(targetUrl);
  }

  showWindow();
};

const createFallbackIcon = () => nativeImage.createFromDataURL(
  "data:image/svg+xml;utf8," +
    encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="4" fill="#222"/><text x="8" y="11" text-anchor="middle" font-family="sans-serif" font-size="9" font-weight="700" fill="#fff">${title[0]}</text></svg>`)
);

const createTray = () => {
  if (tray || config.tray === false) {
    return;
  }

  tray = new Tray(createFallbackIcon());
  tray.setToolTip(title);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: `Show ${title}`, click: showWindow },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]));
  tray.on("click", showWindow);
};

const setTrayIconFromUrl = async (url) => {
  if (!tray) {
    return;
  }

  try {
    let image;

    if (url.startsWith("data:")) {
      image = nativeImage.createFromDataURL(url);
    } else {
      const response = await net.fetch(url);

      if (!response.ok) {
        return;
      }

      const bytes = await response.arrayBuffer();
      image = nativeImage.createFromBuffer(Buffer.from(bytes));
    }

    if (!image.isEmpty()) {
      tray.setImage(image.resize({ width: 16, height: 16 }));
    }
  } catch {
    // Keep the generated fallback icon if the favicon cannot be fetched.
  }
};

const openExternal = (url) => {
  const child = spawn("xdg-open", [url], {
    detached: true,
    stdio: "ignore"
  });

  child.unref();
};

const parseUrl = (url) => {
  try {
    return new URL(url);
  } catch {
    return null;
  }
};

const hostMatches = (host) => {
  const normalizedHost = host.toLowerCase();
  const internalHosts = config.internalHosts || [];
  const internalHostSuffixes = config.internalHostSuffixes || [];

  if (internalHosts.includes(normalizedHost)) {
    return true;
  }

  return internalHostSuffixes.some((suffix) => normalizedHost.endsWith(suffix));
};

const findExternalRedirect = (parsedUrl) => {
  for (const param of config.externalUrlParams || []) {
    const value = parsedUrl.searchParams.get(param);
    const nested = value && parseUrl(value);

    if (nested && ["http:", "https:"].includes(nested.protocol) && !hostMatches(nested.hostname)) {
      return nested.toString();
    }
  }

  return null;
};

const classifyUrl = (url) => {
  const parsed = parseUrl(url);

  if (!parsed) {
    return { action: "external", url };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { action: "external", url };
  }

  const externalRedirect = findExternalRedirect(parsed);

  if (externalRedirect) {
    return { action: "external", url: externalRedirect };
  }

  return hostMatches(parsed.hostname)
    ? { action: "internal", url }
    : { action: "external", url };
};

const createWindow = async () => {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    title,
    width: config.window?.width || 1280,
    height: config.window?.height || 900,
    autoHideMenuBar: true,
    backgroundColor: config.backgroundColor || "#111111",
    webPreferences: {
      contextIsolation: !patchPageNotifications,
      nodeIntegration: false,
      preload: patchPageNotifications ? path.join(__dirname, "preload.js") : undefined,
      sandbox: !patchPageNotifications
    }
  });

  mainWindow.on("close", (event) => {
    if (isQuitting || config.keepRunningOnClose === false) {
      return;
    }

    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const result = classifyUrl(url);

    if (result.action === "internal") {
      mainWindow.loadURL(result.url);
    } else {
      openExternal(result.url);
    }

    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    const current = mainWindow.webContents.getURL();
    const result = classifyUrl(url);

    if (result.action === "external") {
      event.preventDefault();
      openExternal(result.url);
      return;
    }

    if (url !== current && result.url !== url) {
      event.preventDefault();
      mainWindow.loadURL(result.url);
    }
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedUrl, isMainFrame) => {
    if (isMainFrame && errorCode !== -3) {
      console.error(`Failed to load ${validatedUrl}: ${errorDescription} (${errorCode})`);
    }
  });

  mainWindow.webContents.on("page-favicon-updated", (_event, favicons) => {
    if (favicons[0]) {
      setTrayIconFromUrl(favicons[0]);
    }
  });

  await mainWindow.loadURL(resolveLaunchUrl(launchUrl));
};

app.on("second-instance", (_event, argv) => {
  handleLaunchUrl(argv[3]);
});

ipcMain.on("web-notification", (event, payload) => {
  log(`notification received: ${JSON.stringify(payload)}`);

  if (!Notification.isSupported() || config.notifications === false) {
    log("notification skipped: unsupported or disabled");
    return;
  }

  const notification = new Notification({
    title: payload.title || title,
    body: payload.body || "",
    silent: Boolean(payload.silent)
  });

  notification.on("click", () => {
    log(`notification clicked: ${payload.id}`);
    showWindow();

    if (config.forwardNotificationClicks !== false) {
      event.sender.send("web-notification-click", payload.id);
    }
  });

  notification.show();
});

ipcMain.on("preload-ready", () => {
  log("preload ready: Notification override installed");
});

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === "notifications" && config.notifications !== false);
  });

  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    return permission === "notifications" && config.notifications !== false;
  });

  createTray();
  createWindow();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && isQuitting) {
    app.quit();
  }
});

app.on("web-contents-created", (_event, contents) => {
  contents.on("will-attach-webview", (event) => {
    event.preventDefault();
  });
});
