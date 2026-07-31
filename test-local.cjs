const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER_CONSOLE:', msg.text()));
  
  await page.goto('http://127.0.0.1:5173/');
  
  // Wait for React to load
  await page.waitForTimeout(2000);
  
  // Expose store to window if not already
  await page.evaluate(() => {
    window.__store.getState().toggleSettings();
  });
  
  await page.waitForTimeout(1000);
  await page.click('button:has-text("IDE")');
  await page.waitForTimeout(500);
  
  // Toggle File Explorer
  await page.click('//div[contains(text(), "File Explorer")]/../../button[@role="switch"]');
  await page.waitForTimeout(500);
  
  // Close settings
  await page.evaluate(() => {
    window.__store.getState().toggleSettings();
  });
  await page.waitForTimeout(1000);
  
  // Open widget
  await page.evaluate(() => {
    window.__store.getState().setActiveWidget({ type: 'file_explorer' });
  });
  
  await page.waitForTimeout(2000);
  
  console.log("Checking for src...");
  const srcTauri = await page.$('span:has-text("src")');
  if (srcTauri) {
    console.log("Found src, clicking it...");
    // click the parent div
    await srcTauri.evaluate(el => el.parentElement.click());
    
    await page.waitForTimeout(3000);
    
    const html = await page.evaluate(() => document.querySelector('.overflow-y-auto').innerHTML);
    console.log("HTML AFTER CLICK:", html);
    
    await page.screenshot({ path: 'check_react_errors_' + Date.now() + '.webp' });
  } else {
    console.log("src not found!");
  }
  
  await browser.close();
})();
