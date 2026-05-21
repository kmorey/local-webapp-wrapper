# local-webapp-wrapper

Small configurable Electron webapp windows for Linux desktops.

It is useful when you want a clean app-like window for a website, but you also want links to external domains to open in your normal system browser via `xdg-open`.

## What It Does

- Opens each configured web app in a minimal Chromium/Electron window.
- Keeps in-scope app/auth domains inside the app window.
- Sends out-of-scope links to `xdg-open`, so they use the system default browser.
- Keeps apps running in the background when their window is closed.
- Adds a tray icon with Show/Quit actions.
- Updates the tray icon to the page favicon when available.
- Can register a web app as a `mailto:` handler.
- Can bridge page notifications so clicking a notification focuses the app window.

## Why Not Just Use Browser PWAs?

Chromium `--app=` windows are clean, but external links usually stay inside Chromium. Firefox-family browsers do not provide an exact equivalent to Chromium `--app=`. This wrapper gives explicit control over link routing while keeping a clean app window.

## Requirements

- Linux desktop with `xdg-open`
- Node.js and npm
- A tray/status notifier implementation if you want tray icons
- Optional: Hyprland/Omarchy for the example shortcuts/window rules

## Quick Start

### Packaged Install

Build a portable package:

```bash
git clone <repo-url> ~/Source/local-webapp-wrapper
cd ~/Source/local-webapp-wrapper
npm run package:linux
```

Install the package:

```bash
tar -xzf dist/local-webapp-wrapper-1.0.0-linux-x86_64.tar.gz
./local-webapp-wrapper/install.sh
```

This installs the app under:

```text
~/.local/opt/local-webapp-wrapper
```

After installation, the source checkout is no longer needed on that machine.

If `~/.local/bin/local-webapp-wrapper` is managed by stow, install with:

```bash
LOCAL_WEBAPP_SKIP_BIN_LINK=1 ./local-webapp-wrapper/install.sh
```

### Source Install

```bash
git clone <repo-url> ~/Source/local-webapp-wrapper
cd ~/Source/local-webapp-wrapper
npm run install-user
```

This creates:

```text
~/.config/local-webapp-wrapper/config.json
~/.local/bin/local-webapp-wrapper
~/.local/share/applications/*.desktop
```

Run an app:

```bash
local-webapp-wrapper gmail
local-webapp-wrapper basecamp
```

## Configure Apps

Edit:

```text
~/.config/local-webapp-wrapper/config.json
```

Each app is keyed by an app id:

```json
{
  "apps": {
    "gmail": {
      "title": "Email",
      "desktopName": "local-webapp-email.desktop",
      "windowClass": "local-webapp-email",
      "startUrl": "https://mail.google.com/mail/u/0/",
      "internalHosts": ["mail.google.com", "accounts.google.com"],
      "internalHostSuffixes": [".googleusercontent.com"],
      "externalUrlParams": ["q", "url", "u"]
    }
  }
}
```

Important fields:

- `title`: Display name for the window/tray.
- `startUrl`: URL loaded when the app opens.
- `internalHosts`: Exact hostnames that stay inside the app.
- `internalHostSuffixes`: Host suffixes that stay inside the app.
- `externalUrlParams`: Query params checked for nested external URLs, useful for redirect/tracking links.
- `windowClass`: Stable Wayland/X11 class for window rules.
- `desktopName`: Desktop entry file name.
- `mimeTypes`: MIME handlers for desktop registration, such as `x-scheme-handler/mailto`.
- `mailtoBaseUrl`: URL prefix used to convert `mailto:` links into a webmail compose URL.
- `patchPageNotifications`: Enables the notification click/focus bridge.
- `forwardNotificationClicks`: When `true`, notification clicks are forwarded back to the page after focusing the app. Use `false` for sites like Gmail if their click handler navigates to a broken URL.

## Register Email Handler

If your config includes:

```json
"mimeTypes": ["x-scheme-handler/mailto"]
```

Run:

```bash
npm run install-user
xdg-mime default local-webapp-email.desktop x-scheme-handler/mailto
```

Check it:

```bash
xdg-mime query default x-scheme-handler/mailto
```

## Omarchy/Hyprland

See:

```text
examples/omarchy/hyprland.conf
examples/omarchy/waybar.jsonc
```

After changing Hyprland config:

```bash
hyprctl reload
hyprctl configerrors
```

After changing Waybar config:

```bash
omarchy restart waybar
```

## Security Notes

This is intentionally pragmatic, not a hardened browser sandbox.

- `patchPageNotifications: true` disables Electron `contextIsolation` and `sandbox` for that web app so the preload can override `window.Notification` and make notification clicks focus the app.
- Only use `patchPageNotifications: true` for trusted websites.
- External links are opened with `xdg-open`.
- Node integration remains disabled in web pages.
- Treat each configured site like an installed desktop app.

If you do not need notification click/focus behavior, set:

```json
"patchPageNotifications": false
```

## Troubleshooting

Logs live under:

```text
~/.config/local-webapp-wrapper/<app-id>/local-webapp-wrapper.log
```

If external links do not route correctly, add or remove hosts in `internalHosts` / `internalHostSuffixes`.

If notification clicks do not focus the app, check whether the site uses service-worker notifications. Page-level notifications are supported by the bridge; service-worker notifications may bypass it.

## Development

```bash
npm install
npm run check
LOCAL_WEBAPP_CONFIG=./config.example.json npm start -- gmail
```
