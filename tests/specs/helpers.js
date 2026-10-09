const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '..', '..', 'index.html');
/** open the prototype and collect console / page errors */
async function open(page, { width = 1440, role } = {}) {
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.setViewportSize({ width, height: 860 });
  await page.goto(URL);
  if (role) await page.selectOption('#role-sel', role);
  await page.waitForTimeout(200);
  return errors;
}
module.exports = { open, URL };
