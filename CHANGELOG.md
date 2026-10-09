# Changelog

## v0.4 — connectors
- Orthogonal connectors (trunk → spine → branch) with label pills, fixed column / row spacing,
  hover-only "+" on connections, ghost "+ Add step" cards on open paths, selected path
  highlighted in the CTA colour; ports, card "+" and connector "×" removed. Zoom label fixed.
- Playwright screenshots of the abandonment journey in both orientations.

## v0.3 — review round
- Free positioning in Drafts, × on cards, lock hint; "+ New journey" opens the editor directly;
  contact list = an existing datamart; node cards edit their key settings inline; one Wait step
  with Duration (+ send window) / Until / For event / For segment match; order_completed event.
- Removable connections (×), parallel branches, drag-to-connect from the orange out port; the
  "+" on a connection inserts in sequence, the "+" on a card adds a branch (open path first,
  otherwise parallel) — no In sequence / Parallel toggle.

## v0.2 — journey list, editor, versions, monitor, tests
- Journey list with status tabs, filters, row actions and the New journey modal.
- Editor: SVG auto-layout canvas, palette, "+" on connections, step panels, validation,
  version bar from `VERSION_TRANSITIONS`, structure lock (`canEdit`), Journey settings, Test
  send, View changes.
- Journey Monitor: Overview, Flow with stats, Contacts, contact panel.
- Playwright checks in `tests/` (views at 1280 / 1440 px, product-rule flows).

## v0.1 — shell and mock data (single-file rebuild)
- `index.html` replaces the React build: CSS copied from CM-New-UI-UX2, the same shell
  (top bar, left menu, breadcrumb, footer), Role view (Marketer / Approver), Reset demo data.
- DATA: event catalogue, segments (incl. Langue Français / English), offers with links,
  policies, 36 single-language content items, 420 generated contacts, six journeys with
  their versions (steps + edges), contact states produced by a deterministic walk.
- DOMAIN: VERSION_TRANSITIONS, validateVersion, canEdit, diffVersions, layout, stats.
