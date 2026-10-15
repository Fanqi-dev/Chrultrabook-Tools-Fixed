# Fan-control fix pack (B1–B6)

## 2026-10-15: Software Auto and confirmed Custom Apply

Direct hardware isolation confirmed that EC `autofanctrl` stops both fans at
48°C on this machine. At the user's request, Auto now runs a software curve
with a 40% minimum duty, rising to 100% at 55°C. Off remains the explicit
zero-duty mode; Custom retains the user's saved curve.

The main window now derives its label and highlighted button from one signal
state. Bootstrap button toggling and direct DOM writes were removed. Fan writes
are serialized, superseded requests are discarded, and only main controls fans.
Late startup reads and resume callbacks cannot replace a newer chosen mode.
Polling and listeners are cleaned up when the component is destroyed.

Custom Apply uses structured data (including names with spaces), waits for main
to finish the hardware write, and receives a matching confirmation. EC command
failures reject the request instead of reporting success. Invalid temperature
uses full fan duty and reports the failed Apply.

Browser regression coverage includes the real editor/service/main event path,
Auto→Apply→Auto repetition, asynchronous startup and mode-switch races, and
failed writes. Hardware and installed-binary checks are recorded separately in
the local handoff document.

## 2026-10-15: Custom editor selection repair

The editor previously forced the first profile into the chart after 600 ms,
while each dropdown option independently restored its persisted `selected`
flag. A click on the dropdown loaded a curve even before a new choice was
committed. The chart also shared its mutable data array with saved profiles.

The dropdown and chart now use a single `selectedIndex`. Loading waits for
`FanService.ready`, opens the applied profile (or the first if none is applied),
and changes only when the select value changes, including keyboard selection.
Chart data is copied into a draft. Save preserves the applied selection;
The canvas is hidden until loading completes and curve animation is disabled,
so opening the editor never briefly displays or morphs from a default curve.
Save and Apply persists the draft and selection in one IPC request before
notifying the main window. Duplicate saves are ignored while one is pending.
The profile list and main-window boot path also await profile loading.

Validation: `npm run build` passed; `npm run test:fan` passed 11 browser
regression tests in Chrome Headless, using the real Angular select and Chart.js
canvas with mocked Tauri IPC. These checks do not verify an installed Windows
binary or real fan hardware. The cloud workflow runs these tests before building.

The primary repaired source is this directory. Existing release binaries must
be rebuilt before the UI repair is available in the installed application.

Based on upstream commit `cd253c3d5cee0b2b52abce8502af1f26913b636b`.
Does **not** add an always-on fan daemon; curve duty is still written by the existing 1s UI interval (plus a one-shot re-apply on wake).

## Fixes

| Bug | Change |
|---|---|
| **B1** | `src-tauri/capabilities/{windows,linux,macOS}.json` — register `Custom_Fans`, `Diagnostics`, `Battery` (and `Keyboard_extra` on linux/macOS) in the ACL `windows` list. |
| **B2** | `src-tauri/src/save_to_local.rs` — replace LevelDB/`web_local_storage_api` reads-writes with `%APPDATA%\chrultrabook-tools\settings.json` (Windows) / XDG or Application Support elsewhere. One-time migrate of known keys from the old LevelDB on first run. `local_storage` command signature unchanged. |
| **B3** | `fan-section.component.ts` + `set_custom_fan` — skip `fanduty` writes while `temp == 0`; seed a real `get_temps` before starting the interval. |
| **B4** | `src-tauri/src/custom_fan.rs` — linear interpolation, clamp 0–100, `temp >= 85 → 100`, 30°C slot is live (no more `temp == 85 → 0`). |
| **B5** | `.catch(console.error)` on fan-critical `invoke`s in `fan-section.component.ts` / `home.component.ts`. |
| **B6** | Rust thread detects sleep→wake via wall-clock jump (≥3s) and emits `system_resume`; fan-section re-applies the active custom curve immediately and again ~2s later. |

## Build — cloud-first（本机零安装）

> 之前"云端编不出 Windows exe"的结论**只对了一半**：Linux runner 确实编不出 MSVC 的 Windows
> exe（这也是上次失败的原因），但根本不需要 Linux —— GitHub Actions 提供**免费的 Windows
> 云主机**（`windows-latest`，预装 VS Build Tools），Rust/Node/依赖全部由 workflow 在云端自动
> 安装，构建、单测、产物上传都在云端完成，**本机只负责下载 exe**。
>
> 若"云 agent"指的是一台 Linux 云主机：它无法原生产出 MSVC exe，wine/mingw 交叉编译也不可靠，
> 不建议走。标准答案就是 GitHub Actions 的 Windows runner（public 仓库免费不限时长）。

### 方式一：GitHub Actions 云端构建（推荐）

工作流已附带在本包：`.github/workflows/build-windows.yml`
（windows-latest 原生编译 → 曲线数学单测门禁 → 上传产物）。

步骤：

1. 在 GitHub 新建仓库（public 免费不限时长；private 每月 2000 分钟也够跑几十次）。
2. 把本目录**全部内容**上传到仓库（务必包含隐藏的 `.github` 文件夹）：
   - 本机已装 git，最稳的方式：
     ```powershell
     cd Chrultrabook-Tools
     git init
     git add -A
     git commit -m "fan-fix B1-B6"
     git remote add origin https://github.com/<你的用户名>/<仓库名>.git
     git push -u origin master
     ```
   - 或网页上传（GitHub 网页上传不显示隐藏文件夹，需先在系统里开启"显示隐藏项目"再全选拖入）。
3. push 后 Actions 自动开跑；也可在 Actions 页签手动 Run workflow（`build-windows`）。
4. 约 10-20 分钟后，在该次 run 底部 **Artifacts** 下载：
   - `chrultrabook-tools-win-exe` —— 裸 exe（直接覆盖部署用这个）
   - `chrultrabook-tools-win-installers` —— NSIS/MSI 安装器（可选）
5. 部署：退出正在运行的 chrultrabook-tools → 用新 exe 覆盖
   `C:\Users\Administrator\WorkBuddy\tools\Chrultrabook-Tools\app\chrultrabook-tools.exe`
   → 按下文 "After installing on the Chromebook" 三步收尾。

### 方式二：本机构建（备用；需 ~2-4GB 工具链）

要求：Node 22+、Rust stable (MSVC)、VS Build Tools（C++ 工作负载 + Windows SDK）、WebView2。

```powershell
cd Chrultrabook-Tools
npm ci
npm run tauri build
# exe: src-tauri\target\release\chrultrabook-tools.exe
# 安装器: src-tauri\target\release\bundle\
```

前端独立检查（任意有 Node 的环境）：

```powershell
npm ci
npm run build
```

曲线数学 Rust 单测（云端 workflow 会自动跑，本地可选）：

```powershell
cd src-tauri
cargo test calculate_fan_percentage
```

## After installing on the Chromebook

1. Delete the transitional `FanCurveApply` scheduled task and `fan-apply-once.ps1` so they do not overwrite the in-app curve.
2. Re-enable "Start App On Boot" once in Settings (restores the Run key).
3. Confirm acceptance matrix in the handoff doc (§5.4), especially sleep→wake within 5s.

## Open risks

- **B6 on real hardware** is implemented but not measured on the Chromebook yet; confirm ≤5s recovery after S3/Modern Standby.
- LevelDB→JSON migration runs once when `settings.json` is missing; if the first launch races WebView2’s LevelDB lock, re-check settings or copy values from a LevelDB backup into `%APPDATA%\chrultrabook-tools\settings.json`.
