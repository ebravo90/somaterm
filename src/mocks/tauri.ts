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


  const eventListeners: Record<string, any[]> = {};

  mockIPC((cmd, args: any) => {
    console.log(`[Tauri Mock] IPC Command intercepted: ${cmd}`, args);

    if (cmd === "plugin:event|listen") {
      const { event, handler } = args;
      if (!eventListeners[event]) eventListeners[event] = [];
      eventListeners[event].push(handler);
      return Math.floor(Math.random() * 1000000);
    }

    if (cmd === "plugin:path|home_dir") {
      return Promise.resolve("/mock/home");
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
             const listeners = eventListeners[`pty-read-${id}`] || [];
             listeners.forEach(handlerId => {
               if ((window as any)._mockCallbacks && (window as any)._mockCallbacks[handlerId]) {
                 (window as any)._mockCallbacks[handlerId]({
                   event: `pty-read-${id}`,
                   id: 1,
                   payload: "/usr/local/bin:/opt/homebrew/bin\r\n"
                 });
               } else if (typeof (window as any)[`_${handlerId}`] === 'function') {
                   (window as any)[`_${handlerId}`]({
                       event: `pty-read-${id}`,
                       payload: "/usr/local/bin:/opt/homebrew/bin\r\n"
                   });
               } else {
                 emit(`pty-read-${id}`, "/usr/local/bin:/opt/homebrew/bin\r\n");
               }
             });
           }, 100);
        }
      }
      return Promise.resolve();
    }

    if (cmd === "spawn_pty") {
       const { id } = args;
       setTimeout(() => {
         const listeners = eventListeners[`pty-read-${id}`] || [];
         listeners.forEach(handlerId => {
           if ((window as any)._mockCallbacks && (window as any)._mockCallbacks[handlerId]) {
             (window as any)._mockCallbacks[handlerId]({
               event: `pty-read-${id}`,
               id: 1,
               payload: "Mock Terminal Ready\r\n"
             });
           } else {
             emit(`pty-read-${id}`, "Mock Terminal Ready\r\n");
           }
         });
       }, 100);
       return {};
    }

    if (cmd === "get_system_shell") {
       return Promise.resolve("/bin/bash");
    }

    if (cmd === "get_initial_cwd") {
       return Promise.resolve("/mock/cwd");
    }
    
    if (cmd === "get_file_tree") {
      // Mock different responses based on path to verify lazy loading
      if (args.targetPath === "/src") {
        return {
          name: "src",
          path: "/src",
          is_dir: true,
          children: [
            { name: "main.tsx", path: "/src/main.tsx", is_dir: false },
            { name: "App.tsx", path: "/src/App.tsx", is_dir: false }
          ]
        };
      }

      return {
        name: "Workspace",
        path: "/",
        is_dir: true,
        children: [
          { name: "src", path: "/src", is_dir: true }, // No children array to trigger lazy load
          { name: "package.json", path: "/package.json", is_dir: false },
          { name: "README.md", path: "/README.md", is_dir: false }
        ]
      };
    }

    if (cmd === "fetch_kanban_board") {
      return Promise.resolve([]);
    }

    if (cmd === "create_ticket") {
      return Promise.resolve({
        id: "SOMA-1",
        title: args?.payload?.title,
        description: args?.payload?.description,
        status: args?.payload?.status,
        priority: args?.payload?.priority,
        ticketType: args?.payload?.ticketType,
        cycleId: args?.payload?.cycleId,
        assigneeId: args?.payload?.assigneeId,
        reporterId: args?.payload?.reporterId
      });
    }

    if (cmd === "update_ticket_status") {
      return Promise.resolve();
    }

    if (cmd === "stream_llm_response") {
      const { payload } = args;
      const sessionId = payload.sessionId;
      
      let responseContent = "This is a generic mock response from the local LLM.";
      if (payload.prompt && payload.prompt.includes('rm -rf /')) {
        responseContent = "Sure, here is the command\n\n```bash\nrm -rf /\n```\n";
      }

      const sendChunk = (text: string, isDone: boolean) => {
        const eventName = "llm-stream-chunk";
        const listeners = eventListeners[eventName] || [];
        listeners.forEach(handlerId => {
          if ((window as any).__TAURI_INTERNALS__?.runCallback) {
            (window as any).__TAURI_INTERNALS__.runCallback(handlerId, {
              event: eventName,
              id: 1,
              payload: { sessionId, text, isDone }
            });
          } else if ((window as any)._mockCallbacks && (window as any)._mockCallbacks[handlerId]) {
            (window as any)._mockCallbacks[handlerId]({
              event: eventName,
              id: 1,
              payload: { sessionId, text, isDone }
            });
          } else if (typeof (window as any)[`_${handlerId}`] === 'function') {
            (window as any)[`_${handlerId}`]({
              event: eventName,
              id: 1,
              payload: { sessionId, text, isDone }
            });
          } else {
            emit(eventName, { sessionId, text, isDone });
          }
        });
      };

      setTimeout(() => {
        sendChunk(responseContent, false);
        setTimeout(() => {
          sendChunk("", true);
        }, 100);
      }, 100);

      return Promise.resolve();
    }

    if (cmd === "test_llm_connection") {
      const { payload } = args;
      if (payload?.prompt?.includes('Summarize the following prompt')) {
        return Promise.resolve(JSON.stringify({
          choices: [{ message: { content: 'Mocked Title' } }]
        }));
      }
      return Promise.resolve(JSON.stringify({ message: { content: 'ok' } }));
    }

    // Default fallback
    return {};
  });
}
