# Changelog

## 3.1.9 — 2026-10-15

- Return fan control to the EC firmware when the Windows session display turns off or the system suspends. This includes S0 Modern Standby, which cannot rely on ordinary S3 suspend events alone.
- Block queued manual fan writes during the handoff and pause temperature/RPM polling while inactive.
- Restore the selected Auto, Custom, Max or Off mode on interactive wake; background wakes with the display off keep firmware in control.
- Discard temperature results sampled before sleep and handle initial screen-off state at application startup.
- Limit the firmware handoff callback to a bounded EC operation; report command failure instead of claiming successful release.

The handoff uses `ectool autofanctrl`; the firmware decides whether cooling is still needed. This does not change the Windows lid action or force the fan to zero. Turning the screen off while Windows remains awake also temporarily uses firmware fan control.

Validation: 64 browser regressions and 28 native Rust tests passed in Windows CI; Windows MSVC compilation and MSI/NSIS packaging passed in [build 38745855588](https://github.com/Fanqi-dev/Chrultrabook-Tools-Fixed/actions/runs/38745855588). The user reported successful manual Auto/Custom lid-close, sleep/wake, mode restoration and post-wake brightness checks on one Windows Chromebook, and authorized replacement. The installed executable matches the tested candidate digest. Installers were built but their installation flows were not separately exercised. See [SLEEP-VALIDATION](docs/SLEEP-VALIDATION.md) for the exact binary source and verification scope; subsequent release commits update documentation only.

## 3.1.8 — 2026-10-15

Windows stability release, based on Chrultrabook Tools 3.1.7.

- Fix competing fan-profile selection and isolate chart drafts from saved curves.
- Confirm Custom Apply after the main window finishes the EC write; keep the displayed mode synchronized.
- Remove the resize/reload/native-size feedback loop in secondary windows.
- Treat disabled keyboard backlight as supported 0%; serialize and verify brightness updates in one EC transaction.
- Preserve complete settings on failed writes, keep a previous-file backup, and report errors.
- Fix autostart disabling, sensor selection, default zoom, window focus/reuse and recursive closing.
- Stop background sampling on component destruction, reject stale reports, and bound history.
- Validate battery command arguments, preserve the first keyboard mapping backup, and report peripheral failures.
- Use a software Auto fan curve with minimum 40% duty and full duty at 55°C in this maintenance edition.

Validation: 58 browser regressions and 23 Rust tests passed in Windows CI. The portable executable was manually checked by the user on a Windows Chromebook for brightness, Auto, Custom/Apply and window behavior. Installers were built in CI; their installation flow was not separately exercised. Linux, macOS and unsupported RGB hardware were not validated in this release.

The published executable was built from commit `14f923ffdc1c97b5ef412417373146d559b2bc0b` by [Windows build 38738161535](https://github.com/Fanqi-dev/Chrultrabook-Tools-Fixed/actions/runs/38738161535). Subsequent publication changes update documentation only.

SHA-256 of `chrultrabook-tools.exe`:

```text
6d32183b4c77f1eb84bb758f4a8d95edfdb5bac8ea59ab843094cd3fabf22550
```

Earlier development notes are preserved in [CHANGES.md](CHANGES.md).
