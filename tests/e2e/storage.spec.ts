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
        
        // Retrieve localStorage length via browser execute
        const storageLength = await browser.execute(() => {
            return window.localStorage.length;
        });

        // Assert that we are not storing things in localStorage
        // We enforce the usage of tauri-plugin-store instead
        expect(storageLength).toBe(0);
    });
});
