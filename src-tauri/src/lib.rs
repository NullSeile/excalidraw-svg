use std::fs;

use tauri::{AppHandle, Manager};
use tauri_plugin_cli::CliExt;

struct State {
    svg_file: String,
}

#[tauri::command]
fn save_svg(app_handle: AppHandle, svg: &str) -> u64{
    let state = app_handle.state::<State>();
    fs::write(&state.svg_file, svg).unwrap(); // TODO: Return status 
    0
}

#[tauri::command]
fn get_initial_svg(app_handle: AppHandle) -> String {
    let state = app_handle.state::<State>();
    fs::read_to_string(&state.svg_file).unwrap_or_else(|_| "".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_cli::init())
        .invoke_handler(tauri::generate_handler![get_initial_svg, save_svg])
        .setup(|app| {
            let binding = app.cli().matches()?;
            let svg_file = binding
                .args
                .get("file")
                .ok_or("no argument")?
                .value
                .as_str()
                .unwrap();
            app.manage(State {
                svg_file: svg_file.to_string(),
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
