import { mockIPC } from "@tauri-apps/api/mocks";
import { emit } from "@tauri-apps/api/event";

export function setupTauriMocks() {
  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : input.toString());
    if (url.includes('/chat/completions') || url.includes('/api/chat')) {
      const bodyStr = init?.body?.toString() || '';
      
      if (bodyStr.includes('Summarize the following prompt')) {
        return new Response(JSON.stringify({
          choices: [{ message: { content: 'Mocked Title' } }]
        }));
      }

      let responseContent = "This is a generic mock response from the local LLM.";
      if (bodyStr.includes('rm -rf /')) {
        responseContent = "Sure, here is the command to delete the root directory:\n\n```bash\nrm -rf /\n```\n";
      }

      const stream = new ReadableStream({
        start(controller) {
          const chunk = `data: {"choices":[{"delta":{"content":${JSON.stringify(responseContent)}}}]}\n\n`;
          controller.enqueue(new TextEncoder().encode(chunk));
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        }
      });

      return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream' }
      });
    }
    return originalFetch(input, init);
  };


  mockIPC((cmd, args: any) => {
    console.log(`[Tauri Mock] IPC Command intercepted: ${cmd}`, args);

    if (cmd === "plugin:event|listen") {
      return Math.floor(Math.random() * 1000000);
    }
    
    if (cmd === "write_to_pty") {
      const data = args.data as string;
      if (data && typeof data === "string") {
        if (data.trim().includes("rm -rf /") || data.trim().includes("mkfs")) {
          return Promise.reject("Security Violation: Destructive command blocked by PermissionGate.");
        }
        
        const { id } = args;
        if (data.includes("echo $PATH")) {
           setTimeout(() => {
             emit(`pty-read-${id}`, "/usr/local/bin:/opt/homebrew/bin\r\n");
           }, 100);
        }
      }
      return Promise.resolve();
    }

    if (cmd === "spawn_pty") {
       const { id } = args;
       setTimeout(() => {
         emit(`pty-read-${id}`, "Mock Terminal Ready\r\n");
       }, 100);
       return {};
    }

    if (cmd === "get_system_shell") {
       return Promise.resolve("/bin/bash");
    }
    
    if (cmd === "get_file_tree") {
      return {
        name: "Workspace",
        path: "/",
        is_dir: true,
        children: [
          { name: "src", path: "/src", is_dir: true, children: [] },
          { name: "package.json", path: "/package.json", is_dir: false },
          { name: "README.md", path: "/README.md", is_dir: false }
        ]
      };
    }

    // Default fallback
    return {};
  });
}
