# Agent Bootstrap Guide

Use this file when a coding agent is asked to install or configure `local-webapp-wrapper` on a user's machine.

## Goal

Set up clean local webapp windows where internal app URLs stay in the app and external links open in the system default browser.

## Discovery Phase

Ask or determine:

- Which websites should become local apps?
- What should each app be called?
- What URL should each app open first?
- Which hostnames must stay inside the app for login/auth/app use?
- Which hostnames should open externally?
- Should the app keep running in the tray after close?
- Should web notifications focus the app when clicked?
- Should web notification clicks also be forwarded back to the page, or only focus the window?
- Should any app register as a MIME/scheme handler, such as `mailto:`?
- Is the desktop environment Hyprland/Omarchy, GNOME, KDE, or something else?

Use browser/devtools/network knowledge when choosing `internalHosts`. Be conservative: broad suffixes like `.google.com` can accidentally keep external search/docs/calendar links inside Gmail.

## Implementation Steps

1. Install dependencies:

```bash
npm run install-user
```

2. Edit config:

```text
~/.config/local-webapp-wrapper/config.json
```

3. Regenerate desktop entries:

```bash
npm run install-user
```

4. Register MIME handlers only when requested:

```bash
xdg-mime default <desktop-file> <mime-type>
```

5. Add desktop-environment shortcuts as examples or user config, not hard-coded in this repo.

6. Validate:

```bash
npm run check
desktop-file-validate ~/.local/share/applications/local-webapp-*.desktop
```

For Hyprland/Omarchy config edits:

```bash
hyprctl reload
hyprctl configerrors
```

For Waybar config edits:

```bash
omarchy restart waybar
```

## Config Template

```json
{
  "apps": {
    "example": {
      "title": "Example",
      "desktopName": "local-webapp-example.desktop",
      "windowClass": "local-webapp-example",
      "startUrl": "https://app.example.com/",
      "internalHosts": ["app.example.com", "auth.example.com"],
      "internalHostSuffixes": [".examplecdn.com"],
      "externalUrlParams": ["url", "u"],
      "notifications": true,
      "patchPageNotifications": true,
      "forwardNotificationClicks": true,
      "theme": "dark"
    }
  }
}
```

## Safety Rules

- Do not enable broad internal suffixes unless there is a concrete need.
- Do not register global MIME handlers without user confirmation.
- Warn users that `patchPageNotifications: true` disables Electron sandbox/context isolation for that app.
- Keep Node integration disabled.
- Prefer small config changes over code changes for new apps.
