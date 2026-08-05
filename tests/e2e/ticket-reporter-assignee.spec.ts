import { browser, $ } from '@wdio/globals'

describe('Ticket Reporter and Assignee Tests', () => {
    it('Should be able to set and view reporter and assignee for a ticket', async () => {
        if (browser.capabilities.browserName !== 'wry') {
            await browser.url('/');
        }
        
        // Wait for React and Zustand store to be fully initialized
        await browser.waitUntil(
            async () => await browser.execute(() => typeof (window as any).__store !== 'undefined'),
            { timeout: 15000, timeoutMsg: 'Store was not initialized' }
        );

        // 1. Enable Kanban widget via store and add mock online agent
        await browser.execute(() => {
            (window as any).__store.getState().toggleKanban?.(true);
            (window as any).__store.getState().setActiveWidget({ type: 'kanban' });
            (window as any).__store.getState().setAgents([
                {
                    id: 'agent-1',
                    displayName: 'Local Llama 3',
                    modelName: 'llama3',
                    endpoint: 'http://localhost',
                    status: 'online',
                    type: 'local'
                }
            ]);
        });
        
        // 2. Create a ticket programmatically with reporter and assignee
        await browser.executeAsync((done) => {
            (window as any).__store.getState().addKanbanTicket({
                title: 'Test Ticket Assignee',
                description: 'Testing reporter and assignee',
                status: 'Open',
                priority: 'High',
                type: 'Bug',
                reporter: 'Human Orchestrator',
                assignee: 'Local Llama 3'
            }).then(() => done());
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
                return text.includes('Human Orchestrator') && text.includes('Local Llama 3');
            },
            { timeout: 5000, timeoutMsg: 'Reporter and/or Assignee did not appear in the full view' }
        );

        // 5. Test updating them
        await browser.executeAsync((id, done) => {
            (window as any).__store.getState().updateKanbanTicket(id, {
                reporter: 'Local Llama 3',
                assignee: 'Human Orchestrator'
            }).then(() => done());
        }, ticketId);

        await browser.waitUntil(
            async () => {
                const text = await body.getText();
                return text.includes('Local Llama 3') && text.includes('Human Orchestrator');
            },
            { timeout: 5000, timeoutMsg: 'Reporter and/or Assignee did not update correctly' }
        );
    });
});
