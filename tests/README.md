# Tests

Playwright checks for the prototype. They open `index.html` over `file://`, so there is nothing
to build or serve.

```bash
cd tests && npm install && npx playwright install chromium && npm test
```

- `specs/views.spec.js` — opens every screen at 1280 and 1440 px (menu open and collapsed),
  fails on any console error and writes `screenshots/<view>-<width>.png`. Look at them.
- `specs/flows.spec.js` — the product rules end to end: new journey, add steps (menu, panel,
  drag), validation blocks Submit, approve → previous Active goes Closing, reject with comment,
  content-only edit on an Active version is logged, test send, monitor drill-down, reset.

If Chromium is already installed elsewhere, point to it with `PLAYWRIGHT_CHROMIUM=/path/to/chromium`.
