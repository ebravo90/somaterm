import { expect, browser, $ } from '@wdio/globals'

describe('Ticket Reporter and Assignee Tests', () => {
    it('Should be able to set and view reporter and assignee for a ticket', async () => {
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
        
        // 2. Create a ticket programmatically with reporter and assignee
        await browser.execute(() => {
            (window as any).__store.getState().addKanbanTicket({
                title: 'Test Ticket Assignee',
                description: 'Testing reporter and assignee',
                status: 'Open',
                priority: 'High',
                type: 'Bug',
                reporter: 'Agent Qwen',
                assignee: 'Agent Gemini'
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

        // 4. Verify Reporter and Assignee appear in the full view
        const body = await $('body');
        await browser.waitUntil(
            async () => {
                const text = await body.getText();
                return text.includes('Agent Qwen') && text.includes('Agent Gemini');
            },
            { timeout: 5000, timeoutMsg: 'Reporter and/or Assignee did not appear in the full view' }
        );

        // 5. Test updating them
        await browser.execute((id) => {
            (window as any).__store.getState().updateKanbanTicket(id, {
                reporter: 'Human Orchestrator',
                assignee: 'Agent Qwen'
            });
        }, ticketId);

        await browser.waitUntil(
            async () => {
                const text = await body.getText();
                return text.includes('Human Orchestrator') && text.includes('Agent Qwen');
            },
            { timeout: 5000, timeoutMsg: 'Reporter and/or Assignee did not update correctly' }
        );
    });
});
