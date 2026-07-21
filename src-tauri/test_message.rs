use tauri::WebviewBuilder;
fn test() {
    let builder = WebviewBuilder::new("id", tauri::WebviewUrl::External("http://a.com".parse().unwrap()));
    let _ = builder.on_message(|_webview, payload: String| {});
}
