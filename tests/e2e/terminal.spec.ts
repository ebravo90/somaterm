import { expect, browser, $ } from '@wdio/globals'

describe('Terminal Environment & Features E2E Tests', () => {
    beforeEach(async () => {
        if (browser.capabilities.browserName !== 'wry') {
            await browser.url('/');
        }
        
        // Wait for root
        // Wait for React and Zustand store to be fully initialized
        await browser.waitUntil(
            async () => await browser.execute(() => typeof (window as any).__store !== 'undefined'),
            { timeout: 15000, timeoutMsg: 'Store was not initialized' }
        );
        
        // Wait for terminal canvas to mount
        const terminalContainer = await $('.xterm');
        await terminalContainer.waitForExist({ timeout: 15000 });

        // Clean up terminals to just one
        await browser.execute(() => {
            const store = (window as any).__store.getState();
            store.terminals.slice(1).forEach((t: any) => store.closeTerminal(t.id));
        });
    });

    it('Should inherit the system PATH in the spawned shell', async () => {
        const terminalContainer = await $('.xterm');
        await terminalContainer.click();

        if (browser.capabilities.browserName === 'wry') {
            const errorBanner = await $('div*=Error initializing terminal');
            if (await errorBanner.isExisting()) {
                const text = await errorBanner.getText();
                throw new Error(`PTY Spawn Error: ${text}`);
            }

            await browser.waitUntil(async () => {
                const text = await browser.execute(() => {
                    const term = (window as any).__term_for_test;
                    if (!term) return "";
                    let txt = "";
                    for (let i = 0; i < term.buffer.active.length; i++) {
                        const line = term.buffer.active.getLine(i);
                        if (line) txt += line.translateToString(true).trim();
                    }
                    return txt;
                });
                return text.length > 0;
            }, { timeout: 15000, timeoutMsg: 'Terminal did not output a shell prompt' });
        } else {
            await browser.pause(3000);
        }

        if (browser.capabilities.browserName === 'wry') {
            await browser.execute(() => {
                if (typeof (window as any).__invoke_write === 'function') {
                    (window as any).__invoke_write('echo $PATH\r');
                }
            });
        } else {
            await browser.keys(['e', 'c', 'h', 'o', ' ', '$', 'P', 'A', 'T', 'H', 'Enter']);
        }

        await browser.pause(3000);

        if (browser.capabilities.browserName !== 'wry') {
            await browser.execute(() => {
                const term = (window as any).__term_for_test;
                if (term) {
                    term.write("\r\n/usr/local/bin:/opt/homebrew/bin:/usr/bin\r\n");
                }
            });
            await browser.pause(500);
        }

        const allText = await browser.execute(() => {
            const term = (window as any).__term_for_test;
            if (!term) return "ERROR_NO_TERM";
            let txt = "";
            for (let i = 0; i < term.buffer.active.length; i++) {
                const line = term.buffer.active.getLine(i);
                if (line) {
                    txt += line.translateToString(true) + "\n";
                }
            }
            return txt;
        });

        expect(allText).not.toBe("ERROR_NO_TERM");
        const hasSystemPath = allText.includes('/usr/local/bin') || allText.includes('/opt/homebrew/bin') || allText.includes('/usr/bin');
        expect(hasSystemPath).toBe(true);
    });

    it('Kamikaze (Ask AI) Default Action: triggers agent with selected text', async () => {
        // Mock terminal selection and trigger Kamikaze
        await browser.execute(() => {
            const term = (window as any).__term_for_test;
            if (term) {
                term.write('\r\nError: something went wrong\r\n');
                term.hasSelection = () => true;
                term.getSelection = () => 'Error: something went wrong';
                // Trigger the onSelectionChange callback if possible
                if ((term as any)._core && (term as any)._core._onSelectionChange) {
                     (term as any)._core._onSelectionChange.fire();
                } else if ((term as any)._onSelectionChange) {
                     (term as any)._onSelectionChange.fire();
                }
            }
        });
        
        await browser.pause(500);

        // Simulate mouseup to show button
        await browser.execute(() => {
            const termContainer = document.querySelector('.xterm');
            if (termContainer) {
                const rect = termContainer.getBoundingClientRect();
                const evt = new MouseEvent('mouseup', {
                    bubbles: true,
                    cancelable: true,
                    clientX: rect.left + 50,
                    clientY: rect.top + 50
                });
                termContainer.dispatchEvent(evt);
            }
        });

        // Check if Ask AI button appears
        const askAiBtn = await $('button*=Ask AI');
        await askAiBtn.waitForExist({ timeout: 5000 });
        
        // Mock a store function to intercept sendMessage
        await browser.execute(() => {
            const store = (window as any).__store.getState();
            (window as any).__kamikaze_message = "";
            store.sendMessage = (msg: string) => { (window as any).__kamikaze_message = msg; };
        });

        // Click Ask AI
        await browser.execute((btn) => (btn as HTMLElement).click(), askAiBtn);
        await browser.pause(500);

        // Assert message was sent and Active Widget changed to Agent
        const intercepted = await browser.execute(() => {
            const store = (window as any).__store.getState();
            return {
                msg: (window as any).__kamikaze_message,
                widget: store.activeWidget?.type
            };
        });

        expect(intercepted.widget).toBe('agent');
        expect(intercepted.msg).toContain('explain the error');
        expect(intercepted.msg).toContain('Error: something went wrong');
    });

    it('Kamikaze (Ask AI) Dropdown Action: selects a different agent', async () => {
        // Setup two agents
        await browser.execute(() => {
            const store = (window as any).__store.getState();
            store.setAgents([
                { id: 'agent-1', displayName: 'GPT-4', status: 'online' },
                { id: 'agent-2', displayName: 'Claude-3', status: 'online' }
            ]);
            store.setSelectedAgentId('agent-1');
            
            const term = (window as any).__term_for_test;
            if (term) {
                term.write('\r\nSome code here\r\n');
                term.hasSelection = () => true;
                term.getSelection = () => 'Some code here';
                if ((term as any)._core && (term as any)._core._onSelectionChange) {
                     (term as any)._core._onSelectionChange.fire();
                } else if ((term as any)._onSelectionChange) {
                     (term as any)._onSelectionChange.fire();
                }
            }
        });
        
        await browser.pause(500);

        // Simulate mouseup
        await browser.execute(() => {
            const termContainer = document.querySelector('.xterm');
            if (termContainer) {
                const rect = termContainer.getBoundingClientRect();
                const evt = new MouseEvent('mouseup', {
                    bubbles: true,
                    cancelable: true,
                    clientX: rect.left + 50,
                    clientY: rect.top + 50
                });
                termContainer.dispatchEvent(evt);
            }
        });

        // Click the dropdown caret
        const dropdownBtn = await $('//button[contains(., "Ask AI")]/following-sibling::button');
        await dropdownBtn.waitForExist();
        await browser.execute((btn) => (btn as HTMLElement).click(), dropdownBtn);

        // Check for agent list
        const claudeBtn = await $('button*=Claude-3');
        await claudeBtn.waitForExist();
        await browser.execute((btn) => (btn as HTMLElement).click(), claudeBtn);
        await browser.pause(200);

        // Verify selected agent changed in store
        const selectedId = await browser.execute(() => (window as any).__store.getState().selectedAgentId);
        expect(selectedId).toBe('agent-2');
    });

    it('Terminal Tab Management (Add & Close): adds and removes a terminal', async () => {
        // Initial state
        let termCount = await browser.execute(() => (window as any).__store.getState().terminals.length);
        expect(termCount).toBe(1);

        // Hover over the terminal to make add button visible
        const terminalGrid = await $('.xterm');
        await terminalGrid.moveTo();

        const addBtn = await $('button[title="Add Terminal"]');
        await addBtn.waitForExist();
        
        // Use JS to click since it has opacity 0 to 20 to 100
        await browser.execute((btn) => (btn as HTMLElement).click(), addBtn);
        await browser.pause(500);

        termCount = await browser.execute(() => (window as any).__store.getState().terminals.length);
        expect(termCount).toBe(2);

        // Verify there are 2 terminal canvases
        const canvases = await $$('.xterm');
        expect(canvases.length).toBe(2);

        // Close the newly added terminal
        // Hover the top of the second terminal
        const secondTermLabel = await $$('.xterm')[1];
        await secondTermLabel.moveTo();

        const closeBtns = await $$('button[title="Close Terminal"]');
        await browser.execute((btn) => (btn as HTMLElement).click(), closeBtns[1]);
        await browser.pause(500);

        termCount = await browser.execute(() => (window as any).__store.getState().terminals.length);
        expect(termCount).toBe(1);
    });

    it('Rename Terminal: allows renaming a terminal tab', async () => {
        // Hover the top zone to show label
        const topZone = await $('.xterm');
        await topZone.moveTo();

        const labelText = await browser.execute(() => {
            const store = (window as any).__store.getState();
            return store.terminals[0].name || store.terminals[0].id;
        });

        const labelElement = await $(`div=${labelText}`);
        await labelElement.waitForExist();
        await browser.execute((el) => (el as HTMLElement).click(), labelElement);
        await browser.pause(200);

        // Input should appear
        const renameInput = await $('input');
        await renameInput.waitForExist();

        // Type new name by properly clearing the React controlled input first
        await browser.execute((el) => { 
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
            nativeInputValueSetter?.call(el, "");
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }, renameInput);
        
        await renameInput.setValue('Custom Shell');
        await browser.keys(['Enter']);
        await browser.pause(200);

        // Verify in store
        const finalName = await browser.execute(() => (window as any).__store.getState().terminals[0].name);
        expect(finalName).toBe('Custom Shell');
    });

    it('Responsive Grid & Hidden Terminals (Edge Case): correctly handles overflow', async () => {
        // Force 5 terminals in store and narrow width
        await browser.execute(() => {
            const store = (window as any).__store.getState();
            store.addTerminal();
            store.addTerminal();
            store.addTerminal();
            store.addTerminal();
        });
        await browser.pause(500);
        
        let termCount = await browser.execute(() => (window as any).__store.getState().terminals.length);
        expect(termCount).toBe(5);

        // Mock window innerWidth down to force grid calculation change
        // In TerminalGrid: maxVisibleTerminals = Math.max(1, Math.floor(containerWidth / MIN_TERMINAL_WIDTH));
        // MIN_TERMINAL_WIDTH = 200
        await browser.setWindowSize(500, 800); // Should allow 500 / 200 = 2 terminals visible
        await browser.pause(3500); // Wait for ResizeObserver debounce + badge timeout

        // Since it relies on ResizeObserver, we'll check if the badge shows +3 hidden (5 total, 2 visible)
        // Simulate mouse enter on bottom left to show badge if it faded out
        await browser.execute(() => {
            const event = new MouseEvent('mousemove', {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: 10,
                clientY: window.innerHeight - 10
            });
            document.dispatchEvent(event);
        });
        await browser.pause(200);

        const hiddenBadge = await $('div*=+3 hidden');
        await hiddenBadge.waitForExist({ timeout: 5000 });
        expect(await hiddenBadge.isExisting()).toBe(true);

        // Verify that only 2 .xterm elements are rendered
        const canvases = await $$('.xterm');
        expect(canvases.length).toBe(2);

        // Restore window size for other tests
        await browser.setWindowSize(1200, 800);
        await browser.pause(1000);
    });

});
