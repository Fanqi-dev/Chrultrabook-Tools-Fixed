# Changelog

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
