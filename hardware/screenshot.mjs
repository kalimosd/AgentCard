import { chromium } from 'playwright-core';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 800, height: 200 } });

await page.goto('http://localhost:4322/index.html');
await page.waitForTimeout(500);

for (const scene of ['working', 'approval', 'question', 'failed', 'done']) {
  await page.evaluate(s => { show(s); }, scene);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `screenshot-${scene}.png` });
  console.log(`captured: ${scene}`);
}

await browser.close();
