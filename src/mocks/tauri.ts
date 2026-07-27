import { mockIPC } from "@tauri-apps/api/mocks";

export function setupTauriMocks() {
  mockIPC((cmd, args) => {
    console.log(`[Tauri Mock] IPC Command intercepted: ${cmd}`, args);

    if (cmd === "plugin:event|listen") {
      // Mock event listener subscription (return random ID)
      return Math.floor(Math.random() * 1000000);
    }
    
    // Default fallback
    return {};
  });
}
