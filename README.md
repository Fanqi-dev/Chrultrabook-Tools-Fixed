# Chrultrabook Tools Fixed

**让风扇曲线、键盘背光和窗口行为更稳定的 Windows 修复版。**

[![Release](https://img.shields.io/github/v/release/Fanqi-dev/Chrultrabook-Tools-Fixed)](https://github.com/Fanqi-dev/Chrultrabook-Tools-Fixed/releases/latest)
[![Windows build](https://github.com/Fanqi-dev/Chrultrabook-Tools-Fixed/actions/workflows/build-windows.yml/badge.svg)](https://github.com/Fanqi-dev/Chrultrabook-Tools-Fixed/actions/workflows/build-windows.yml)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)

[下载 Windows 版](https://github.com/Fanqi-dev/Chrultrabook-Tools-Fixed/releases/latest) · [更新记录](CHANGELOG.md) · [问题反馈](https://github.com/Fanqi-dev/Chrultrabook-Tools-Fixed/issues) · [原项目](https://github.com/death7654/Chrultrabook-Tools)

本项目由 [Chrultrabook Tools](https://github.com/death7654/Chrultrabook-Tools) 的源码派生，由 **Fanqi-dev** 维护修复。重点解决 Custom 曲线选择冲突、Apply 后主页模式回退、二级窗口不断放大、键盘背光调节后变灰，以及合盖睡眠时风扇控制未释放的问题。

软件继续使用 `Chrultrabook Tools` 的应用标识和配置路径，便于已有用户升级。原作者为 **Robinson Arysseril / death7654**；本项目保留上游署名与 GPL-3.0 许可证。完整上游介绍见 [UPSTREAM-README](docs/UPSTREAM-README.md)。

> **English:** A community-maintained Windows stability edition of Chrultrabook Tools. It fixes Custom fan-curve selection and Apply synchronization, resize/reload loops, keyboard-backlight state handling, and hardware-control error reporting. This is an independent maintenance repository, not an official upstream release.

## 3.1.9 修复了什么

**3.1.9 新增合盖/睡眠修复**：熄屏或睡眠前暂停软件轮询并交回固件管理，亮屏唤醒后恢复原来的 Auto、Custom、Max 或 Off。用户已手动确认合盖、睡眠/唤醒、曲线恢复和唤醒后亮度调节正常。详细验证记录见 [SLEEP-VALIDATION](docs/SLEEP-VALIDATION.md)。以下同时包含 3.1.8 的稳定性修复。

| 原有现象 | 当前行为 |
| --- | --- |
| 合盖后风扇保持软件设置的转速 | 熄屏/睡眠前交回固件温控，亮屏唤醒后恢复所选模式，丢弃睡眠前的过期调速请求 |
| 下拉选项和图上的两条曲线来回跳 | 下拉与图表共用一个选择状态；编辑草稿与已保存曲线分开 |
| Custom 点击 Apply 后主页回到 Auto | 主窗口完成硬件写入并确认后才报告应用成功；名称与按钮状态同步 |
| Custom 页面持续变大 | 删除 resize → reload → setSize 循环，图表限制在窗口视口内 |
| 背光调到 30% 后变灰 | 正确识别支持背光的 0% 状态；写入和读回在同一个原生事务中完成 |
| 快速操作、保存失败后状态不一致 | 串行硬件操作，丢弃过期结果；失败时回退并允许重试 |
| 设置保存或窗口关闭存在异常 | 完整文件写入、上一版备份、错误反馈和无递归关闭 |

另外修复了采样页面关闭后继续轮询、诊断报告乱序覆盖、电池命令参数、开机启动开关和键盘映射备份等问题。详细技术记录见 [STABILITY-REVIEW.md](STABILITY-REVIEW.md)。

## 风扇模式

- **Auto：** 本修复版采用软件自动曲线，最低 **40% 占空比**，在 **55°C** 达到 100%。这是本维护版的行为选择；占空比不等于 RPM，也不代表所有设备都有相同的最低实际转速。
- **Off：** 显式设置 0% 占空比。
- **Max：** 设置 100% 占空比。
- **Custom：** 使用你保存的曲线；Apply 会等待主窗口确认。温度读数不可用时，软件尝试设置满速并报告错误。

软件 Auto 和 Custom 需要程序保持运行；关闭到托盘后仍会继续控制风扇。

Windows 熄屏或睡眠期间暂由固件管理风扇；固件根据温度决定是否停转。仅熄屏但系统仍运行时也采用此行为，亮屏后恢复软件模式。软件不会修改 Windows 的合盖操作设置。

## 下载与使用

1. 安装适用于设备的 [CoolStar Chrome EC 驱动](https://github.com/coolstar/driverinstallers/tree/master/crosec)，确保 `ectool` 可用。
2. 到 [Releases](https://github.com/Fanqi-dev/Chrultrabook-Tools-Fixed/releases/latest) 下载 Windows x64 便携包，或选择 MSI / NSIS 安装器。
3. 升级前退出旧程序；便携包解压后运行 `chrultrabook-tools.exe`。所需权限取决于 EC 驱动配置。
4. 先检查温度和转速，再按需选择 Auto 或 Custom。使用 `SHA256SUMS.txt` 可核对下载文件。

设置位于 `%APPDATA%\chrultrabook-tools\settings.json`。保存时会保留上一份完整配置为 `settings.json.bak`；已有可读取的旧配置会迁移。自己的曲线和设置建议另行备份。

## 验证范围

- **64 项浏览器回归测试通过**：覆盖曲线选择、Apply 确认、窗口尺寸、亮度调节、失败回退、异步竞态与睡眠恢复。
- **28 项 Rust 测试通过**：覆盖曲线插值、温度解析、配置写入、亮度响应解析与电源状态。
- Windows MSVC 云构建通过；一台 Windows Chromebook 上由用户手动复核了实际背光、Auto、Custom/Apply、窗口关闭重开，以及合盖/睡眠后的风扇和模式恢复。日志中观察到成功的固件接管命令及后续曲线调速恢复。
- 实测使用便携 exe；安装器已完成云构建，未单独验证安装流程。
- Linux / macOS 本次未做设备验收。测试设备不支持 RGB 键盘，RGB 硬件效果未验收；电池模式、键盘映射和重置未进行真实设备写入验收。
- 原先“变灰”已确认与 0% 状态误判有关。早期偶发读回异常无法唯一归因；当前原生写入/读回事务已通过手动复核与日志比对。

## 从源码构建

项目使用 Angular 22、Tauri 2 和 Rust。准备 [Tauri 系统依赖](https://v2.tauri.app/start/prerequisites/) 后：

```sh
git clone https://github.com/Fanqi-dev/Chrultrabook-Tools-Fixed.git
cd Chrultrabook-Tools-Fixed
npm ci
npm run test:fan
npm run build
npm run tauri build
```

Windows GitHub Actions 会先运行浏览器和 Rust 回归测试，再生成 exe 与安装器。本地不需要安装完整工具链即可从 Releases 获取构建好的版本。

## 反馈与贡献

请在 [Issues](https://github.com/Fanqi-dev/Chrultrabook-Tools-Fixed/issues) 说明设备型号、Windows / EC 驱动版本、操作步骤、预期与实际结果。提交日志前检查其中是否包含不想公开的信息。

已向原项目提交 [修复 PR #310](https://github.com/death7654/Chrultrabook-Tools/pull/310)，使用单独的上游 fork 保留原项目历史，便于原作者审阅。上游贡献分支继续使用 EC Auto；本仓库的软件 Auto 策略独立保留。

## 致谢与许可证

- 原项目：[death7654/Chrultrabook-Tools](https://github.com/death7654/Chrultrabook-Tools)
- 原作者：Robinson Arysseril / death7654
- 修复维护：Fanqi-dev
- 许可证：[GPL-3.0](LICENSE)
