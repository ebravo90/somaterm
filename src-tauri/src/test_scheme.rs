use tauri::Manager;
fn test() {
    tauri::Builder::default()
        .register_uri_scheme_protocol("somaterm", |_app, request| {
            let _uri = request.uri().to_string();
            tauri::http::Response::builder()
                .status(200)
                .header("Access-Control-Allow-Origin", "*")
                .body(Vec::new())
                .unwrap()
        });
}
