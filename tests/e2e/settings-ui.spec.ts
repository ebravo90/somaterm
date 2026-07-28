import { expect } from '@wdio/globals';

describe('Settings UI Tests', () => {
    it('Should toggle useSystemPath and update the Zustand store', async () => {
        if (browser.capabilities.browserName !== 'wry') {
            await browser.url('/');
        }
        
        const root = await $('#root');
        await root.waitForExist({ timeout: 15000 });
        
        // Open the Settings modal
        await browser.execute(() => {
            (window as any).__store.getState().toggleSettings();
        });

        // Wait for the Settings modal to appear
        const settingsTitle = await $('h2=Somaterm Settings');
        await settingsTitle.waitForExist({ timeout: 5000 });

        // Ensure we are on the Environment tab
        const envTab = await $('button=Environment');
        await envTab.click();

        // The Toggle component for "Use System PATH" is next to the text. Let's find it.
        // We can find the button that has role="switch" inside the same flex container as "Use System PATH".
        const toggleSwitch = await $('//div[contains(text(), "Use System PATH")]/parent::div/following-sibling::button[@role="switch"]');
        await toggleSwitch.waitForExist({ timeout: 5000 });

        // Get initial state from Zustand store
        const initialState = await browser.execute(() => {
            return (window as any).__settingsStore.getState().useSystemPath;
        });

        // We can check the DOM attribute to see if it's currently checked
        const isCurrentlyChecked = await toggleSwitch.getAttribute('aria-checked') === 'true';

        // Click the toggle switch
        await toggleSwitch.click();

        // Wait for the DOM attribute to update
        await browser.waitUntil(async () => {
            const newChecked = await toggleSwitch.getAttribute('aria-checked') === 'true';
            return newChecked !== isCurrentlyChecked;
        }, { timeout: 5000, timeoutMsg: 'Toggle did not update visually' });

        // Verify the toggle changed in the UI
        const finalChecked = await toggleSwitch.getAttribute('aria-checked') === 'true';
        expect(finalChecked).toBe(!isCurrentlyChecked);

        // Verify the Zustand state updated
        const finalState = await browser.execute(() => {
            return (window as any).__settingsStore.getState().useSystemPath;
        });
        expect(finalState).toBe(!initialState);
    });
});
