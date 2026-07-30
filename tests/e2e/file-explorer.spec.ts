import { expect, browser, $ } from '@wdio/globals'

describe('File Explorer Widget Tests', () => {
    it('Should hide File Explorer toggle by default', async () => {
        if (browser.capabilities.browserName !== 'wry') {
            await browser.url('/');
        }
        
        const root = await $('#root');
        await root.waitForExist({ timeout: 15000 });

        const fileExplorerToggle = await $('button[title="Toggle File Explorer"]');
        expect(await fileExplorerToggle.isExisting()).toBe(false);
    });

    it('Should enable and display File Explorer, and verify UI properties', async () => {
        if (browser.capabilities.browserName !== 'wry') {
            await browser.url('/');
        }
        
        // 1. Open Settings
        await browser.execute(() => {
            (window as any).__store.getState().toggleSettings();
        });

        // Wait for Settings Modal to appear
        const settingsTitle = await $('h2=Somaterm Settings');
        await settingsTitle.waitForExist({ timeout: 5000 });

        // 2. Click on the IDE tab
        const ideTab = await $('button=IDE');
        await ideTab.click();

        // 3. Toggle the File Explorer toggle
        const toggleButton = await $('//div[contains(text(), "File Explorer")]/../../button[@role="switch"]');
        await toggleButton.waitForExist({ timeout: 5000 });
        await toggleButton.click();

        // 4. Verify the settings store was updated correctly
        const isEnabled = await browser.execute(() => {
            return (window as any).__settingsStore.getState().widgetsEnabled?.fileExplorer;
        });
        expect(isEnabled).toBe(true);

        // 5. Close settings
        await browser.execute(() => {
            (window as any).__store.getState().toggleSettings();
        });

        // 6. Verify dock icon is now visible
        const fileExplorerToggle = await $('button[title="Toggle File Explorer"]');
        await fileExplorerToggle.waitForExist({ timeout: 5000 });

        // 7. Click dock icon to open widget
        await fileExplorerToggle.click();

        // 8. Verify widget mounts
        const widgetTitle = await $('h2*=File Explorer');
        await widgetTitle.waitForExist({ timeout: 5000 });

        // 9. Wait for the file tree to load
        const workspaceNode = await $('span=Workspace');
        await workspaceNode.waitForExist({ timeout: 10000 });

        // 10. Verify that node_modules is NOT present (ignored directory)
        const nodeModulesNode = await $('span=node_modules');
        expect(await nodeModulesNode.isExisting()).toBe(false);
    });
});
