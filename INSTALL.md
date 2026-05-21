# Install Guide

## Packaged User Install

Build a portable Linux package on a machine with Node.js/npm:

```bash
cd ~/Source/local-webapp-wrapper
npm run package:linux
```

This writes a tarball like:

```text
dist/local-webapp-wrapper-1.0.0-linux-x86_64.tar.gz
```

Install that tarball on a target machine:

```bash
tar -xzf local-webapp-wrapper-1.0.0-linux-x86_64.tar.gz
./local-webapp-wrapper/install.sh
```

The packaged installer:

- Installs the Electron app to `~/.local/opt/local-webapp-wrapper`.
- Creates `~/.config/local-webapp-wrapper/config.json` if missing.
- Links `~/.local/bin/local-webapp-wrapper` to the packaged executable.
- Generates desktop files in `~/.local/share/applications`.
- Does not require the app source checkout after installation.

If your dotfiles own `~/.local/bin/local-webapp-wrapper` through stow, skip the installer-created bin link:

```bash
tar -xzf local-webapp-wrapper-1.0.0-linux-x86_64.tar.gz
LOCAL_WEBAPP_SKIP_BIN_LINK=1 ./local-webapp-wrapper/install.sh
cd ~/dotfiles
stow -R scripts
```

The stowed launcher will detect and run `~/.local/opt/local-webapp-wrapper/local-webapp-wrapper`.

If you already have the source checkout on the target machine, this equivalent helper installs the latest package from `dist/`:

```bash
npm run install-package -- dist/local-webapp-wrapper-1.0.0-linux-x86_64.tar.gz
```

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
