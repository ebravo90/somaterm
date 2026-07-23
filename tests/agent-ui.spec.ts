import { test, expect } from '@playwright/test';
import { mockTauriIpc } from './utils/mockIpc';

test.describe('Agent UI Mock Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(mockTauriIpc);
    await page.goto('/');
    // Wait for terminal
    await page.waitForSelector('.xterm-helper-textarea', { timeout: 10000 }).catch(() => {});
    
    await page.evaluate(() => {
      const store = (window as any).__store;
      if (store) store.getState().setActiveWidget({ type: 'agent' });
    });
    await page.waitForTimeout(500);
  });

  test('Test A: Kamikaze Execution & Button Parity', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    // Simulate the user receiving terminal text from the LLM
    await page.evaluate(() => {
      const store = (window as any).__store;
      
      let sessionId = store.getState().activeSessionId;
      if (!sessionId) {
        sessionId = store.getState().createSession(store.getState().selectedAgentId);
        store.getState().setActiveSession(sessionId);
      }

      store.getState().updateSession(sessionId, {
        messages: [
          { role: 'user', content: 'Show me bash and python code' },
          { 
            role: 'assistant', 
            content: `Here is the solution:\n\n\`\`\`bash\necho "Hello from Bash"\n\`\`\`\n\nAnd the python equivalent:\n\n\`\`\`python\nprint("Hello from Python")\n\`\`\`` 
          }
        ]
      });
    });

    // Wait for the mocked response to render
    await page.waitForTimeout(1500);

    // Assert that the UI correctly renders a blue "Run in Terminal" button for the bash block
    const runBtn = page.locator('button:has-text("Run in Terminal")').first();
    await expect(runBtn).toBeVisible();
    await expect(runBtn).toHaveClass(/bg-blue-600/);

    // Assert a gray "Copy" button for the Python block
    const copyBtn = page.locator('button:has-text("Copy")').nth(0); // the python block copy button (index 0 in code block)
    await expect(copyBtn).toBeVisible();
    await expect(copyBtn).toHaveClass(/bg-zinc-700/);
  });

  test('Test B: Scroll Anchoring Preservation', async ({ page }) => {
    const agentBtn = page.locator('button[title="AI Agent"]').first();
    if (!await page.locator('.flex-1.overflow-y-auto').isVisible()) {
        await agentBtn.click();
        await page.waitForTimeout(500);
    }

    // Inject a very long mock response (multiple paragraphs) to force scroll overflow
    await page.evaluate(() => {
      const store = (window as any).__store;
      const longText = Array(50).fill("This is a very long paragraph intended to cause a vertical scroll overflow in the chat widget container. We need to ensure that the user can scroll without native jumping.").join('\\n\\n');
      
      let sessionId = store.getState().activeSessionId;
      if (!sessionId) {
        sessionId = store.getState().createSession(store.getState().selectedAgentId);
        store.getState().setActiveSession(sessionId);
      }
      
      store.getState().updateSession(sessionId, {
        messages: [
          { role: 'user', content: 'Tell me a long story' },
          { role: 'assistant', content: longText }
        ]
      });
    });

    await page.waitForTimeout(1000);

    // Scroll to the bottom of the chat
    const scrollContainer = page.locator('.flex-1.overflow-y-auto').first();
    try {
      await expect(scrollContainer).toBeVisible({ timeout: 2000 });
    } catch (e) {
      const html = await page.evaluate(() => document.body.innerHTML);
      console.log('DOM DUMP:', html);
      throw e;
    }
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
