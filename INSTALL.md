# Install Guide

## Standard User Install

```bash
cd ~/Source/local-webapp-wrapper
npm run install-user
```

The installer:

- Installs npm dependencies locally in the repo.
- Creates `~/.config/local-webapp-wrapper/config.json` if it does not already exist.
- Symlinks `~/.local/bin/local-webapp-wrapper` to this repo.
- Generates desktop files in `~/.local/share/applications`.
- Runs `update-desktop-database` when available.

## Configure Before Install

If you want to customize apps first:

```bash
mkdir -p ~/.config/local-webapp-wrapper
cp config.example.json ~/.config/local-webapp-wrapper/config.json
$EDITOR ~/.config/local-webapp-wrapper/config.json
npm run install-user
```

## Add A New App

1. Add a new entry under `apps` in `~/.config/local-webapp-wrapper/config.json`.
2. Include the app's start URL.
3. Add exact login/app domains to `internalHosts`.
4. Add only safe asset suffixes to `internalHostSuffixes`.
5. Run `npm run install-user` to regenerate desktop files.
6. Launch with `local-webapp-wrapper <app-id>`.

## Default Mail App

For Gmail-style mailto support, configure:

```json
"mimeTypes": ["x-scheme-handler/mailto"],
"mailtoBaseUrl": "https://mail.google.com/mail/?extsrc=mailto&url="
```

Then run:

```bash
xdg-mime default local-webapp-email.desktop x-scheme-handler/mailto
```

## Uninstall

```bash
rm -f ~/.local/bin/local-webapp-wrapper
rm -f ~/.local/share/applications/local-webapp-*.desktop
rm -rf ~/.config/local-webapp-wrapper
```

Remove any Hyprland/Waybar snippets you copied manually.
