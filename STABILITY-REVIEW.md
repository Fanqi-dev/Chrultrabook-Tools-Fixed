# 3.1.8 stability review — 2026-10-15

## Confirmed defects and changes

- Keyboard brightness: the real EC returns `Keyboard backlight disabled.` at 0%. This is a supported state, not missing hardware. Initialization now blocks premature input; writes are serialized and coalesce rapid input; readback confirms the result; failures restore the last confirmed value and allow retry. Refocusing the main window refreshes external brightness changes.
- Angular startup: explicitly retain Zone.js change detection for legacy screens; hardware controls use signals for asynchronous status updates.
- Fan editor: retain the earlier single main-window controller, apply acknowledgement, isolated draft curves, and viewport-based sizing. Opening Custom uses the latest saved zoom and focuses an existing window. A corrupt profile load falls back to the software Auto controller.
- Auto: software curve with minimum 40% duty, reaching 100% at 55°C. Custom curves retain their saved points; unavailable temperature uses full speed.
- Profile management: wait for saves, serialize mutations, preserve memory on failed writes, enforce unique names and retain at least one profile. Deleted selected profiles receive a remaining startup selection.
- Hardware execution: serialize EC access globally and execute device commands off the window thread. Check process exit status, return failures to controls, and stringify numeric command arguments.
- Settings: commit complete JSON through a same-directory temporary file and rename; preserve a previous complete `.bak`; update the in-memory cache only after successful persistence. Preserve malformed existing JSON and report it instead of overwriting it. Sensor discovery failure does not disable unrelated preferences; failed settings reads block writes.
- Settings controls: correct autostart disable behavior, rollback failed saves (including native checkbox/select values), use unique sensor IDs, retain a selected temperature sensor, and default missing/invalid zoom to 100%.
- Temperature parsing: parse only sensor temperatures, respect selections without indexing past the saved list, safely handle new/unavailable sensors and empty/all-false legacy selections.
- Windows: remove content-to-native-size feedback, clamp initial child dimensions to monitor bounds, update only the opened child's zoom, and remove recursive close callbacks. Manual second launch brings the main window forward; `--show` supports visible launch without editing preferences.
- Data collection: no overlapping samples, stop polling on component destruction, drop stale samples after Stop/Clear, retain the selected view, bound recent data to ten points and history to 3600 samples, and report read failures.
- Diagnostics: load on selection changes, ignore stale reports, and report tool/copy/save failures. Native file export no longer panics on write errors.
- Battery: validate percentages/current limits, send the selected mode correctly, and show command failures. Command syntax checked against Chromium EC's official source: https://chromium.googlesource.com/chromiumos/platform/ec/+/d2fb1a5bf0c502e6519aa0f0c5836b868337de85/util/ectool.cc
- Keyboard extras: route-driven selection, asynchronous RGB support detection, await RGB profile deletion without reloading, validate RGB colors, apply selected brightness, report errors, and preserve the first remap backup. Remap export awaits the save dialog, file write and driver reload, distinguishing cancellation from success.

## Validation and limits

- 58 browser regression tests cover the reported fan/resize/brightness failures plus failure paths, stale responses, persistence, and lifecycle cleanup.
- Frontend production compilation passes. Existing Sass deprecation notices and initial-bundle size warning remain; neither blocks compilation.
- Windows cloud gates run 17 standalone Rust tests: 7 fan interpolation, 7 sensor parsing, 3 atomic settings-write tests, before generating the executable.
- This machine has no RGB keyboard support (`INVALID_COMMAND`). RGB hardware behavior is not claimed as verified. Custom RGB cycles remain hidden preview functionality, without a persistent hardware-cycle controller.
- Battery charge/discharge changes, driver remapping and application reset are checked through mocked IPC and code review; this audit does not deliberately alter those hardware/system settings.
- Native brightness/window/fan acceptance results and deployment hashes belong in the local release manifest after the cloud build succeeds.
