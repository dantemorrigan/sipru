/* Writed. desktop/mobile shell.
   No custom commands: the app is the same static build served on the web,
   loaded from disk instead of over HTTP. localStorage, WritedStore and all
   app logic are untouched — the webview provides localStorage natively.
   The dialog + fs plugins back the native "save file" flow used by export
   (screens-export.jsx downloadBlob) on Android and desktop alike. */
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .run(tauri::generate_context!())
    .expect("error while running Writed.");
}
