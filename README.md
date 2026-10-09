# Etiya CM — Journey MVP prototype

A click-through, working prototype of the **journey layer** for Etiya Campaign Management (CM):
event-triggered, per-customer journeys with versions and approval, a Delivery step at parity
with campaigns, flow nodes, monitoring and management. It covers the seven P1 roadmap items in
`CLAUDE.md` and nothing else.

**Open it:** download `index.html` and open it in a browser — no build, no server, no external
calls except the Google Fonts stylesheet. It is one file: HTML + CSS + vanilla JS. A reload
resets the demo; **Reset demo data** in the top bar does the same without reloading.

## What is in it

- **Roles:** Marketer · Approver (Role view, top right). The approver's queue is the
  *Pending approval* tab of the journey list; *Payment failed – reminder* has a v3 waiting there.
- **Journeys** — list with status tabs (Draft / Pending approval / Live / Past), search, filters,
  row actions, *+ New journey* that opens the editor directly with Event entry and Exit placed.
- **Journey editor** — version bar (buttons derived from one transition table), auto-layout
  canvas (Horizontal / Vertical, zoom, fit, pan, collapsible split paths), palette, three ways
  to add a step (drag onto a connection, "+" on a connection, *Add next step* in a panel),
  step panels (Event entry, Delivery with a Create → Content → Details stepper, Duration wait,
  Segment / Engagement / Shuffle splits, Control group, Exit), validation (blocks Submit),
  Journey settings, Test send, and the approver's *View changes*.
- **Journey Monitor** — journey select + date range; Overview (totals, channel breakdown,
  offers, versions), Flow (read-only canvas with the stats strip under each step and count / %
  on each split path; a step click opens its contacts), Contacts (search, step and status
  filters) and the *Where is this contact now?* panel (payload, timeline, path highlighted).

## Inside `index.html`

| Section | What it holds |
|---|---|
| `<style>` | the `:root` tokens and component CSS copied from CM-New-UI-UX2, then the few additions for this prototype (version bar, step panel, stats strip, diff colours, timeline) |
| shell | `header.topbar` · `nav.nav` · breadcrumb · three `.view` sections · footer · modal and toast hosts |
| **DATA** | `EVENTS`, `SEGMENTS`, `OFFERS`, `POLICIES`, `CONTENT_ITEMS`, `CONTACTS` (420, generated), `JOURNEYS`, `VERSIONS` (steps + edges), `CONTACT_STATES` (written by `simulateVersion`, a seeded walk of each contact through its version); `resetDemo()` |
| **DOMAIN** | `outletsOf`, tree helpers (`insertOnEdge`, `removeStep`, `deliveriesBefore`…), `VERSION_TRANSITIONS` → `actionsFor`, `validateVersion`, `canEdit`, `diffVersions`, `buildGraph` + `layoutGraph` + `edgePath`, `stepStats` / `totals` / `channelStats` / `offerStats`, placeholder rendering |
| **STATE** | the `app` object, `VERSION_ACTIONS`, `createJourney`, `duplicateJourney` |
| **RENDER** | `renderJourneyList()`, `renderEditor()` (canvas, palette, panels, version bar), `renderMonitor()`, modals, toast, role / navigation, one delegated click handler keyed by `data-act` |

Every interactive element carries an `id` or `data-*` hook; the Playwright specs select on them.

## Roadmap items → where to look

| # | Item | In the prototype |
|---|---|---|
| 1 | Journey object + version management | `VERSION_TRANSITIONS`, `VERSION_ACTIONS`, `versionBarHtml`, `canEdit`, `viewChangesModal`, `validateVersion` |
| 2 | Per-customer journey state | `CONTACT_STATES` + `simulateVersion`; Monitor › Contacts and `contactPanel` |
| 3 | Event-triggered entry | `eventPanel`: catalogue, single / batch (API only), create contact if missing, payload placeholders, sample requests, "processed within 60 s" |
| 4 | Delivery step parity | `deliveryPanel`: one channel, ready-made single-language content (`CONTENT_ITEMS`, channel default preselected, read-only preview), offer (placeholders + attribution), communication rules, send even to unsubscribed, skip note |
| 5 | Flow nodes | `segmentPanel` (fixed Remaining; also the FR / EN language split), `engagementPanel`, `shufflePanel`, `controlPanel`, `waitPanel` |
| 6 | Monitoring | `overviewHtml`, Flow tab (`stepStats` on the canvas), `contactsHtml`, `contactPanel` |
| 7 | Management + test | journey list, contact list = an existing datamart (`DATAMARTS`, chosen in the Event entry panel or Journey settings), `testSendModal` |

