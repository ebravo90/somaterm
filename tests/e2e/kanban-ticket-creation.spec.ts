import { expect, browser, $ } from '@wdio/globals'

describe('Kanban Ticket Creation E2E', () => {
    it('Should successfully create a ticket via UI and render it', async () => {
        if (browser.capabilities.browserName !== 'wry') {
            await browser.url('/');
        }
        
        // Wait for React and Zustand store to be fully initialized
        await browser.waitUntil(
            async () => await browser.execute(() => typeof (window as any).__store !== 'undefined'),
            { timeout: 15000, timeoutMsg: 'Store was not initialized' }
        );

        // Enable Kanban widget via store
        await browser.execute(() => {
            (window as any).__store.getState().toggleKanban?.(true);
            (window as any).__store.getState().setActiveWidget({ type: 'kanban' });
        });

        // 1. Click New Ticket button
        const newTicketBtn = await $('button[title="Create Issue"]');
        await newTicketBtn.waitForExist();
        await newTicketBtn.click();

        // 2. Fill Title
        const titleInput = await $('input[placeholder="Ticket title..."]');
        await titleInput.waitForExist();
        await titleInput.setValue('E2E Generated Ticket');

        // 3. Select Ready status so it appears on the Board
        // The label is "Status", we can find the select nearby
        const statusSelect = await $('//label[text()="Status"]/following-sibling::select');
        await statusSelect.waitForExist();
        await statusSelect.selectByVisibleText('Ready');

        // 4. Submit Form
        const submitBtn = await $('button=Create Ticket');
        await submitBtn.waitForClickable();
        await submitBtn.click();

        // 5. Assert Ticket renders on board
        const body = await $('body');
        await browser.waitUntil(
            async () => (await body.getText()).includes('E2E Generated Ticket'),
            { timeout: 5000, timeoutMsg: 'Ticket title did not appear on the board' }
        );
    });
});
