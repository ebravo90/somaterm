const { chromium } = require('playwright');
const { mockTauriIpc } = require('./tests/utils/mockIpc.ts');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => {
    console.log('PAGE ERROR MESSAGE:', error.message);
    console.log('PAGE ERROR STACK:', error.stack);
  });
  
  // mock ipc
  await page.addInitScript(mockTauriIpc);
  
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(3000);
  await browser.close();
})();
