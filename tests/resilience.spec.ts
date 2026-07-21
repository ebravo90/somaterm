import { test, expect } from '@playwright/test';
import { mockTauriIpc } from './utils/mockIpc';

test.describe('UI Resilience & Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(mockTauriIpc);
    await page.goto('/');
    // Wait for initial render
    await page.waitForSelector('.xterm-helper-textarea', { timeout: 10000 });
  });

  test('Test A: Process Lifecycle Protection (Zombie Killer)', async ({ page }) => {
    // Add a second terminal so the close button appears on the first one
    await page.getByTitle('Add Terminal').click();
    await page.waitForTimeout(500);

    // Force the first terminal to have an active process via the exposed Zustand store
    await page.evaluate(() => {
      const store = (window as any).__store;
      store.setState({
        terminals: store.getState().terminals.map((t: any, i: number) => i === 0 ? { ...t, activeProcess: true } : t)
      });
    });

    // We must handle the dialog to verify it appears and to dismiss it
    let dialogAppeared = false;
    page.once('dialog', async dialog => {
      dialogAppeared = true;
      expect(dialog.message()).toContain('Process is still running');
      await dialog.dismiss();
    });
    
    // Click the close button for the first terminal (it should be visible now)
    await page.getByTitle('Close Terminal').first().click();

    // The dialog should have appeared
    expect(dialogAppeared).toBe(true);

    // The terminal should still be in the DOM because we canceled the dialog
    const terminalCount = await page.locator('.xterm-helper-textarea').count();
    expect(terminalCount).toBe(2);
  });

  test('Test B: Terminal Limit Stress (Spam Shield)', async ({ page }) => {
    const addTerminalBtn = page.getByTitle('Add Terminal');
    
    // Spam the add button 6 times
    for (let i = 0; i < 6; i++) {
      // The button disappears after 4 terminals, but we try clicking it fast
      if (await addTerminalBtn.isVisible()) {
        await addTerminalBtn.click({ force: true }).catch(() => {});
      }
    }

    // Wait a moment for animations
    await page.waitForTimeout(1000);

    // Verify exactly 4 terminals were spawned (the max)
    const terminalCount = await page.locator('.xterm-helper-textarea').count();
    expect(terminalCount).toBe(4);
  });

  test('Test C: Responsive Collapse Resilience', async ({ page }) => {
    // Set viewport small enough so that 66.6% split is < 600px
    await page.setViewportSize({ width: 800, height: 800 });

    // 1. Generate max 4-terminal grid layout
    const addTerminalBtn = page.getByTitle('Add Terminal');
    for (let i = 0; i < 3; i++) {
      await addTerminalBtn.click();
      await page.waitForTimeout(500);
    }
    expect(await page.locator('.xterm-helper-textarea').count()).toBe(4);

    // 2. Open Web Manager side panel
    await page.getByTitle('Web Manager').click();
    await page.waitForTimeout(1000);

    // Ensure some terminals are hidden now
    const badge = page.locator('text=/hidden/');
    await expect(badge).toBeVisible();

    // 3. Programmatically close the 4th (hidden) terminal
    await page.evaluate(async () => {
      const store = (window as any).__store;
      const state = store.getState();
      const lastTerminalId = state.terminals[3].id;
      // Need to bypass the activeProcess check since we want to forcefully close
      await state.closeTerminal(lastTerminalId);
    });
    await page.waitForTimeout(1000);

    // 4. Close Web Manager side panel
    await page.getByTitle('Web Manager').click();
    await page.waitForTimeout(1500);

    // 5. Assert grid restored to exactly 3 terminals
    const terminalCount = await page.locator('.xterm-helper-textarea').count();
    expect(terminalCount).toBe(3);

    // Ensure the hidden badge is gone
    await expect(page.locator('text=/hidden/')).toBeHidden();
  });
});
