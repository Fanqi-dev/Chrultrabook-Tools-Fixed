# Windows sleep / fan handoff: 3.1.9 candidate

Status: Windows CI passed; manual device acceptance pending. The published stable release remains 3.1.8.

## Behavior

- On session display-off or system suspend, close the native manual fan-write gate before waiting for the EC lock, stop frontend polling, and return control using `ectool autofanctrl`.
- On interactive display-on/resume, restore the user's selected Auto, Custom, Max or Off mode. An automatic background wake while the display stays off does not restore manual fan control.
- A dimmed display remains active. Display-off while Windows is still awake temporarily uses firmware cooling too. Lid policy is not modified; closing the lid with an external display still active is not treated as sleep unless Windows actually suspends.
- Firmware keeps thermal control during sleep. The application does not force zero duty or guarantee instantaneous fan stop while hardware is hot.

## Automated checks

- 64 browser regressions passed locally and in Windows CI, including paused polling, Custom mode retention, Auto/Max/Off restoration, pending pre-sleep temperature rejection, startup screen-off, and startup notification/query ordering.
- All 28 native Rust tests passed in Windows CI. The five power-state tests cover S0 display transitions, background wakes, ordinary suspend/resume, notification ordering, and duplicate events, alongside the existing curve, sensor, brightness and settings tests.
- Windows MSVC release compilation, exe upload, and MSI/NSIS packaging passed in [build 38745855588](https://github.com/Fanqi-dev/Chrultrabook-Tools-Fixed/actions/runs/38745855588), source commit `8e73fd2a7d6d58707509c834b701ef45f7274f88`.
- Final device acceptance remains required before publishing 3.1.9 as stable.

Candidate executable SHA-256: `0c341aa9b394ce2e1db2e1cab10430ef0105e45b4491f31b08faec3e2bf59bbe`.

## Manual acceptance (user operated)

1. Run only the candidate executable, with `--trace-ec` for the acceptance session. Keep the stable executable available for rollback.
2. Select Auto. Close the lid for about two minutes, then reopen. Confirm fan behavior while closed and that Auto control resumes on reopening.
3. Repeat with the saved Custom curve. Check that its name, graph, highlight and fan behavior remain correct after reopening; repeat the close/open cycle several times.
4. Select Windows Sleep from the Start menu, then wake the device. Verify the selected mode returns.
5. If normally used on both battery and AC, repeat the lid test for each. Check brightness adjustment still works after wake.
6. Inspect the trace for successful `power handoff autofanctrl => Ok(())`, absence of manual fan writes during the screen-off interval, and fresh curve writes after wake. Cross-check Windows sleep events if the fan keeps running.

If handoff succeeds but the fan continues throughout a long cool standby, investigate EC firmware and actual S0 low-power entry with Windows SleepStudy; a sleep-entry event alone does not prove the hardware reached its deepest idle state.

## API references

- [PowerSettingRegisterNotification](https://learn.microsoft.com/en-us/windows/win32/api/powersetting/nf-powersetting-powersettingregisternotification)
- [PowerRegisterSuspendResumeNotification](https://learn.microsoft.com/en-us/windows/win32/api/powerbase/nf-powerbase-powerregistersuspendresumenotification)
- [GUID_SESSION_DISPLAY_STATUS](https://learn.microsoft.com/en-us/windows/win32/power/power-setting-guids)
- [Desktop application suspension during Modern Standby](https://learn.microsoft.com/en-us/windows-hardware/design/device-experiences/integrating-apps-with-modern-standby)
