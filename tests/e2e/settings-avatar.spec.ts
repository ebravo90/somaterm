import { expect, browser, $ } from '@wdio/globals';

describe('Settings Avatar Tests', () => {
    beforeEach(async () => {
        await browser.url('/');
        
        // Wait for store initialization
        await browser.waitUntil(
            async () => await browser.execute(() => typeof (window as any).__store !== 'undefined'),
            { timeout: 5000, timeoutMsg: 'Store not initialized' }
        );

        // Open Kanban view
        await browser.execute(() => {
            (window as any).__store.getState().setActiveWidget({ type: 'kanban' });
        });
    });

    it('Should navigate to Settings view and update the userAvatar store', async () => {
        // Wait for board to be visible
        const board = await $('.w-full.h-full.flex.flex-col');
        await board.waitForExist({ timeout: 5000 });
        
        // Click Settings button
        const settingsBtn = await $('button[title="Settings"]');
        await settingsBtn.waitForClickable();
        await settingsBtn.click();
        
        // Verify Settings view is displayed
        const settingsHeader = await $('h2=Settings');
        await settingsHeader.waitForExist({ timeout: 2000 });
        
        const userProfileHeader = await $('h3=User Profile');
        expect(await userProfileHeader.isExisting()).toBe(true);
        
        // Update avatar programmatically (file uploads can be flaky via UI in some drivers without standard input)
        await browser.execute(() => {
            (window as any).__store.getState().setUserAvatar('test-avatar-data-uri');
        });
        
        // Verify the store updated
        const avatarVal = await browser.execute(() => {
            return (window as any).__store.getState().userAvatar;
        });
        expect(avatarVal).toBe('test-avatar-data-uri');
        
        // Remove button should appear since avatar exists
        const removeBtn = await $('button=Remove');
        await removeBtn.waitForExist();
        await removeBtn.click();
        
        // Verify store is cleared
        const clearedAvatarVal = await browser.execute(() => {
            return (window as any).__store.getState().userAvatar;
        });
        expect(clearedAvatarVal).toBe('');
    });
});
