import { expect, browser, $ } from '@wdio/globals'

describe('Ticket Comments Tests', () => {
    it('Should be able to add and view a comment in a ticket', async () => {
        if (browser.capabilities.browserName !== 'wry') {
            await browser.url('/');
        }
        
        const root = await $('#root');
        await root.waitForExist({ timeout: 15000 });

        // 1. Enable Kanban widget via store
        await browser.execute(() => {
            (window as any).__store.getState().toggleKanban?.(true);
            (window as any).__store.getState().setActiveWidget({ type: 'kanban' });
        });
        
        // 2. Create a ticket programmatically
        await browser.execute(() => {
            (window as any).__store.getState().addKanbanTicket({
                title: 'Test Ticket Comments',
                description: 'Testing comments functionality',
                status: 'Open',
                priority: 'High',
                type: 'Bug'
            });
        });

        // 3. Get ticket ID and open it
        const ticketId = await browser.execute(() => {
            const tickets = (window as any).__store.getState().kanbanMockTickets;
            return tickets[0].id;
        });

        await browser.execute((id) => {
            (window as any).__store.getState().selectKanbanTicket(id, 'full');
        }, ticketId);

        // 5. Verify Comments section is visible
        const body = await $('body');
        await browser.waitUntil(
            async () => (await body.getText()).includes('Comments'),
            { timeout: 5000, timeoutMsg: 'Comments section did not appear' }
        );

        // 6. Submit a new comment
        const commentInput = await $('textarea[placeholder="Add a comment..."]');
        await commentInput.waitForExist();
        await commentInput.setValue('This is a test comment from WDIO.');
        
        const sendBtn = await $('button=Send');
        await sendBtn.waitForClickable();
        await sendBtn.click();

        // 7. Verify comment appears
        await browser.waitUntil(
            async () => (await body.getText()).includes('This is a test comment from WDIO.'),
            { timeout: 5000, timeoutMsg: 'Comment did not appear in the list' }
        );

        // 8. Verify author is Human
        expect(await body.getText()).toContain('Human');
    });
});
