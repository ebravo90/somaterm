import { expect } from '@wdio/globals'

describe('Somaterm Smoke Test', () => {
    it('Launches application and renders react app', async () => {
        // If not running natively on tauri wry, we need to load the dev URL
        if (browser.capabilities.browserName !== 'wry') {
            await browser.url('/');
        }
        
        // Wait for the root element of the React app to be present
        // Wait for React and Zustand store to be fully initialized
        await browser.waitUntil(
            async () => await browser.execute(() => typeof (window as any).__store !== 'undefined'),
            { timeout: 15000, timeoutMsg: 'Store was not initialized' }
        );
        
        const title = await browser.getTitle();
        expect(title.toLowerCase()).toBe('somaterm');
    });
});
