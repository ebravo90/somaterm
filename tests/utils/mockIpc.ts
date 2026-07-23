export const mockTauriIpc = () => {
  // Create a mock TAURI_INTERNALS object
  (window as any).__TAURI_INTERNALS__ = {
    transformCallback: (callback: any) => {
      const id = Math.random().toString();
      (window as any)._mockCallbacks = (window as any)._mockCallbacks || {};
      (window as any)._mockCallbacks[id] = callback;
      return id;
    },
    metadata: { currentWindow: { label: "main" } },
    plugins: {
      event: {
        unlisten: async () => {},
        listen: async () => 1
      }
    },
    invoke: async (cmd: string, args: any) => {
      console.log(`[Mock Tauri IPC] invoked: ${cmd}`, args);
      if (cmd === 'spawn_pty') {
        return 1; // dummy PTY ID
      }
      if (cmd === 'close_pty') {
        return; // pretend closed
      }
      if (cmd === 'plugin:event|listen') {
        const { event, handler } = args;
        if (event.startsWith('pty-read-')) {
          setTimeout(() => {
            const output = [
              '\x1b[32m➜\x1b[0m \x1b[36m~\x1b[0m neofetch',
              '\x1b[34m       _,met$$$$$gg.\x1b[0m           \x1b[33muser\x1b[0m@\x1b[33mmacbook\x1b[0m',
              '\x1b[34m    ,g$$$$$$$$$$$$$$$P.\x1b[0m        \x1b[33mOS\x1b[0m: macOS 14.0 arm64',
              '\x1b[34m  ,g$$P"     """Y$$.".\x1b[0m         \x1b[33mHost\x1b[0m: MacBook Pro',
              '\x1b[34m ,$$P\'              `$$$.\x1b[0m      \x1b[33mKernel\x1b[0m: 23.0.0',
              '\x1b[34m",g$"                 "$$."\x1b[0m    \x1b[33mUptime\x1b[0m: 2 days, 10 hours',
              '\x1b[34m "$P"                 "$$"\x1b[0m     \x1b[33mPackages\x1b[0m: 142 (brew)',
              '\x1b[34m  "P"                 "P"\x1b[0m      \x1b[33mShell\x1b[0m: zsh 5.9',
              '\x1b[34m   "                   "\x1b[0m       \x1b[33mTerminal\x1b[0m: Somaterm',
              '',
              '\x1b[32m➜\x1b[0m \x1b[36m~\x1b[0m '
            ].join('\r\n');
            if ((window as any)._mockCallbacks[handler]) {
              (window as any)._mockCallbacks[handler]({
                event: event,
                id: 1,
                payload: output
              });
            }
            
            // Fuzzing logic: randomly send malformed IPC payloads to test frontend resilience
            setTimeout(() => {
              if ((window as any)._mockCallbacks[handler]) {
                (window as any)._mockCallbacks[handler]({
                  event: event,
                  id: 1,
                  payload: { malformed: "data_payload", code: 500 }
                });
              }
            }, 1000);
          }, 500);
        }
        return 1;
      }
    }
  };
  
  (window as any).__TAURI_INTERNALS__.registerListener = () => {};
  (window as any).__TAURI_INTERNALS__.unregisterListener = () => {};
  
  // Some versions of Tauri core use __TAURI_IPC__
  (window as any).__TAURI_IPC__ = (window as any).__TAURI_INTERNALS__.invoke;
};
