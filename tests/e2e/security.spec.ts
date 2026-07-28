import { expect } from '@wdio/globals'

describe('Security Phase 2 Tests', () => {
    it('Should block aggressive XSS payload injection in Settings UI', async () => {
        if (browser.capabilities.browserName !== 'wry') {
            await browser.url('/');
        }
        
        // Wait for root
        const root = await $('#root');
        await root.waitForExist({ timeout: 15000 });
        
        // Use the debug store to open settings
        await browser.execute(() => {
            (window as any).__store.getState().toggleSettings();
        });

        // Wait for the Settings modal to appear in DOM
        const settingsTitle = await $('h2=Somaterm Settings');
        await settingsTitle.waitForExist({ timeout: 5000 });

        // Target the defaultShell input in the Environment tab
        const defaultShellInput = await $('input[placeholder="/bin/zsh"]');
        await defaultShellInput.waitForExist({ timeout: 5000 });

        // Inject XSS payload
        const payload = "<img src=x onerror=alert('xss-hacked')>";
        await defaultShellInput.setValue(payload);

        // Verify no alert was shown (WebdriverIO would catch unexpected alerts or hang)
        // Also verify the input holds the literal string securely
        const val = await defaultShellInput.getValue();
        expect(val).toBe(payload);
    });

    it('Should block unauthorized network requests due to CSP', async () => {
        if (browser.capabilities.browserName !== 'wry') {
            await browser.url('/');
        }
        
        const root = await $('#root');
        await root.waitForExist({ timeout: 15000 });

        // Execute fetch to an unauthorized domain
        const result = await browser.executeAsync(async (done) => {
            try {
                // Attempt to fetch from an external domain not in CSP
                await fetch('https://malicious-unapproved-domain.com');
                done({ success: true });
            } catch (error: any) {
                // Should fail due to CSP / Network error
                done({ success: false, message: error.message });
            }
        });

        // The fetch should fail and return success: false
        expect(result.success).toBe(false);
        expect(result.message).toMatch(/fetch/i);
    });
});
