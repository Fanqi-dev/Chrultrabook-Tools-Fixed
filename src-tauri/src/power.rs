//! Windows power callbacks run independently of the WebView, which is paused in S0.
use crate::fan_power::{FanPowerState, PowerEvent};
use std::ffi::c_void;
use std::sync::{Mutex, OnceLock};
use tauri::{AppHandle, Emitter};
use windows_sys::core::GUID;
use windows_sys::Win32::System::Power::{
    PowerRegisterSuspendResumeNotification, PowerSettingRegisterNotification,
    PowerSettingUnregisterNotification, PowerUnregisterSuspendResumeNotification,
    DEVICE_NOTIFY_SUBSCRIBE_PARAMETERS, POWERBROADCAST_SETTING,
};
use windows_sys::Win32::UI::WindowsAndMessaging::{
    DEVICE_NOTIFY_CALLBACK, PBT_APMRESUMEAUTOMATIC, PBT_APMRESUMESUSPEND,
    PBT_APMSUSPEND, PBT_POWERSETTINGCHANGE,
};

// Microsoft recommends the session display GUID for interactive desktop apps.
const SESSION_DISPLAY: GUID = GUID::from_u128(0x2b84c20e_ad23_4ddf_93db_05ffbd7efca5);
static APP: OnceLock<AppHandle> = OnceLock::new();
static STATE: Mutex<FanPowerState> = Mutex::new(FanPowerState::new());

fn is_session_display(guid: &GUID) -> bool {
    guid.data1 == SESSION_DISPLAY.data1 && guid.data2 == SESSION_DISPLAY.data2
        && guid.data3 == SESSION_DISPLAY.data3 && guid.data4 == SESSION_DISPLAY.data4
}

pub struct PowerNotifications {
    display: usize,
    suspend: usize,
}

impl Drop for PowerNotifications {
    fn drop(&mut self) {
        // These are opaque registration tokens, never dereferenced by Rust.
        unsafe {
            PowerSettingUnregisterNotification(self.display as _);
            PowerUnregisterSuspendResumeNotification(self.suspend as _);
        }
    }
}

pub fn install(app: &AppHandle) -> Result<PowerNotifications, String> {
    APP.set(app.clone()).map_err(|_| "Power notifications already installed")?;
    // The OS may call back during registration. Keep the immutable subscription
    // and APP alive until process exit, including any in-flight callbacks.
    let recipient = Box::leak(Box::new(DEVICE_NOTIFY_SUBSCRIBE_PARAMETERS {
        Callback: Some(callback), Context: std::ptr::null_mut(),
    })) as *mut DEVICE_NOTIFY_SUBSCRIBE_PARAMETERS as *mut c_void;
    let mut display = std::ptr::null_mut();
    let mut suspend = std::ptr::null_mut();
    unsafe {
        let result = PowerSettingRegisterNotification(
            &SESSION_DISPLAY, DEVICE_NOTIFY_CALLBACK, recipient, &mut display,
        );
        if result != 0 { return Err(format!("Display power notification registration failed: {result}")); }
        let result = PowerRegisterSuspendResumeNotification(DEVICE_NOTIFY_CALLBACK, recipient, &mut suspend);
        if result != 0 {
            PowerSettingUnregisterNotification(display as _);
            return Err(format!("Suspend notification registration failed: {result}"));
        }
    }
    Ok(PowerNotifications { display: display as usize, suspend: suspend as usize })
}

unsafe extern "system" fn callback(_context: *const c_void, kind: u32, setting: *const c_void) -> u32 {
    let event = match kind {
        PBT_APMSUSPEND => Some(PowerEvent::Suspend),
        PBT_APMRESUMEAUTOMATIC | PBT_APMRESUMESUSPEND => Some(PowerEvent::Resume),
        PBT_POWERSETTINGCHANGE if !setting.is_null() => {
            let data = &*(setting as *const POWERBROADCAST_SETTING);
            if is_session_display(&data.PowerSetting) && data.DataLength == 4 {
                let value = std::ptr::read_unaligned(data.Data.as_ptr().cast::<u32>());
                match value {
                    0 => Some(PowerEvent::Display(false)),
                    1 | 2 => Some(PowerEvent::Display(true)), // Dimming is still awake.
                    _ => None,
                }
            } else { None }
        }
        _ => None,
    };
    if let (Some(event), Some(app), Ok(mut state)) = (event, APP.get(), STATE.lock()) {
        // Serialize callbacks through the EC handoff so rapid close/open events
        // cannot deliver a late firmware release after restoring software control.
        if let Some(active) = state.update(event) {
            if let Err(error) = crate::execute::set_fan_power_active(app, active) {
                eprintln!("Fan power handoff: {error}");
                let _ = app.emit("fan_power_error", error);
            }
        }
    }
    0
}
