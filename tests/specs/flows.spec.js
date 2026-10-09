// End-to-end checks of the product rules: build, validate, submit, approve, content-only edits,
// test send, monitor drill-down. One assertion per rule from CLAUDE.md.
const { test, expect } = require('@playwright/test');
const { open } = require('./helpers');

test('new journey → build → validate → submit → approve → content-only edit', async ({ page }) => {
  const errors = await open(page);
  // + New journey (modal) opens the editor with Event entry + Exit, v1 Draft
  await page.click('#btn-new-journey');
  await page.waitForTimeout(300);
  expect(await page.locator('.node').count()).toBe(2);
  await expect(page.locator('#sp-dm')).toBeVisible(); // contact list (datamart) sits in the Event entry panel
  await page.selectOption('#sp-dm', 'DM-3');
  await expect(page.locator('#crumb')).toContainText('PROSPECT DATAMART');
  await expect(page.locator('#valbar')).toHaveClass(/ok/);

  // "+" on the connection → Delivery with the channel default preselected
  await page.locator('.eplus').first().click();
  await page.locator('.menu.stepmenu button[data-type="delivery"]').click();
  await page.waitForTimeout(200);
  expect(await page.locator('.node').count()).toBe(3);
  await expect(page.locator('#valbar')).toHaveClass(/ok/);
  // channel cards switch the content to that channel's default
  await page.click('.chan-card:has-text("SMS")');
  await page.click('.jinfo .stepper button[data-sub="content"]');
  expect(await page.locator('#sp-content').inputValue()).toBe('s-generic-fr');
  await page.selectOption('#sp-content', '');
  await expect(page.locator('#valbar')).toHaveClass(/bad/);
  await expect(page.locator('button[data-act="v-submit"]')).toBeDisabled();
  await page.selectOption('#sp-content', 's-gift-fr');
  await expect(page.locator('#valbar')).toHaveClass(/ok/);
  await expect(page.locator('.preview')).toBeVisible();

  // Add next step from the panel → shuffle split; deleting it keeps the first path
  await page.click('button[data-act="add-next"]');
  await page.locator('.menu.stepmenu button[data-type="shuffleSplit"]').click();
  await page.waitForTimeout(200);
  expect(await page.locator('.node').count()).toBe(4);
  expect(await page.locator('.endmark').count()).toBe(1);
  await page.click('button[data-act="sh-even"]');
  await page.click('.jinfo .ph button[data-act="delete-step"]');
  await page.waitForTimeout(200);
  expect(await page.locator('.node').count()).toBe(3);

  // drag from the palette onto a connection
  await page.locator('#palette button[data-type="wait"]').dragTo(page.locator('.eplus').first());
  await page.waitForTimeout(200);
  expect(await page.locator('.node').count()).toBe(4);

  // submit (note) → pending (read-only); approver approves → active + locked
  await page.click('button[data-act="v-submit"]');
  await page.fill('#sub-note', 'V1 – smoke');
  await page.click('#sub-go');
  await expect(page.locator('.lockbar')).toContainText('Pending approval');
  await page.selectOption('#role-sel', 'approver');
  await page.click('button[data-act="v-viewChanges"]');
  await expect(page.locator('#modal-card')).toContainText('first activation');
  await page.click('#vc-approve');
  await expect(page.locator('.lockbar')).toContainText('Structure locked');
  expect(await page.locator('#palette').count()).toBe(0);
  expect(await page.locator('.eplus').count()).toBe(0);

  // Active: only the Delivery content choice is editable, and the change is logged
  await page.click('.node[data-id]:has-text("Delivery") rect.head');
  await page.click('.jinfo .stepper button[data-sub="create"]');
  await expect(page.locator('.chan-card:has-text("Email")')).toBeDisabled();
  await page.click('.jinfo .stepper button[data-sub="content"]');
  await expect(page.locator('#sp-content')).toBeEnabled();
  await page.selectOption('#sp-content', 's-generic-en');
  await page.click('.jinfo .stepper button[data-sub="details"]');
  await expect(page.locator('#sp-offer')).toBeDisabled();
  await page.click('button[data-act="history"]');
  await expect(page.locator('#modal-card')).toContainText('Content changed by Daniel Roy');
  await page.keyboard.press('Escape');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('approve pending v3: previous Active → Closing → Close; reject with comment', async ({ page }) => {
  const errors = await open(page, { role: 'approver' });
  await page.click('tr.row[data-jid="j-payment"] .t1');
  await page.waitForTimeout(300);
  await expect(page.locator('#vsel')).toHaveValue('pf3');
  await page.click('button[data-act="v-approve"]');
  await page.selectOption('#vsel', 'pf2');
  await expect(page.locator('#vbar .pill')).toHaveText('Closing');
  await page.click('button[data-act="v-close"]');
  await expect(page.locator('#vbar .pill')).toHaveText('Closed');
  // marketer copies v3 to v4, submits; approver rejects with a comment
  await page.selectOption('#vsel', 'pf3');
  await page.click('button[data-act="v-copy"]');
  await expect(page.locator('#vbar .pill')).toHaveText('Draft');
  await page.selectOption('#role-sel', 'marketer');
  await page.click('button[data-act="v-submit"]');
  await page.fill('#sub-note', 'V4 – test');
  await page.click('#sub-go');
  await page.selectOption('#role-sel', 'approver');
  await page.click('button[data-act="v-reject"]');
  await page.fill('#rej-c', 'Please shorten the subject');
  await page.click('#rej-go');
  await expect(page.locator('.rejectbar')).toContainText('Please shorten the subject');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('test send renders offer placeholders; monitor drills from a step to its contacts', async ({ page }) => {
  const errors = await open(page);
  await page.click('tr.row[data-jid="j-welcome"] .t1');
  await page.waitForTimeout(300);
  await page.click('button[data-act="test-send"]');
  await page.click('#ts-go');
  await expect(page.locator('#toast')).toContainText('Test Email sent');
  await expect(page.locator('#toast')).toContainText('+5 GB for 3 months');
  await page.click('.nav button[data-view="monitor"]');
  await page.click('button[data-act="m-tab"][data-arg="flow"]');
  await page.click('#mwrap .node[data-id="wl2-fr-wait"] rect.head');
  await expect(page.locator('#mc-step')).toHaveValue('wl2-fr-wait');
  const n = await page.locator('#mc-table tr.row').count();
  expect(n).toBeGreaterThan(0);
  await page.click('#mc-table tr.row');
  await expect(page.locator('.drawer')).toContainText('Where is');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('reset demo data discards session changes', async ({ page }) => {
  await open(page);
  await page.click('#btn-new-journey');
  await page.click('#btn-reset');
  await page.waitForTimeout(200);
  expect(await page.locator('#jl-tabs button[data-arg="draft"] .cnt').innerText()).toBe('1');
});
