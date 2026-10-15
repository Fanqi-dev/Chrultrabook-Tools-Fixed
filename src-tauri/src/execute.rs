//execute shell commands
use tauri_plugin_shell::ShellExt;
use std::sync::Mutex;
use std::io::Write;
use std::sync::atomic::{AtomicBool, Ordering};
static EC_ACCESS: Mutex<()> = Mutex::new(());
static FAN_POWER_ACTIVE: AtomicBool = AtomicBool::new(true);

pub fn fan_power_active() -> bool { FAN_POWER_ACTIVE.load(Ordering::SeqCst) }

#[cfg(windows)]
pub fn set_fan_power_active(app: &tauri::AppHandle, active: bool) -> Result<(), String> {
    use std::os::windows::process::CommandExt;
    use std::process::{Command, Stdio};
    use std::time::{Duration, Instant};
    use tauri::Emitter;

    // Close the gate before waiting for the EC lock. Any queued manual write
    // checks it while holding the same lock and cannot override this handoff.
    FAN_POWER_ACTIVE.store(active, Ordering::SeqCst);
    let _ = app.emit("system_power", active);
    if active { return Ok(()); }

    let deadline = Instant::now() + Duration::from_millis(1800);
    let _guard = loop {
        match EC_ACCESS.try_lock() {
            Ok(guard) => break guard,
            Err(std::sync::TryLockError::Poisoned(_)) => return Err("EC access lock failed".into()),
            Err(std::sync::TryLockError::WouldBlock) if Instant::now() < deadline => {
                std::thread::sleep(Duration::from_millis(5));
            }
            Err(_) => return Err("EC busy during sleep handoff".into()),
        }
    };
    // Bound the sleep callback. Never set duty to zero: firmware retains thermal
    // protection and decides when the fan can stop safely.
    let mut child = Command::new(ECTOOL).arg("autofanctrl")
        .creation_flags(0x08000000).stdin(Stdio::null())
        .stdout(Stdio::null()).stderr(Stdio::null())
        .spawn().map_err(|error| error.to_string())?;
    let result = loop {
        match child.try_wait() {
            Ok(Some(status)) => break if status.success() { Ok(()) }
                else { Err(format!("Firmware fan handoff failed: {status}")) },
            Ok(None) if Instant::now() < deadline => std::thread::sleep(Duration::from_millis(5)),
            other => {
                let _ = child.kill();
                let _ = child.wait();
                break Err(format!("Firmware fan handoff timed out or failed: {other:?}"));
            }
        }
    };
    if std::env::args().any(|arg| arg == "--trace-ec") {
        if let Ok(path) = std::env::var("APPDATA") {
            if let Ok(mut file) = std::fs::OpenOptions::new().create(true).append(true)
                .open(std::path::Path::new(&path).join("chrultrabook-tools/ec-trace.log")) {
                let _ = writeln!(file, "{:?} power handoff autofanctrl => {:?}", std::time::SystemTime::now(), result);
            }
        }
    }
    result
}

//location of ectool excuteable
#[cfg(target_os = "linux")]
const ECTOOL: &str = "ectool";
#[cfg(windows)]
const ECTOOL: &str = "C:\\Program Files\\crosec\\ectool";
#[cfg(target_os = "macos")]
const ECTOOL: &str = "/usr/local/bin/ectool";

//location of cbmem excuteable
#[cfg(target_os = "linux")]
const CBMEM: &str = "cbmem";
#[cfg(windows)]
const CBMEM: &str = "C:\\Program Files\\crosec\\cbmem";
#[cfg(target_os = "macos")]
const CBMEM: &str = "echo";

//executeable to get system information
#[cfg(any(target_os = "linux", target_os = "macos"))]
const GETSYSINFO: &str = "cat";
#[cfg(windows)]
const GETSYSINFO: &str = "echo";

// croskbreload
const KEYBOARD: &str = "C:\\Program Files\\crosec\\croskbreload";

pub async fn execute(
    app: &tauri::AppHandle,
    program: &str,
    arguments: Vec<String>,
    reply: bool,
) -> Result<String, String> {
    let shell = app.shell();

    let output = shell.command(program).args(&arguments).output().await;
    if std::env::args().any(|argument| argument == "--trace-ec") {
        let path = std::env::var("APPDATA").unwrap_or_else(|_| ".".into());
        if let Ok(mut file) = std::fs::OpenOptions::new().create(true).append(true)
            .open(std::path::Path::new(&path).join("chrultrabook-tools/ec-trace.log")) {
            let readable = output.as_ref().map(|out| (
                out.status.success(), String::from_utf8_lossy(&out.stdout).to_string(),
                String::from_utf8_lossy(&out.stderr).to_string()));
            let _ = writeln!(file, "{:?} {:?} => {:?}", std::time::SystemTime::now(), arguments, readable);
        }
    }

    match output {
            Ok(out) => {
                if out.status.success() {
                    if !reply { return Ok(String::new()); }
                    return String::from_utf8(out.stdout).map_err(|error| error.to_string());
                } else {
                    let stderr = String::from_utf8_lossy(&out.stderr);
                    let stdout = String::from_utf8_lossy(&out.stdout);
                    return Err(format!("Command failed: {} {}", stderr.trim(), stdout.trim()));
                }
            }
            Err(e) => {
                return Err(format!("Shell command error: {}", e));
            }
        }
}

pub fn execute_relay(
    handle: tauri::AppHandle,
    wanted_program: &str,
    arguments: Vec<String>,
    reply: bool,
) -> String {
    execute_relay_checked(handle, wanted_program, arguments, reply).unwrap_or_else(|e| e)
}

pub fn execute_relay_checked(
    handle: tauri::AppHandle,
    wanted_program: &str,
    arguments: Vec<String>,
    reply: bool,
) -> Result<String, String> {
    let _ec_guard = if wanted_program == "ectool" {
        Some(EC_ACCESS.lock().map_err(|_| "EC access lock failed".to_string())?)
    } else { None };
    if wanted_program == "ectool" && arguments.first().is_some_and(|arg|
        ["fanduty", "fanset", "pwmsetfanrpm"].contains(&arg.as_str())) && !fan_power_active() {
        return Err("Software fan control is paused while the system display is off or suspended".into());
    }
    let program = match wanted_program {
        "ectool" => ECTOOL,
        "cbmem" => CBMEM,
        "cat" => GETSYSINFO,
        "keyboard" => KEYBOARD,
        _ => return Err("Unknown device tool".into()),
    };
    let output =
        tauri::async_runtime::block_on(async { execute(&handle, program, arguments, reply).await });

    output
}

/// Keep write and verification together: fan polling cannot enter the EC in
/// the middle of a keyboard-backlight update.
pub fn set_brightness(handle: tauri::AppHandle, percentage: u8) -> Result<u8, String> {
    if percentage > 100 { return Err("Invalid keyboard brightness".into()); }
    let _guard = EC_ACCESS.lock().map_err(|_| "EC access lock failed".to_string())?;
    tauri::async_runtime::block_on(async {
        for _ in 0..3 {
            execute(&handle, ECTOOL, vec!["pwmsetkblight".into(), percentage.to_string()], true).await?;
            let response = execute(&handle, ECTOOL, vec!["pwmgetkblight".into()], true).await?;
            let actual = crate::keyboard_light::parse_brightness(&response)?;
            if actual == percentage { return Ok(actual); }
            std::thread::sleep(std::time::Duration::from_millis(40));
        }
        Err("Keyboard brightness readback did not match the requested value".into())
    })
}