## Seed journeys

| Journey | State | Shows |
|---|---|---|
| Device order abandonment | Live; v14 Active ("V14 – new template"), v13 Closing, v12 Closed | batch event; segment split Français + account today / Français / English + account today / English / Remaining; one Delivery per path; payload and offer placeholders |
| Device back in stock | Live; v2 Active, v1 Closed | single event, Prospects, override unsubscribe, skips for prospects without phone / push |
| Welcome – account created | Live; v2 Active ("V2 – add control group"), v1 Closed | segment split FR / EN, shuffle 90/10 → control group, email Delivery with offer, wait 3 days, engagement split → Push / SMS, skipped contacts |
| Payment failed – reminder | v2 Active, v3 Pending approval | v3 = one Push step added and one wait changed vs. v2 → View changes |
| Plan change – confirmation | Draft | every validation error |
| Summer roaming promo | Past; v1 and v2 Closed | closed versions |

## Tests

```bash
cd tests && npm install && npx playwright install chromium && npm test
```

See `tests/README.md`. The views spec writes `tests/screenshots/` at 1280 and 1440 px — look at them.

## Open questions

Where the brief was ambiguous the simpler behaviour was chosen (see also `docs/decisions.md`):

1. **Tabs are views, not states.** A live journey with a version pending appears in both *Live*
   and *Pending approval*; the approver's queue opens the pending version.
2. **Every activation goes through Submit → Approve**, including a copy whose only change is the
   content choice.
3. **Content choice on an Active version** applies immediately and is logged as
   "Content changed by X (step): A → B". Channel, offer and rules stay locked.
4. **"Skipped" as a contact status** = reached Exit after its last Delivery was skipped
   (unreachable channel or unsubscribed). Inside the journey a skipped contact continues.
5. **Deleting a split** keeps its first path and drops the others; deleting a single-outlet step
   splices it out; deleting a terminal leaves the connection open (flagged by validation).
6. **Delivery stepper** = Create (name + channel cards) → Content → Details. The brief lists
   those three contents under "Create → Channel → Details"; the name needed a home.
7. **Language split** paths duplicate the steps after the split (journeys are trees, no merge);
   the split's *Remaining* path goes to Exit.
8. **Engagement split on an SMS** can only take *Clicked* or *Remaining* (no open tracking).
9. **Sending to unsubscribed contacts** needs both the journey setting and the per-Delivery switch.
10. **Stop → Closed** is modelled as "contacts inside are removed"; the seeded contact states do
    not change when a seed version is stopped.
11. **Date range** filters by the date the event was received and applies to all three tabs.
12. **Contact list** is locked while a version is Active or Closing.
13. **Test send** renders the content with the test user's fields, the edited payload and the
    Delivery's offer; an unreachable channel produces a warning instead of a send.
14. **Volumes** are a few hundred simulated contacts per journey, not Fizz's ~2 M.
15. **Offer attribution** is an *Offers* table in Monitor › Overview and "attributed to CODE" in
    the contact timeline; there is no offer page.
16. **Free positioning** is available in Drafts (drag a step; *Auto-layout* resets); locked versions and the Monitor always use the automatic layout.
17. **Masked contact ids** (`CUS-****4821`) are the ids themselves; search matches them.

## Out of scope

Campaigns, segment builder, offer / policy / content pages, content editing, content language
variants, simulation, project folders, merge paths, webhooks, set attribute, audience sync,
advanced waits, export, anomaly detection, real integrations, authentication.
