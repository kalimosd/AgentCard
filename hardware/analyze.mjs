import { chromium } from 'playwright-core';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 800, height: 200 } });

for (const scene of ['working', 'approval', 'question', 'failed', 'done']) {
  await page.goto(`http://localhost:4322/index.html?${scene}`);
  await page.waitForTimeout(600);

  const layout = await page.evaluate(() => {
    const strip = document.querySelector('.strip');
    const stripRect = strip.getBoundingClientRect();
    const el = sel => { const e = document.querySelector(sel); if (!e) return null;
      const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height),
        x: Math.round(r.x), y: Math.round(r.y), text: (e.textContent || '').slice(0, 40) }; };
    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      strip: { w: Math.round(stripRect.width), h: Math.round(stripRect.height) },
      mascot: el('.mascot'), action: el('.action'),
      right: el('.right'), question: el('.question-panel'),
      intervention: el('.intervention-compact'), metrics: el('.metrics')
    };
  });

  console.log(`\n=== ${scene} ===`);
  console.log(`viewport: ${layout.viewport.w}×${layout.viewport.h}`);
  console.log(`strip:    ${layout.strip.w}×${layout.strip.h}`);
  ['mascot','action','right','question','intervention','metrics'].forEach(k => {
    if (layout[k]) console.log(`${k.padEnd(13)}: ${layout[k].w}×${layout[k].h}  pos(${layout[k].x},${layout[k].y})  "${layout[k].text}"`);
  });
  const isClipped = (el) => el && (el.x + el.w > layout.viewport.w || el.y + el.h > layout.viewport.h);
  const clipped = ['mascot','action','right','question','intervention','metrics'].filter(k => isClipped(layout[k]));
  if (clipped.length) console.log(`⚠ CLIPPED: ${clipped.join(', ')}`);
}

await browser.close();
