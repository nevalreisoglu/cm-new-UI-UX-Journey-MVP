// Opens every view at 1280 and 1440 px, menu open and collapsed, checks for console errors and
// writes reference screenshots to tests/screenshots/. Look at the screenshots — they catch what
// the console does not.
const { test, expect } = require('@playwright/test');
const { open } = require('./helpers');
const path = require('path');
const shot = (name, w) => path.resolve(__dirname, '..', 'screenshots', `${name}-${w}.png`);

for (const width of [1280, 1440]) {
  test(`views render without errors at ${width}`, async ({ page }) => {
    const errors = await open(page, { width });
    await page.screenshot({ path: shot('journey-list', width) });
    await page.click('tr.row[data-jid="j-abandon"] .t1');
    await page.waitForTimeout(300);
    await page.click('.node[data-id="ab14-fr-email"] rect.head');
    await page.screenshot({ path: shot('editor-active', width) });
    await page.click('.nav button[data-view="journeys"]');
    await page.click('#jl-tabs button[data-arg="draft"]');
    await page.click('tr.row[data-jid="j-planchange"] .t1');
    await page.waitForTimeout(300);
    await page.click('.node[data-id="pc-email"] rect.head');
    await page.screenshot({ path: shot('editor-draft', width) });
    await page.selectOption('#role-sel', 'approver');
    await page.click('.nav button[data-view="journeys"]');
    await page.click('#jl-tabs button[data-arg="pending"]');
    await page.click('tr.row[data-jid="j-payment"] .t1');
    await page.waitForTimeout(300);
    await page.click('button[data-act="v-viewChanges"]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: shot('view-changes', width) });
    await page.keyboard.press('Escape');
    await page.click('.nav button[data-view="monitor"]');
    await page.selectOption('#msel', 'j-welcome');
    await page.screenshot({ path: shot('monitor-overview', width) });
    await page.click('button[data-act="m-tab"][data-arg="flow"]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: shot('monitor-flow', width) });
    await page.click('#mwrap .node[data-id="wl2-fr-wait"] rect.head');
    await page.click('#mc-table tr.row');
    await page.waitForTimeout(300);
    await page.screenshot({ path: shot('monitor-contact', width) });
    await page.keyboard.press('Escape');
    await page.click('#btn-nav');
    await page.waitForTimeout(250);
    await page.screenshot({ path: shot('monitor-menu-collapsed', width) });
    expect(errors, errors.join('\n')).toEqual([]);
  });
}
