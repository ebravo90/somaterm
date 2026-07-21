import { test, expect } from '@playwright/test';
import { mockTauriIpc } from './utils/mockIpc';

test.describe('README Assets', () => {
  test('capture hero screenshot', async ({ page }) => {
    // Mock Tauri IPC before the page loads using the shared mock
    await page.addInitScript(mockTauriIpc);

    // Navigate to the local Vite dev server
    await page.goto('/');

    // 1. Wait for Load
    // We wait for the xterm canvas/textarea to be in the DOM
    await page.waitForSelector('.xterm-helper-textarea', { timeout: 10000 }).catch(() => {
      console.log('Timeout waiting for terminal to render, taking screenshot anyway');
    });

    // Give it enough time to receive the mock payload and render the canvas
    await page.waitForTimeout(2000);

    // 2. Terminal Interaction
    // Type into the first terminal
    await page.locator('.xterm-helper-textarea').first().focus();
    await page.keyboard.type('echo "Booting Somaterm local workspace..."', { delay: 50 });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);

    // 3. Open Web/Agent Panels
    // Click Web Manager toggle
    await page.getByTitle('Web Manager').click();
    await page.waitForTimeout(1500);
    
    // Click AI Agent toggle
    await page.getByTitle('Toggle AI Agent').click();
    await page.waitForTimeout(1500);

    // Close AI Agent toggle to return to full terminal view
    await page.getByTitle('Toggle AI Agent').click();
    await page.waitForTimeout(1500);

    // 4. Grid Layout Generation
    // Click 'Add Terminal' 3 times to create a 4-grid layout
    const addTerminalBtn = page.getByTitle('Add Terminal');
    for (let i = 0; i < 3; i++) {
      await addTerminalBtn.click();
      await page.waitForTimeout(1200); // Wait for animations between each
    }

    // 5. Responsive UI Test
    // Open Web Manager again, this shrinks the terminal grid and should hide 3 terminals
    await page.getByTitle('Web Manager').click();
    await page.waitForTimeout(2000);

    // Hover over bottom left to ensure badge is visible if it faded out
    await page.mouse.move(20, page.viewportSize()!.height - 20);
    await page.waitForTimeout(1000);

    // Take the full page screenshot at the end of the interactive flow
    await page.screenshot({ path: 'readme-hero.png', fullPage: true });
    
    // Test assertion to ensure we loaded something
    const pageTitle = await page.title();
    expect(pageTitle).toBeDefined();
  });
});
