import { expect, browser, $ } from '@wdio/globals'

describe('File Explorer to Agent Bridge Tests', () => {
    it('Should handle Zustand stagedContextFiles additions, removals, and clears correctly', async () => {
        if (browser.capabilities.browserName !== 'wry') {
            await browser.url('/');
        }
        
        const root = await $('#root');
        await root.waitForExist({ timeout: 15000 });

        // Test addition
        await browser.execute(() => {
            const store = (window as any).__store.getState();
            store.addContextFile('/tmp/file1.ts');
            store.addContextFile('/tmp/file2.rs');
            store.addContextFile('/tmp/file1.ts'); // duplicate should be ignored
        });

        const state1 = await browser.execute(() => (window as any).__store.getState().stagedContextFiles);
        expect(state1).toEqual(['/tmp/file1.ts', '/tmp/file2.rs']);

        // Test removal
        await browser.execute(() => {
            (window as any).__store.getState().removeContextFile('/tmp/file1.ts');
        });

        const state2 = await browser.execute(() => (window as any).__store.getState().stagedContextFiles);
        expect(state2).toEqual(['/tmp/file2.rs']);

        // Test clear
        await browser.execute(() => {
            (window as any).__store.getState().clearContextFiles();
        });

        const state3 = await browser.execute(() => (window as any).__store.getState().stagedContextFiles);
        expect(state3).toEqual([]);
    });

    it('Should support multi-select via Cmd/Ctrl click and route context to Agent widget', async () => {
        if (browser.capabilities.browserName !== 'wry') {
            await browser.url('/');
        }

        // Open file explorer
        await browser.execute(() => {
            (window as any).__store.getState().setActiveWidget({ type: 'file_explorer' });
            (window as any).__store.getState().clearContextFiles(); // ensure clean state
        });

        // Wait for src directory and expand it
        const srcNode = await $('//span[text()="src"]');
        await srcNode.waitForExist({ timeout: 15000 });
        await srcNode.click();

        // Wait for files to appear
        const mainTsxNode = await $('//span[text()="main.tsx"]');
        const appTsxNode = await $('//span[text()="App.tsx"]');
        await mainTsxNode.waitForExist({ timeout: 5000 });
        await appTsxNode.waitForExist({ timeout: 5000 });

        // Multi-select Flow
        // 1. Standard click on main.tsx
        await mainTsxNode.click();
        
        // 2. Cmd/Ctrl + click on App.tsx
        await browser.execute((el) => {
            const evt = new MouseEvent("click", { bubbles: true, metaKey: true });
            (el as HTMLElement).dispatchEvent(evt);
        }, appTsxNode);

        // 3. Right-click on App.tsx to open context menu
        await browser.execute((el) => {
            const evt = new MouseEvent("contextmenu", { bubbles: true, clientX: 100, clientY: 100 });
            (el as HTMLElement).dispatchEvent(evt);
        }, appTsxNode);

        const sendToAgentBtn = await $('button*=Send to Agent');
        await sendToAgentBtn.waitForExist({ timeout: 5000 });

        // Click the dropdown arrow button
        const arrowBtn = await $('//button[contains(., "Send to Agent")]/following-sibling::button');
        await browser.execute((btn) => (btn as HTMLElement).click(), arrowBtn);

        // Click New Chat in sub-menu
        const newChatBtn = await $('button=New Chat');
        await newChatBtn.waitForExist({ timeout: 2000 });
        await browser.execute((btn) => (btn as HTMLElement).click(), newChatBtn);

        // Verify active widget changed to Agent
        const activeWidget = await browser.execute(() => (window as any).__store.getState().activeWidget?.type);
        expect(activeWidget).toBe('agent');

        // Verify files are staged
        const stagedFiles = await browser.execute(() => (window as any).__store.getState().stagedContextFiles);
        expect(stagedFiles.length).toBe(2);
        expect(stagedFiles.some((f: string) => f.endsWith('main.tsx'))).toBe(true);
        expect(stagedFiles.some((f: string) => f.endsWith('App.tsx'))).toBe(true);
    });

    it('Should not render file content in Chat Bubble DOM and should include it in LLM payload', async () => {
        if (browser.capabilities.browserName !== 'wry') {
            await browser.url('/');
        }
        
        // Intercept Tauri invoke and fetch
        await browser.execute(() => {
            const originalInvoke = (window as any).__TAURI_INTERNALS__.invoke;
            (window as any).__interceptedPayloads = [];
            (window as any).__TAURI_INTERNALS__.invoke = function(cmd: string, args: any) {
                if (cmd === 'read_file_content') {
                    return Promise.resolve("MOCKED_FILE_CONTENT_123");
                }
                return originalInvoke(cmd, args);
            };
            
            const originalFetch = window.fetch;
            window.fetch = async (...args) => {
                if (typeof args[0] === 'string' && args[0].includes('/api/chat')) {
                    const req = args[1];
                    if (req && req.body) {
                        (window as any).__interceptedPayloads.push(JSON.parse(req.body as string));
                    }
                    return new Response(JSON.stringify({ message: { content: "Mocked response" } }));
                }
                return originalFetch(...args);
            };
        });

        // Setup Agent widget and stage a file
        await browser.execute(() => {
            const store = (window as any).__store.getState();
            store.setAgents([{ id: 'test-agent', displayName: 'Test', modelName: 'test', endpoint: 'http://localhost/api/chat', status: 'online', type: 'local' }]);
            store.setSelectedAgentId('test-agent');
            store.setActiveWidget({ type: 'agent' });
            store.clearContextFiles();
            store.addContextFile('/mock/path/to/FileA.ts');
        });

        // Wait for widget input
        const agentInput = await $('input[placeholder="Ask the agent..."]');
        await agentInput.waitForExist({ timeout: 5000 });

        // Type a message
        await browser.execute(() => {
            const inputEl = document.querySelector('input[placeholder="Ask the agent..."]') as HTMLInputElement;
            if (inputEl) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
                nativeInputValueSetter?.call(inputEl, "Explain this code");
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });

        // Submit
        await agentInput.click();
        await browser.keys(['Enter']);

        // Verify Chat Bubble DOM does not contain the mocked content
        const bubbleTextNode = await $('//p[text()="Explain this code"]');
        await bubbleTextNode.waitForExist({ timeout: 5000 });
        
        // Let's get the whole bubble container (closest ancestor div)
        const bubbleHTML = await browser.execute(() => {
            const el = document.evaluate('//p[text()="Explain this code"]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            return el ? (el.parentElement?.parentElement?.innerHTML || '') : '';
        });
        
        expect(bubbleHTML).not.toContain("MOCKED_FILE_CONTENT_123");
        expect(bubbleHTML).toContain("FileA.ts");
        
        // Wait for fetch to process
        await browser.pause(500);

        // Verify the intercepted payload contains the file content
        const intercepted = await browser.execute(() => (window as any).__interceptedPayloads);
        expect(intercepted.length).toBeGreaterThan(0);
        
        const payloadMessages = intercepted[0].messages;
        const lastUserMessage = payloadMessages[payloadMessages.length - 1];
        
        expect(lastUserMessage.content).toContain("Explain this code");
        expect(lastUserMessage.content).toContain("MOCKED_FILE_CONTENT_123");
        expect(lastUserMessage.content).toContain("FileA.ts");
    });
});
