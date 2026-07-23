import { test, expect } from '@playwright/test';
import { mockTauriIpc } from './utils/mockIpc';

test.describe('Agent UI Mock Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(mockTauriIpc);
    await page.goto('/');
    
    // Wait for terminal
    await page.waitForSelector('.xterm-helper-textarea', { timeout: 10000 }).catch(() => {});
    
    // Ensure Agent Sidebar is open
    const agentBtn = page.getByTitle('Toggle AI Agent');
    if (await agentBtn.isVisible()) {
        const isSelected = await agentBtn.getAttribute('aria-selected') === 'true' || await page.locator('.agent-widget-container').isVisible();
        if (!isSelected) {
            await agentBtn.click();
            await page.waitForTimeout(1000);
        }
    }
  });

  test('Test A: Kamikaze Execution & Button Parity', async ({ page }) => {
    // Intercept requests to the LLM API endpoint (e.g., Ollama/OpenAI)
    await page.route('**/api/chat', async route => {
      const json = {
        role: 'assistant',
        content: `Here is the solution:
        
\`\`\`bash
echo "Hello from Bash"
\`\`\`

And the python equivalent:

\`\`\`python
print("Hello from Python")
\`\`\`
`
      };
      await route.fulfill({ json });
    });

    // Simulate the user extracting terminal text via the Kamikaze shortcut
    // We can simulate this by directly invoking the store's sendMessage or triggering the global shortcut
    await page.evaluate(() => {
      const store = (window as any).__store;
      store.getState().sendMessage("How do I print hello?");
    });

    // Wait for the mocked response to render
    await page.waitForTimeout(1500);

    // Assert that the UI correctly renders a blue "Run in Terminal" button for the bash block
    const runBtn = page.locator('button:has-text("Run in Terminal")').first();
    await expect(runBtn).toBeVisible();
    await expect(runBtn).toHaveClass(/bg-blue-600/);

    // Assert a gray "Copy" button for the Python block
    const copyBtn = page.locator('button:has-text("Copy")').nth(1); // the python block copy button (index 1 if there's a global one, or nth(0) in code block)
    await expect(copyBtn).toBeVisible();
    await expect(copyBtn).toHaveClass(/bg-zinc-700/);
  });

  test('Test B: Scroll Anchoring Preservation', async ({ page }) => {
    // Inject a very long mock response (multiple paragraphs) to force scroll overflow
    await page.evaluate(() => {
      const store = (window as any).__store;
      const longText = Array(50).fill("This is a very long paragraph intended to cause a vertical scroll overflow in the chat widget container. We need to ensure that the user can scroll without native jumping.").join('\\n\\n');
      
      const activeSession = store.getState().sessions.find((s: any) => s.id === store.getState().activeSessionId);
      if (activeSession) {
        store.getState().updateSession(activeSession.id, {
          messages: [
            { role: 'user', content: 'Tell me a long story', meta: { timestamp: Date.now() } },
            { role: 'assistant', content: longText, meta: { timestamp: Date.now() } }
          ]
        });
      }
    });

    await page.waitForTimeout(1000);

    // Scroll to the bottom of the chat
    const scrollContainer = page.locator('.overflow-y-auto').filter({ hasText: 'Tell me a long story' }).first();
    await scrollContainer.evaluate(node => {
      node.scrollTop = node.scrollHeight;
    });

    // Wait for any smooth scrolling to finish
    await page.waitForTimeout(500);

    // Capture the scrollTop before focus change
    const initialScrollTop = await scrollContainer.evaluate(node => node.scrollTop);

    // Click a terminal instance to trigger a focus change
    await page.locator('.xterm-helper-textarea').first().click();
    await page.waitForTimeout(500); // give time for any rogue state updates

    // Assert that the scrollTop of the chat container remains identical
    const finalScrollTop = await scrollContainer.evaluate(node => node.scrollTop);
    expect(finalScrollTop).toBe(initialScrollTop);
  });
});
