/* Writed. desktop shell.
   No custom commands: the app is the same static build served on the web,
   loaded from disk instead of over HTTP. localStorage, WritedStore and all
   app logic are untouched — the webview provides localStorage natively. */
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .run(tauri::generate_context!())
    .expect("error while running Writed.");
}
