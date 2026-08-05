import { expect, browser, $ } from '@wdio/globals'

describe('Ticket History Log Tests', () => {
    it('Should log history events when a ticket is created and updated', async () => {
        if (browser.capabilities.browserName !== 'wry') {
            await browser.url('/');
        }
        
        // Wait for React and Zustand store to be fully initialized
        await browser.waitUntil(
            async () => await browser.execute(() => typeof (window as any).__store !== 'undefined'),
            { timeout: 15000, timeoutMsg: 'Store was not initialized' }
        );

        // 1. Enable Kanban widget via store
        await browser.execute(() => {
            (window as any).__store.getState().toggleKanban?.(true);
            (window as any).__store.getState().setActiveWidget({ type: 'kanban' });
        });

        // 2. Create a ticket programmatically
        await browser.executeAsync((done) => {
            (window as any).__store.getState().addKanbanTicket({
                title: 'History Test Ticket',
                description: 'Testing history log',
                status: 'Open',
                priority: 'High',
                type: 'Bug'
            }).then(() => done());
        });

        // 3. Update the ticket
        const ticketId = await browser.execute(() => {
            const tickets = (window as any).__store.getState().kanbanMockTickets;
            return tickets[0].id;
        });

        await browser.executeAsync((id, done) => {
            (window as any).__store.getState().updateKanbanTicket(id, {
                status: 'In Progress'
            }).then(() => done());
        }, ticketId);

        // 4. Verify the state has the history events
        const historyLength = await browser.execute((id) => {
            const tickets = (window as any).__store.getState().kanbanMockTickets;
            const ticket = tickets.find((t: any) => t.id === id);
            return ticket.history.length;
        }, ticketId);

        // 1 for creation, 1 for status update = 2 events
        expect(historyLength).toBe(2);

        // 5. Open the ticket in the UI and verify the History section
        await browser.execute((id) => {
            (window as any).__store.getState().selectKanbanTicket(id, 'full');
        }, ticketId);

        // Verify the history header is visible by just waiting for any text indicating history
        const body = await $('body');
        await browser.waitUntil(
            async () => (await body.getText()).includes('History'),
            { timeout: 5000, timeoutMsg: 'History text did not appear' }
        );

        // Verify the history events text
        const historyText = await body.getText();
        expect(historyText).toContain('Ticket Created');
        expect(historyText).toContain('Changed status from Open');
    });
});
