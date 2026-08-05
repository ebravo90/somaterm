import { expect, browser, $ } from '@wdio/globals'

describe('Web Browser E2E Tests', () => {
    beforeEach(async () => {
        if (browser.capabilities.browserName !== 'wry') {
            await browser.url('/');
        }
        
        // Wait for root
        const root = await $('#root');
        await root.waitForExist({ timeout: 15000 });
        
        // Setup base intercept for Tauri invokes
        await browser.execute(() => {
            const originalInvoke = (window as any).__TAURI_INTERNALS__.invoke;
            (window as any).__interceptedCommands = {};
            (window as any).__command_calls = {};
            
            (window as any).__TAURI_INTERNALS__.invoke = function(cmd: string, args: any) {
                if (!(window as any).__command_calls[cmd]) {
                    (window as any).__command_calls[cmd] = [];
                }
                (window as any).__command_calls[cmd].push(args);
                
                if ((window as any).__interceptedCommands[cmd]) {
                    return (window as any).__interceptedCommands[cmd](args);
                }
                
                // Stub webview commands to avoid crashing the test
                if (['create_webview', 'resize_webview', 'hide_webview', 'destroy_webview', 'webview_back', 'webview_forward', 'webview_reload'].includes(cmd)) {
                    return Promise.resolve();
                }
                
                return originalInvoke(cmd, args);
            };

            // Clean state
            const store = (window as any).__store.getState();
            store.webViews.forEach((w: any) => store.removeWebView(w.id));
            store.setActiveWidget(null);
            store.setActiveWebId(null);
        });
    });

    it('Global Close vs. Tab State Persistence: tabs remain when widget is closed', async () => {
        // Open Web widget and add tabs
        await browser.execute(() => {
            const store = (window as any).__store.getState();
            store.addWebView('https://google.com');
            store.addWebView('https://github.com');
            store.setActiveWidget({ type: 'web_manager' });
        });
        await browser.pause(500);

        // Verify tabs are present
        const googleTab = await $('div*=google.com');
        const githubTab = await $('div*=github.com');
        await googleTab.waitForExist();
        await githubTab.waitForExist();

        expect(await googleTab.isExisting()).toBe(true);
        expect(await githubTab.isExisting()).toBe(true);

        // Click close button on widget header
        const closeWidgetBtn = await $('button[aria-label="Close"]');
        await closeWidgetBtn.waitForExist();
        await browser.execute((btn) => (btn as HTMLElement).click(), closeWidgetBtn);
        await browser.pause(500);

        // Verify widget is gone
        await closeWidgetBtn.waitForExist({ reverse: true });

        // Reopen widget
        await browser.execute(() => {
            const store = (window as any).__store.getState();
            store.setActiveWidget({ type: 'web_manager' });
        });
        await browser.pause(500);

        // Verify tabs are still there
        const googleTabAfter = await $('div*=google.com');
        const githubTabAfter = await $('div*=github.com');
        expect(await googleTabAfter.isExisting()).toBe(true);
        expect(await githubTabAfter.isExisting()).toBe(true);
    });

    it('Individual Tab Closure: removes specific tab from list', async () => {
        await browser.execute(() => {
            const store = (window as any).__store.getState();
            store.addWebView('https://google.com');
            store.addWebView('https://github.com');
            store.setActiveWidget({ type: 'web_manager' });
        });
        await browser.pause(500);

        // Github is the second tab added
        const closeBtns = await $$('button[title="Close session"]');
        expect(closeBtns.length).toBeGreaterThanOrEqual(2);
        
        await browser.execute((btn) => (btn as HTMLElement).click(), closeBtns[1]);
        await browser.pause(500);

        // Verify github is gone but google remains
        const googleTab = await $('div*=google.com');
        expect(await googleTab.isExisting()).toBe(true);

        const githubTabAfter = await $('div*=github.com');
        expect(await githubTabAfter.isExisting()).toBe(false);
    });

    it('Navigation Buttons (Back, Forward, Reload): dispatches correct events to webview', async () => {
        // We need an active webview to render NativeWebview
        await browser.execute(() => {
            const store = (window as any).__store.getState();
            store.addWebView('https://google.com');
            store.setActiveWidget({ type: 'webview' });
            
            const updatedStore = (window as any).__store.getState();
            if (updatedStore.webViews.length > 0) {
                updatedStore.setActiveWebId(updatedStore.webViews[0].id);
            }
        });
        await browser.pause(500);

        // NativeWebview is overlaid when activeWebId is set and there's a selected tab
        // Let's check for navigation buttons
        const backBtn = await $('button[title="Back"]');
        const forwardBtn = await $('button[title="Forward"]');
        const reloadBtn = await $('button[title="Reload"]');

        await backBtn.waitForExist();
        await forwardBtn.waitForExist();
        await reloadBtn.waitForExist();

        // Click Back
        await browser.execute((btn) => (btn as HTMLElement).click(), backBtn);
        await browser.pause(200);

        // Click Forward
        await browser.execute((btn) => (btn as HTMLElement).click(), forwardBtn);
        await browser.pause(200);

        // Click Reload
        await browser.execute((btn) => (btn as HTMLElement).click(), reloadBtn);
        await browser.pause(200);

        // Verify invokes
        const calls = await browser.execute(() => {
            return (window as any).__command_calls;
        });

        expect(calls['webview_back']).toBeDefined();
        expect(calls['webview_back'].length).toBeGreaterThanOrEqual(1);

        expect(calls['webview_forward']).toBeDefined();
        expect(calls['webview_forward'].length).toBeGreaterThanOrEqual(1);

        expect(calls['webview_reload']).toBeDefined();
        expect(calls['webview_reload'].length).toBeGreaterThanOrEqual(1);
    });
});
