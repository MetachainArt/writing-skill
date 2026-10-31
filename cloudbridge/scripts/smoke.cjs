// 스모크 테스트: npm run build && npx vite preview --port 4173 실행 후  node scripts/smoke.cjs  (playwright 필요)
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  await page.goto('http://localhost:4173/', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/shots/01-landing.png' });
  await page.fill('#nick-input', '리도');
  await page.click('#enter-btn');
  await page.click('#time-btn');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/shots/02-world.png' });
  // walk toward star garden
  await page.keyboard.down('d'); await page.waitForTimeout(900); await page.keyboard.up('d');
  await page.keyboard.down('w'); await page.waitForTimeout(1200); await page.keyboard.up('w');
  await page.waitForTimeout(600);
  await page.screenshot({ path: '/tmp/shots/03-walk.png' });
  const interact = await page.evaluate(() => ({ hidden: document.querySelector('#interact-btn').hidden, label: document.querySelector('#interact-btn').textContent, zone: document.querySelector('#hud-zone').textContent }));
  console.log('interact:', JSON.stringify(interact));
  // open directory and go to a star
  await page.click('#dir-btn'); await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/shots/04-directory.png' });
  await page.click('.dir-item'); await page.waitForTimeout(1200);
  await page.screenshot({ path: '/tmp/shots/05-near-star.png' });
  const i2 = await page.evaluate(() => ({ hidden: document.querySelector('#interact-btn').hidden, label: document.querySelector('#interact-btn').textContent }));
  console.log('interact2:', JSON.stringify(i2));
  await page.keyboard.press('e'); await page.waitForTimeout(600);
  await page.screenshot({ path: '/tmp/shots/06-memorial-card.png' });
  await page.click('.offer[data-o=flower]'); await page.click('.offer[data-o=candle]'); await page.waitForTimeout(300);
  const counts = await page.$$eval('.offer em', (els) => els.map((e) => e.textContent));
  console.log('counts:', counts.join(','));
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  // night mode
  await page.click('#time-btn'); await page.click('#time-btn'); await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/shots/07-night.png' });
  await page.click('#time-btn'); await page.click('#time-btn'); await page.waitForTimeout(300);
  // create memorial + ceremony
  await page.click('#create-btn'); await page.waitForTimeout(400);
  await page.fill('input[name=name]', '두부');
  await page.click('.chip[data-id=cat]');
  await page.click('.swatch[data-c="#ffe680"]');
  await page.fill('input[name=born]', '2015-05-05');
  await page.fill('input[name=passed]', '2026-09-30');
  await page.fill('textarea[name=epitaph]', '두부야, 창가 햇빛은 네 거야.');
  await page.screenshot({ path: '/tmp/shots/08-create-form.png' });
  await page.click('#create-form button[type=submit]');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/shots/09-ceremony-bridge.png' });
  await page.waitForTimeout(6500);
  await page.screenshot({ path: '/tmp/shots/10-ceremony-arrive.png' });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: '/tmp/shots/11-after-ceremony.png' });
  const stored = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('cloudbridge.v1')); return { n: s.memorials.length, last: s.memorials[s.memorials.length-1].name }; });
  console.log('stored:', JSON.stringify(stored));
  // share link
  await page.evaluate(() => navigator.clipboard = undefined);
  const share = await page.evaluate(async () => { const m = JSON.parse(localStorage.getItem('cloudbridge.v1')).memorials.slice(-1)[0]; const mod = await import('/assets/' + [...document.scripts].map(s=>s.src).filter(Boolean)[0].split('/assets/')[1]); return 'ok'; }).catch(e => 'skip');
  console.log('errors:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
