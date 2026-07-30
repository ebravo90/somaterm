import { expect } from '@wdio/globals'

describe('Storage Security Test', () => {
    it('Should not expose any sensitive keys in plain-text localStorage', async () => {
        // If not running natively on tauri wry, we need to load the dev URL
        if (browser.capabilities.browserName !== 'wry') {
            await browser.url('/');
        }
        
        // Wait for the root element of the React app to be present
        const root = await $('#root');
        await root.waitForExist({ timeout: 15000 });
        
        // Retrieve localStorage keys via browser execute
        const storageKeys = await browser.execute(() => {
            return Object.keys(window.localStorage);
        });

        // Filter out known safe/internal keys (like Vite dev keys)
        // Ensure no sensitive app keys (like 'settings', 'auth', 'vault') are present
        const sensitiveKeys = storageKeys.filter(k => k.toLowerCase().includes('setting') || k.toLowerCase().includes('auth') || k.toLowerCase().includes('vault'));

        // Assert that we are not storing things in localStorage
        // We enforce the usage of tauri-plugin-store instead
        expect(sensitiveKeys.length).toBe(0);
    });
});
