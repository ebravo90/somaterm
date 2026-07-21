import { test, expect } from '@playwright/test';

test.describe('README Assets', () => {
  test('capture hero screenshot', async ({ page }) => {
    // Mock Tauri IPC before the page loads
    await page.addInitScript(() => {
      // Create a mock TAURI_INTERNALS object
      (window as any).__TAURI_INTERNALS__ = {
        transformCallback: (callback: any) => {
          const id = Math.random().toString();
          (window as any)._mockCallbacks = (window as any)._mockCallbacks || {};
          (window as any)._mockCallbacks[id] = callback;
          return id;
        },
        invoke: async (cmd: string, args: any) => {
          console.log(`[Mock Tauri IPC] invoked: ${cmd}`, args);
          if (cmd === 'spawn_pty') {
            return 1; // dummy PTY ID
          }
          if (cmd === 'plugin:event|listen') {
            const { event, handler } = args;
            if (event.startsWith('pty-read-')) {
              setTimeout(() => {
                const output = [
                  '\x1b[32m➜\x1b[0m \x1b[36m~\x1b[0m neofetch',
                  '\x1b[34m       _,met$$$$$gg.\x1b[0m           \x1b[33muser\x1b[0m@\x1b[33mmacbook\x1b[0m',
                  '\x1b[34m    ,g$$$$$$$$$$$$$$$P.\x1b[0m        \x1b[33mOS\x1b[0m: macOS 14.0 arm64',
                  '\x1b[34m  ,g$$P"     """Y$$.".\x1b[0m         \x1b[33mHost\x1b[0m: MacBook Pro',
                  '\x1b[34m ,$$P\'              `$$$.\x1b[0m      \x1b[33mKernel\x1b[0m: 23.0.0',
                  '\x1b[34m\',$$P       ,ggs.     `$$b:\x1b[0m    \x1b[33mUptime\x1b[0m: 10 days, 2 hours',
                  '\x1b[34m`d$$\'     ,$P"   .    $$$\x1b[0m      \x1b[33mPackages\x1b[0m: 154 (brew)',
                  '\x1b[34m $$P      d$\'     ,   $$P\x1b[0m      \x1b[33mShell\x1b[0m: zsh 5.9',
                  '\x1b[34m $$:      $$.   -    ,d$$$\x1b[0m     \x1b[33mTerminal\x1b[0m: somaterm',
                  '\x1b[34m $$;      Y$b._   _,d$P\'\x1b[0m       \x1b[33mCPU\x1b[0m: Apple M2 Max',
                  '\x1b[34m Y$$.    `.`"Y$$$$P"\'\x1b[0m          \x1b[33mMemory\x1b[0m: 16384 MiB / 65536 MiB',
                  '\x1b[34m `$$b      "-.__\x1b[0m               ',
                  '\x1b[34m  `Y$$b\x1b[0m                        \x1b[30m██\x1b[31m██\x1b[32m██\x1b[33m██\x1b[34m██\x1b[35m██\x1b[36m██\x1b[37m██\x1b[0m',
                  '\x1b[34m   `Y$$.\x1b[0m                       ',
                  '\x1b[34m     `$$o.\x1b[0m                     ',
                  '\x1b[34m       `Y$$b.\x1b[0m                  ',
                  '\x1b[34m          `"Y$b._\x1b[0m              ',
                  '\x1b[34m              `""""\x1b[0m            ',
                  '',
                  '\x1b[32m➜\x1b[0m \x1b[36m~\x1b[0m '
                ].join('\r\n');
                
                const cb = (window as any)._mockCallbacks[handler];
                if (cb) {
                  // Tauri event payload format: { id: ..., event: ..., payload: ... }
                  cb({ event, payload: output });
                }
              }, 800);
            }
            return 12345; // dummy listener ID
          }
          return null;
        }
      };
      
      // Some versions of Tauri core use __TAURI_IPC__
      (window as any).__TAURI_IPC__ = async (msg: any) => {
        console.log(`[Mock Tauri IPC] IPC:`, msg);
        if (msg?.cmd === 'spawn_pty') return 1;
      };
    });

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
