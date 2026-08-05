import { expect, browser, $ } from '@wdio/globals'

describe('Agent UI & Configuration E2E', () => {
    
    beforeEach(async () => {
        if (browser.capabilities.browserName !== 'wry') {
            await browser.url('/');
        }
        
        // Wait for React and Zustand store to be fully initialized
        await browser.waitUntil(
            async () => await browser.execute(() => typeof (window as any).__store !== 'undefined'),
            { timeout: 15000, timeoutMsg: 'Store was not initialized' }
        );

        // Open Agent Widget and clean state
        await browser.execute(() => {
            const store = (window as any).__store.getState();
            store.setActiveWidget({ type: 'agent' });
            store.setAgents([]);
            store.setSelectedAgentId(null);
            store.clearContextFiles();
            
            // Setup base intercept to avoid breaking other things
            const originalInvoke = (window as any).__TAURI_INTERNALS__.invoke;
            (window as any).__interceptedCommands = {};
            (window as any).__TAURI_INTERNALS__.invoke = function(cmd: string, args: any) {
                if ((window as any).__interceptedCommands[cmd]) {
                    return (window as any).__interceptedCommands[cmd](args);
                }
                return originalInvoke(cmd, args);
            };
        });
        
        // Wait for Widget to render
        const input = await $('input[placeholder="Ask the agent..."]');
        await input.waitForExist({ timeout: 5000 });
    });

    it('Input Validation: Send button should be disabled when input is empty', async () => {
        // Mock an agent so input is enabled otherwise
        await browser.execute(() => {
            const store = (window as any).__store.getState();
            store.setAgents([{ id: 'test-agent', displayName: 'Test', modelName: 'test', endpoint: 'http://localhost/api/chat', status: 'online', type: 'local' }]);
            store.setSelectedAgentId('test-agent');
        });

        const chatTab = await $('button=Chat');
        if (await chatTab.isExisting()) {
            await browser.execute((btn) => (btn as HTMLElement).click(), chatTab);
        }

        const input = await $('input[placeholder="Ask the agent..."]');
        
        // Wait for the send button
        const sendBtn = await $('button[title="Send Message"]');
        await sendBtn.waitForExist();

        // Initially empty, should be disabled
        expect(await sendBtn.isEnabled()).toBe(false);

        // Type something
        await browser.execute(() => {
            const inputEl = document.querySelector('input[placeholder="Ask the agent..."]') as HTMLInputElement;
            if (inputEl) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
                nativeInputValueSetter?.call(inputEl, "Hello");
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        
        expect(await sendBtn.isEnabled()).toBe(true);

        // Clear input
        await browser.execute(() => {
            const inputEl = document.querySelector('input[placeholder="Ask the agent..."]') as HTMLInputElement;
            if (inputEl) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
                nativeInputValueSetter?.call(inputEl, "");
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        expect(await sendBtn.isEnabled()).toBe(false);
    });

    it('Local Agent Configuration: create local agent with successful and failed connection', async () => {
        // Switch to Settings tab
        const settingsTab = await $('button=Settings');
        await settingsTab.waitForExist();
        await browser.execute((btn) => (btn as HTMLElement).click(), settingsTab);

        // 1. Create a new agent
        const addBtn = await $('h3=Agent Profiles').parentElement().$('button');
        await addBtn.waitForExist();
        await browser.execute((btn) => (btn as HTMLElement).click(), addBtn);

        const newAgentName = 'New Agent';
        const agentItem = await $(`span=${newAgentName}`).parentElement().parentElement();
        await agentItem.waitForExist();
        await browser.execute((btn) => (btn as HTMLElement).click(), agentItem);

        // Set type to Local
        const typeSelect = await agentItem.parentElement().$('select');
        await typeSelect.waitForExist();
        await typeSelect.selectByVisibleText('Local (Ollama)');

        // Mock successful connection
        await browser.execute(() => {
            (window as any).__interceptedCommands['test_llm_connection'] = () => Promise.resolve('ok');
        });

        const verifyBtn = await $('button=Verify Connection');
        await verifyBtn.waitForExist();
        await browser.execute((btn) => (btn as HTMLElement).click(), verifyBtn);
        await browser.pause(500); // Wait for verify to complete

        let statusColor = await agentItem.$('div.w-2.h-2').getAttribute('class');
        expect(statusColor).toContain('bg-green-500'); // Online

        // Mock failed connection
        await browser.execute(() => {
            (window as any).__interceptedCommands['test_llm_connection'] = () => Promise.reject(new Error('Connection refused'));
        });

        await browser.execute((btn) => (btn as HTMLElement).click(), verifyBtn);
        await browser.pause(500);

        statusColor = await agentItem.$('div.w-2.h-2').getAttribute('class');
        expect(statusColor).toContain('bg-red-500'); // Offline
    });

    it('Remote Agent Configuration: create remote agent with successful and failed connection', async () => {
        const settingsTab = await $('button=Settings');
        await settingsTab.waitForExist();
        await browser.execute((btn) => (btn as HTMLElement).click(), settingsTab);

        const addBtn = await $('h3=Agent Profiles').parentElement().$('button');
        await addBtn.waitForExist();
        await browser.execute((btn) => (btn as HTMLElement).click(), addBtn);

        const agentItem = await $(`span=New Agent`).parentElement().parentElement();
        await agentItem.waitForExist();
        await browser.execute((btn) => (btn as HTMLElement).click(), agentItem);

        // Set type to Remote (already remote by default, just assert it)
        const typeSelect = await agentItem.parentElement().$('select');
        await typeSelect.waitForExist();
        expect(await typeSelect.getValue()).toBe('remote');

        // Mock successful connection
        await browser.execute(() => {
            (window as any).__interceptedCommands['test_llm_connection'] = () => Promise.resolve('ok');
        });

        const verifyBtn = await $('button=Verify Connection');
        await verifyBtn.waitForExist();
        await browser.execute((btn) => (btn as HTMLElement).click(), verifyBtn);
        await browser.pause(500);

        let statusColor = await agentItem.$('div.w-2.h-2').getAttribute('class');
        expect(statusColor).toContain('bg-green-500');

        // Mock failed connection
        await browser.execute(() => {
            (window as any).__interceptedCommands['test_llm_connection'] = () => Promise.reject(new Error('Invalid API key'));
        });

        await browser.execute((btn) => (btn as HTMLElement).click(), verifyBtn);
        await browser.pause(500);

        statusColor = await agentItem.$('div.w-2.h-2').getAttribute('class');
        expect(statusColor).toContain('bg-red-500');
    });

    it('Agent Management: edit agent and delete agent', async () => {
        const settingsTab = await $('button=Settings');
        await settingsTab.waitForExist();
        await browser.execute((btn) => (btn as HTMLElement).click(), settingsTab);

        const addBtn = await $('h3=Agent Profiles').parentElement().$('button');
        await addBtn.waitForExist();
        await browser.execute((btn) => (btn as HTMLElement).click(), addBtn);

        const agentItem = await $(`span=New Agent`).parentElement().parentElement();
        await agentItem.waitForExist();
        await browser.execute((btn) => (btn as HTMLElement).click(), agentItem);

        // Edit
        const editBtn = await $('button=Edit');
        await editBtn.waitForExist();
        await browser.execute((btn) => (btn as HTMLElement).click(), editBtn);

        const nameInput = await $('label*=Display Name').parentElement().$('input');
        await nameInput.waitForExist();
        await nameInput.setValue('Custom Agent Name');
        
        const saveBtn = await $('button=Save');
        await saveBtn.waitForExist();
        // Mock success for the save verification
        await browser.execute(() => {
            (window as any).__interceptedCommands['test_llm_connection'] = () => Promise.resolve('ok');
        });
        await browser.execute((btn) => (btn as HTMLElement).click(), saveBtn);
        await browser.pause(500);

        // Name should be updated
        expect(await $(`span=Custom Agent Name`).isExisting()).toBe(true);

        // Delete
        const removeBtn = await $('button*=Remove Agent');
        await removeBtn.waitForExist();
        await browser.execute((btn) => (btn as HTMLElement).click(), removeBtn); // clicks to start timer

        await browser.waitUntil(async () => {
            return (await removeBtn.getText()) === 'Ready to remove';
        }, { timeout: 6000 });

        await browser.execute((btn) => (btn as HTMLElement).click(), removeBtn); // actually removes

        await browser.pause(500);
        expect(await $(`span=Custom Agent Name`).isExisting()).toBe(false);
    });

    it('Context Files Attachment UI: display context files staged', async () => {
        await browser.execute(() => {
            const store = (window as any).__store.getState();
            store.setAgents([{ id: 'test-agent', displayName: 'Test', modelName: 'test', endpoint: 'http://localhost/api/chat', status: 'online', type: 'local' }]);
            store.setSelectedAgentId('test-agent');
            store.addContextFile('/path/to/src/main.ts');
            store.addContextFile('/path/to/src/App.tsx');
            store.addContextFile('/path/to/src/index.css');
        });

        const chatTab = await $('button=Chat');
        if (await chatTab.isExisting()) {
            await browser.execute((btn) => (btn as HTMLElement).click(), chatTab);
        }

        // The ContextFilePicker renders the files as little badges
        const file1 = await $('span*=main.ts');
        const file2 = await $('span*=App.tsx');
        const file3 = await $('span*=index.css');

        await file1.waitForExist();
        expect(await file1.isExisting()).toBe(true);
        expect(await file2.isExisting()).toBe(true);
        expect(await file3.isExisting()).toBe(true);

        // Send button should be enabled even without text if files are attached
        const sendBtn = await $('button[title="Send Message"]');
        await sendBtn.waitForExist();
        expect(await sendBtn.isEnabled()).toBe(true);
    });

    it('Generation State: Stop Button visibility on slow stream', async () => {
        await browser.execute(() => {
            const store = (window as any).__store.getState();
            store.setAgents([{ id: 'test-agent', displayName: 'Test', modelName: 'test', endpoint: 'http://localhost/api/chat', status: 'online', type: 'local' }]);
            store.setSelectedAgentId('test-agent');
            
            // Mock a stream response that just hangs and doesn't return
            (window as any).__interceptedCommands['stream_llm_response'] = () => {
                return new Promise(() => {}); // never resolves
            };
        });

        const chatTab = await $('button=Chat');
        if (await chatTab.isExisting()) {
            await browser.execute((btn) => (btn as HTMLElement).click(), chatTab);
        }

        const input = await $('input[placeholder="Ask the agent..."]');
        await input.waitForExist();
        
        await browser.execute(() => {
            const inputEl = document.querySelector('input[placeholder="Ask the agent..."]') as HTMLInputElement;
            if (inputEl) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
                nativeInputValueSetter?.call(inputEl, "Hello");
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });

        const sendBtn = await $('button[title="Send Message"]');
        await sendBtn.waitForExist();
        await browser.execute((btn) => (btn as HTMLElement).click(), sendBtn);

        // Wait for generation to start
        const stopBtn = await $('button[title="Stop Generation"]');
        await stopBtn.waitForExist({ timeout: 2000 });
        expect(await stopBtn.isExisting()).toBe(true);

        // Verify "Thinking..." is displayed
        const thinking = await $('div*=Thinking...');
        expect(await thinking.isExisting()).toBe(true);

        // Click stop
        await browser.execute((btn) => (btn as HTMLElement).click(), stopBtn);

        // Stop button should disappear
        await stopBtn.waitForExist({ reverse: true, timeout: 2000 });
        expect(await stopBtn.isExisting()).toBe(false);
    });
});
