use serde_json::{Map, Value};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

/// Known keys previously stored in WebView2 LevelDB via web_local_storage_api.
const MIGRATE_KEYS: &[&str] = &[
    "fan_boot",
    "app_boot",
    "app_tray",
    "start_app_tray",
    "profiles",
    "sensor_selection",
    "zoom",
    "rgbprofiles",
    "rgb",
    "keyboard_backup",
];

static SETTINGS: Mutex<Option<Map<String, Value>>> = Mutex::new(None);

fn settings_path() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let appdata = std::env::var("APPDATA").unwrap_or_else(|_| ".".into());
        return PathBuf::from(appdata)
            .join("chrultrabook-tools")
            .join("settings.json");
    }
    #[cfg(target_os = "linux")]
    {
        let base = std::env::var("XDG_CONFIG_HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|_| {
                let home = std::env::var("HOME").unwrap_or_else(|_| ".".into());
                PathBuf::from(home).join(".config")
            });
        return base.join("chrultrabook-tools").join("settings.json");
    }
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".into());
        return PathBuf::from(home)
            .join("Library")
            .join("Application Support")
            .join("chrultrabook-tools")
            .join("settings.json");
    }
    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    {
        PathBuf::from("chrultrabook-tools-settings.json")
    }
}

fn migrate_from_leveldb() -> Map<String, Value> {
    let mut map = Map::new();
    for key in MIGRATE_KEYS {
        if let Ok(Some(val)) = web_local_storage_api::get_item(key) {
            if !val.is_empty() {
                map.insert((*key).to_string(), Value::String(val));
            }
        }
    }
    map
}

fn load_settings() -> Map<String, Value> {
    let path = settings_path();
    if path.exists() {
        match fs::read_to_string(&path) {
            Ok(text) => match serde_json::from_str::<Value>(&text) {
                Ok(Value::Object(map)) => return map,
                _ => {}
            },
            Err(_) => {}
        }
    }

    // First run (or corrupt file): one-time migrate from old LevelDB storage.
    let migrated = migrate_from_leveldb();
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let _ = fs::write(
        &path,
        serde_json::to_string_pretty(&Value::Object(migrated.clone()))
            .unwrap_or_else(|_| "{}".into()),
    );
    migrated
}

fn with_settings<F, R>(f: F) -> R
where
    F: FnOnce(&mut Map<String, Value>) -> R,
{
    let mut guard = SETTINGS.lock().unwrap_or_else(|e| e.into_inner());
    if guard.is_none() {
        *guard = Some(load_settings());
    }
    f(guard.as_mut().unwrap())
}

fn persist(map: &Map<String, Value>) {
    let path = settings_path();
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(text) = serde_json::to_string_pretty(&Value::Object(map.clone())) {
        let _ = fs::write(path, text);
    }
}

fn value_to_string(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        Value::Null => String::new(),
        other => other.to_string(),
    }
}

/// Drop-in replacement for the old LevelDB-backed local_storage.
/// Signature unchanged: function is "get" | "save" | "remove" | "clear".
pub fn local_storage(function: &str, option: &str, value: &str) -> String {
    match function {
        "get" => with_settings(|map| {
            map.get(option)
                .map(value_to_string)
                .unwrap_or_default()
        }),
        "save" => with_settings(|map| {
            map.insert(option.to_string(), Value::String(value.to_string()));
            persist(map);
            String::new()
        }),
        "remove" => with_settings(|map| {
            map.remove(option);
            persist(map);
            String::new()
        }),
        "clear" => with_settings(|map| {
            map.clear();
            persist(map);
            String::new()
        }),
        _ => String::new(),
    }
}
