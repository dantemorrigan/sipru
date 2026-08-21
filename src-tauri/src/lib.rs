/* Writed. desktop/mobile shell.
   No custom commands: the app is the same static build served on the web,
   loaded from disk instead of over HTTP. localStorage, WritedStore and all
   app logic are untouched — the webview provides localStorage natively.
   The dialog + fs plugins back the native "save file" flow used by export
   (screens-export.jsx downloadBlob) and the vault (vault.js) on Android and
   desktop alike. */
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    /* Picking the vault folder grants filesystem access to it at runtime,
       and that grant lives only in memory — so without this the vault would
       write fine until the app is closed, then fail on every launch after,
       with the folder still remembered but no longer writable. This saves
       the granted scopes and restores them at startup. */
    .plugin(tauri_plugin_persisted_scope::init())
    .run(tauri::generate_context!())
    .expect("error while running Writed.");
}
