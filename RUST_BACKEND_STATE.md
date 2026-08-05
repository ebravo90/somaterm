# Somaterm Rust Backend State & Architecture Report

## 1. Overview
The Tauri backend is currently lightweight and delegates most logic to the frontend. It primarily acts as an OS-level bridge for spawning pseudoterminals (PTYs), managing headless WebViews (for the browser widget), handling filesystem reads, and managing basic JSON configuration state.

## 2. State Management & Architecture
- **Global State**: Global state is strictly managed using `std::sync::Mutex`. 
- **Managed State Types**: The only major piece of state managed by Tauri's `State` system is the `PtyManager` (`app.manage(Mutex::new(pty::PtyManager::new()));`), which maintains an `Arc<Mutex<HashMap<String, PtySession>>>` to track active terminal sessions.
- **Security Middleware**: There is a `PermissionGate` struct in `ipc.rs` that validates commands before they are injected into the PTY (currently blocks destructive commands like `rm -rf /` and `mkfs`).

## 3. Persistence Layer
- **No True Database:** There is currently no SQLite, SQLx, or formal ORM configured.
- **File-Based Persistence:** State is persisted purely by serializing/deserializing JSON files in the OS-specific `app_config_dir` (e.g., `~/Library/Application Support/somaterm/`).
  - `agents.json`: Stores LLM agent profiles.
  - `history.json`: Stores chat session history.
- **Secure Storage:** The `keyring` crate is used to securely store and retrieve LLM API keys natively in the OS keychain (e.g., macOS Keychain), preventing them from being stored in plain text in `agents.json`.

## 4. Exposed Tauri Commands (`#[tauri::command]`)

### Terminal & PTY Management
- `spawn_pty(id, rows, cols, default_shell, use_system_path)`: Spawns a new terminal session.
- `write_to_pty(id, data)`: Writes standard input to the PTY.
- `inject_command(id, command)`: Validates via `PermissionGate` and writes a command.
- `resize_pty(id, rows, cols)`: Resizes the terminal window.
- `close_pty(id)`: Terminates a session.

### WebView (Browser) Management
- `create_webview(...)`, `resize_webview(...)`, `destroy_webview(id)`, `hide_webview(id)`
- `webview_back(id)`, `webview_forward(id)`, `webview_reload(id)`, `webview_navigate(id, url)`
- `webview_open_devtools(id)`, `try_hibernate_webview(id)`

### Filesystem & Context
- `get_file_tree(target_path, max_depth)`: Recursively builds a directory tree (ignoring `node_modules`, `.git`, etc.).
- `search_files(target_path, query)`: Uses `ignore` crate to perform fast file searches.
- `read_file_content(path)`: Reads raw file strings for LLM context injection.
- `get_system_shell()`, `get_initial_cwd()`: Utility endpoints for terminal initialization.

### Agent Configuration
- `load_agents()`, `save_agents(agents)`: Loads/Saves agent profiles to JSON and interacts with the OS Keyring.
- `load_history()`, `save_history(payload)`: Saves chat history blob.

### App Interop
- `update_active_terminals_menu(terminals)`: Updates native OS menu bar items.
- `write_debug_log(session_id, log_line)`: Appends to local debug log file.
- `open_logs_folder()`: Opens OS finder to the logs directory.

## 5. Missing Capabilities & Gaps
To support the newly refactored UI and upcoming features, the backend is currently missing:
1. **Kanban Backend Integration:** There are no endpoints (`create_ticket`, `update_ticket`, `load_kanban_state`) and no SQLite database to persist the Kanban state locally. The frontend is currently operating entirely on mock data in the Zustand store.
2. **Local LLM Orchestration:** The backend does not handle Ollama/Llama orchestration natively; the frontend is currently making `fetch()` requests directly to localhost endpoints. Moving this to Rust could provide better CORS bypass and network control.
3. **Advanced AI Guardrails:** The `PermissionGate` is currently rudimentary (just checking string contents). It lacks AST parsing or deeper semantic evaluation for YOLO mode terminal injections.
