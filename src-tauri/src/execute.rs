//execute shell commands
use tauri_plugin_shell::ShellExt;
use std::sync::Mutex;
static EC_ACCESS: Mutex<()> = Mutex::new(());

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

    let output = shell.command(program).args(arguments).output().await;

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
