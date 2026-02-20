use std::fs;

use tauri::{AppHandle, Emitter, Manager};
use tauri::{Window, WindowEvent};
use tauri_plugin_cli::CliExt;

struct State {
    svg_file: String,
}

#[tauri::command]
fn save_svg(app_handle: AppHandle, svg: &str) -> u64 {
    let state = app_handle.state::<State>();
    let res = fs::write(&state.svg_file, svg);
    if let Err(e) = res {
        eprintln!("Failed to save SVG: {}", e);
        return 1;
    }
    println!("Saved SVG to {}", &state.svg_file);
    0
}

#[tauri::command]
fn get_initial_svg(app_handle: AppHandle) -> String {
    let state = app_handle.state::<State>();
    fs::read_to_string(&state.svg_file).unwrap_or_else(|_| "".to_string())
}

#[tauri::command]
fn close_app(app_handle: AppHandle) {
    app_handle.exit(0);
}

fn on_window_event(window: &Window, event: &WindowEvent) {
    match event {
        WindowEvent::CloseRequested { api, .. } => {
            api.prevent_close();
            window
                .app_handle()
                .emit("window-close-requested", {})
                .unwrap();
        }
        _ => {}
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_cli::init())
        .invoke_handler(tauri::generate_handler![
            get_initial_svg,
            save_svg,
            close_app
        ])
        .on_window_event(on_window_event)
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
