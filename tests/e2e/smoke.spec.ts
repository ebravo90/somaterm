import { expect } from '@wdio/globals'

describe('Somaterm Smoke Test', () => {
    it('Launches application and renders react app', async () => {
        // If not running natively on tauri wry, we need to load the dev URL
        if (browser.capabilities.browserName !== 'wry') {
            await browser.url('/');
        }
        
        // Wait for the root element of the React app to be present
        const root = await $('#root');
        await root.waitForExist({ timeout: 15000 });
        
        const title = await browser.getTitle();
        expect(title.toLowerCase()).toBe('somaterm');
    });
});
