import { mockIPC } from "@tauri-apps/api/mocks";
import { emit } from "@tauri-apps/api/event";

export function setupTauriMocks() {
  mockIPC((cmd, args: any) => {
    console.log(`[Tauri Mock] IPC Command intercepted: ${cmd}`, args);

    if (cmd === "plugin:event|listen") {
      return Math.floor(Math.random() * 1000000);
    }
    
    if (cmd === "write_to_pty") {
      const { id, data } = args;
      if (typeof data === "string" && data.includes("echo $PATH")) {
         setTimeout(() => {
           emit(`pty-read-${id}`, "/usr/local/bin:/opt/homebrew/bin\r\n");
         }, 100);
      }
      return {};
    }

    if (cmd === "spawn_pty") {
       const { id } = args;
       setTimeout(() => {
         emit(`pty-read-${id}`, "Mock Terminal Ready\r\n");
       }, 100);
       return {};
    }
    
    // Default fallback
    return {};
  });
}
