use tauri::WebviewBuilder;
fn test() {
    let _ = WebviewBuilder::new("id", tauri::WebviewUrl::External("http://a.com".parse().unwrap())).on_ipc_message(|webview, payload| {});
}
