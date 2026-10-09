# Etiya CM — Journey MVP prototype (project memory)

Read this before touching anything.

## What this is
A **click-through, working prototype** of the journey layer for Etiya Campaign Management (CM).
It covers exactly the seven P1 roadmap items below, so that every Fizz flow (Canadian telco,
French/English, ~2M contacts, today on Symplify) that belongs in a journey can be built here.
Audience: the internal team (engineering / UX reference) first, then the customer.
The code is a reference for the development team, not the product.

Owner: Neval Reisoğlu (Senior PM, CM).

## Start-over note
This repo previously held a React + TypeScript build. **Delete it** (src/, package.json,
vite/ts configs, node_modules) and start from the structure below. Nothing from it is reused.

## Hard constraints (same as the CM-New-UI-UX2 prototype)
- **One file.** Everything lives in `index.html`: HTML + CSS + vanilla JS. No build step, no
  bundler, no framework, no npm runtime dependencies.
- **No external requests** except the Google Fonts stylesheet (Roboto + IBM Plex Mono). It must
  render from a `file://` URL, offline. Deployed to Vercel as a static file.
- **No browser storage** (`localStorage` and friends). State lives in JS variables; a reload
  resets the demo. Add a small "Reset demo data" action in the top bar.
- **Brand:** "Etiya" / logo "ETIYA Marketing Cloud", exactly as in CM-New-UI-UX2.
- **Demo data carries no real names.** Fictional names, masked ids (`CUS-****4821`),
  `@example.com`, `+1 5XX …`. No real Fizz copy.
- Every interactive element has a stable `id` or `data-*` hook for the Playwright scripts. Do
  not rename hooks without updating the scripts in the same commit.

## Look and feel — copy, do not invent
Reference: GitHub `nevalreisoglu/CM-New-UI-UX2`, file `index.html`
(live: https://cm-new-ui-ux-2.vercel.app/). Clone it and copy:
- the whole `:root` token block (`--brand-navy`, `--brand-lilac`, `--cta`, `--sec`, `--bg`,
  `--surface`, `--line`, `--ok`/`--warn`/`--bad`, `--t-entry`, `--t-delivery`, `--t-timer`,
  `--t-wait` … and their `-i` ink pairs), font stacks `--sans` / `--mono`;
- the shell: `header.topbar` (logo, menu toggle, "Prototype" chip, Role view select, user chip),
  `nav.nav` (left menu with section labels), breadcrumb, footer;
- card / panel styles (`.card`, `.panel`), buttons (primary teal CTA, navy, grey, ghost),
  form fields, selects, chips/pills, tables, tabs, toasts, modals;
- the Journey Builder look: palette cards with coloured icons, canvas grid background, node
  cards, connectors, toolbar (Zoom out / Zoom in / Fit / Undo / Redo / Validate /
  Horizontal / Vertical), right-side info panel (`aside.card.panel.jinfo`).
Use the same class names where the meaning is the same. Do not restyle; new components must
look like they came from that file.

## Product rules that frame everything
- **Journey = per-customer and event-triggered.** Every journey starts from an event.
  Segment-based, scheduled sends are campaigns and are **not** part of this prototype.
- Event-type campaigns no longer exist; a one-step event flow is a journey
  (Event → Delivery → Exit).
- **Delivery is not linked to a campaign.** It picks ready-made content; content is managed
  elsewhere (not in this prototype).
- **Language is handled by a Segment split** (Langue Français / Langue English paths), not by
  content variants. Each content item is in one language.
- Hold-outs only via **Shuffle split + Control group step** (no control-group share on Delivery).
- No project folders. No simulation / "send event" / "advance 1 day". No segment entry.
  No content page.

## Roadmap items → what the prototype must show
| # | Roadmap item | Must show |
|---|---|---|
| 1 | Journey object + version management | journey as container; versions Draft / Pending approval / Active / Closing / Closed; version note; copy to new version; active structure locked, Delivery content choice editable; approval on activation |
| 2 | Per-customer journey state | each contact's current step and status (Waiting / In step / Exited / Skipped / Control group); Exit node |
| 3 | Event-triggered entry | single and batch API entry; create contact if missing; payload fields as placeholders; "processed within 60 s" |
| 4 | Delivery step parity with campaigns | one Delivery step, channel chosen inside (Email / SMS / Push); content picked from a list (channel default preselected); offer; communication rules (policy); override unsubscribe; skip when channel unreachable |
| 5 | Flow nodes | segment split (+ fixed Remaining), engagement split (opened / clicked + Remaining), shuffle split (%), control group, Wait (Duration / Until / For event / For segment match) |
| 6 | Monitoring | step stats on canvas; version and channel breakdown; per-contact event log; single-contact lookup |
| 7 | Management + test | journey list with status tabs; contact list (Customers / Prospects); test send |

## Architecture in one page
Inside `index.html`, keep the JS in clearly marked sections, in this order:
1. **DATA** — mock constants: `EVENTS` (catalogue with payload fields), `SEGMENTS`, `OFFERS`,
   `POLICIES`, `CONTENT_ITEMS` (per channel, single language, one `isDefault` per channel),
   `CONTACTS`, `JOURNEYS`, `VERSIONS`, `CONTACT_STATES`. Generated with a seeded RNG so numbers
   are stable across reloads.
2. **DOMAIN** — pure functions, no DOM:
   - `VERSION_TRANSITIONS`: one table of `{from, to, role, action}`; the version bar's buttons
     are derived from it, never hard-coded.
   - `validateVersion(v)` → list of `{stepId, message}`.
   - `canEdit(version, step, field)` → the single rule for what is editable in Active/Closing
     (only the `contentId` of Delivery steps).
   - `diffVersions(a, b)` → `{added, removed, changed}` by step id (+ edges).
   - `layoutTree(version, orientation)` → x/y per step (journeys are trees; no merge).
   - `stepStats(version)` → counts computed **from `CONTACT_STATES`**, never typed by hand.
3. **STATE** — `app = {role, view, journeyId, versionId, selectedStepId, orientation, zoom, …}`.
4. **RENDER** — one `render<View>()` per view: `renderJourneyList()`, `renderEditor()`,
   `renderMonitor()`; small helpers return HTML strings. Re-render the view on state change.

Data model:
- `Journey {id, name, eventId, entryMode: 'single'|'batch', contactList: <datamart id>,
  overrideUnsubscribe, testUsers[], orientation}`
- `Version {id, journeyId, no, status, note, createdBy, createdAt, submittedBy, submittedAt,
  approvedBy, approvedAt, rejectComment, history[], steps[], edges[]}`
- `Step {id, type: 'event'|'delivery'|'wait'|'segmentSplit'|'engagementSplit'|'shuffleSplit'|
  'controlGroup'|'exit', name, config}`
- `Edge {from, to, label}` — label is the path name ("A", "Remaining", "Opened", "90 %" …).
- `ContactState {contactId, versionId, stepId, status, history: [{stepId, event, at, detail}]}`

Roles: `marketer`, `approver` via `data-roles`, applied by `applyRole()` (same pattern as
CM-New-UI-UX2). Views via `data-view` on the left nav.

## Navigation
Left nav: **Journeys** · **Journey Monitor**. Top bar: Role view (Marketer / Approver),
Reset demo data.

## Screen 1 — Journey list  [1][7]
- Tabs: Draft · Pending approval · Live · Past (with counts). "Pending approval" is the
  approver's queue.
- Search; filters: event, channel, contact list.
- Columns: name (+ "Override unsubscribe" chip when on), event, channels (icons), active version
  + note (second line if a version is Closing), entered last 30 days, last modified + by.
- Row actions: Open, Duplicate, Monitor.
- "+ New journey" opens the editor directly: version 1 Draft with an Event entry and an Exit
  placed, the Event entry selected. Event, single / batch and contact list are set in the Event
  entry panel; the name in Journey settings.

## Screen 2 — Journey editor
### Version bar  [1]
- Version select: number, status chip, note, activated by / when.
- Buttons derived from `VERSION_TRANSITIONS`:
  - Draft (Marketer): Submit for approval (modal asks for a note) · Delete draft
  - Pending approval (Marketer): Withdraw
  - Pending approval (Approver): View changes · Approve and activate · Reject (comment required)
  - Active: Copy to new version · Stop → Closing or Closed
  - Closing: Close
- Active / Closing: banner "Structure locked — only delivery content can be changed"; palette
  and "+" hidden; panels read-only except Delivery → Content.
- Also: Journey settings, Test send.

### Approval rules  [1]
- Activating a version requires approval.
- Changing a Delivery's content in an Active version needs **no** approval; it is appended to
  `version.history` ("Content changed by X at T").
- Stop (Closing / Closed) needs no approval.
- Approve: version → Active; previous Active → Closing. Reject: version → Draft with the comment
  shown on the version.
- **View changes** (approver): canvas of the pending version with steps coloured vs. the current
  Active one — added green (`--ok`), removed red (`--bad`, shown as ghost cards), changed amber
  (`--warn`) — plus a side list of changes and the marketer's note.

### Journey settings (modal)  [1][7]
Name, description, contact list (an existing datamart), override unsubscribe (confirmation;
chip on the journey), test users.

### Palette (left)
Entry: Event · Delivery · Wait (type chosen inside the card) · Split: Segment, Engagement,
Shuffle · Action: Control group, Exit.

### Canvas (centre)
- **Auto-layout by default** (`layoutTree`); in a Draft a step can be dragged to a free position (saved per step and orientation); *Auto-layout* in the toolbar resets. Horizontal (default) / Vertical
  toggle, saved per journey. Zoom out / Zoom in / Fit via CSS transform; pan by drag on the
  background. Collapse / expand a split path.
- Add a step three ways: drag from the palette onto a connector; "+" on a connector (menu of
  step types); "Add next step" in the selected step's panel.
- Node card: coloured type header (tokens `--t-*`), name, then its **key settings inline**
  (compact selects / inputs inside the card, like Symplify and the old ECM builder); red
  outline when invalid. A path ending without Exit is drawn dashed. Cards grow to fit their
  fields and auto-layout uses the real card size.
  - Inline fields: Event: event, single / batch, contact list, entry segment · Delivery:
    channel, content · Wait: type, then amount + unit (Duration, window shown as text) /
    until summary / event + timeout / segment + timeout · Segment split: one segment select per path
    (A, B, …) + fixed "Remaining" row · Engagement split: linked Delivery, paths
    Opened / Clicked / Remaining · Shuffle split: % per path · Control group: name · Exit: nothing.
  - Card and panel edit the same data (`commitStepField`); change one, the other updates at once.
  - Clicking inside an inline field never starts a pan or a drag.
  - Active / Closing: inline fields render as plain text, except Delivery → Content.

### Step panels (right, `aside.card.panel.jinfo`)
The panel keeps every field plus what is not inline: preview, payload fields, API code, offer,
policy, unsubscribe option, help texts, add / reorder paths.
- **Event entry [3]:** event (catalogue), single / batch, contact list (an existing datamart:
  `DATAMARTS`, e.g. MAIN DATAMART, PROSPECT DATAMART), entry segment (optional: only contacts
  in it enter), "Create contact if missing", payload
  field list (each copyable as `{{field}}`), "API code" (sample single and batch request,
  mono font), info "Processed within 60 s". Batch is API only.
- **Delivery [4]:** one channel per Delivery. Stepper like CM's delivery plan
  (Create → Channel → Details), no campaign field:
  1. Channel: cards Email / SMS / Push.
  2. Content: select from `CONTENT_ITEMS` for that channel, default preselected; read-only
     preview (Email: subject, preheader, body · SMS: text + length · Push: title, text, link)
     and the placeholders it uses.
  3. Details: offer (optional; its name, code and link become placeholders and sends are
     attributed to it); communication rules (policy); "Send even to unsubscribed" (only when
     the journey setting is on); info "Contacts who can't be reached on this channel skip this
     step and continue."
  Node summary: channel icon + content name (e.g. "Email · Abandon – reminder FR").
- **Wait [5]:** one step, its type chosen inside the card; the card header shows the type
  (`Wait · Duration`). Summary e.g. "Wait 2 days · 09:00–20:00 Mon–Fri", "Until next
  Saturday 10:00", "Wait for order_completed · timeout 24 h".
  1. **Duration** — N minutes / hours / days; optional send window (time range + weekdays):
     contacts are released only inside the window. 1 path.
  2. **Until** — next weekday(s) (multi-select, like CM's Timer "Next weekday") or a specific
     date, at a time. 1 path.
  3. **For event** — expected event from `EVENTS`, matched on the same contact; timeout
     (hours / days). Paths: "Received" · "Timeout".
  4. **For segment match** — segment, check frequency, timeout. Paths: "Matched" · "Timeout".
  Changing the type keeps the first connection and drops the paths that no longer exist.
  Priority wait is out of scope.
- **Segment split [5]:** ordered segments (add, remove, move up/down); **Remaining** always
  present, not removable.
- **Engagement split [5]:** linked Delivery (only earlier Deliveries on the path);
  Opened / Clicked + Remaining.
- **Shuffle split [5]:** paths with %, "Split evenly", must total 100.
- **Control group [5]:** name; info "Contacts stop here and are kept for comparison."
- **Exit:** no settings.

### Validation  [1]
"Validate" in the toolbar and automatically before Submit (blocking). Checks: no entry; split
without segment; shuffle ≠ 100; engagement split without linked Delivery; Delivery without
channel or content; Wait for event without an event or a timeout; Wait for segment match
without a segment or a timeout; path without Exit (both paths of a two-path Wait). Each issue is clickable and selects the step.

### Test send  [7]
Modal: Delivery step, test user, editable sample payload → Send → toast with the rendered
preview. Nothing moves on the canvas.

## Screen 3 — Journey Monitor  [6][2][1]
Journey select + date range; three tabs.
1. **Overview:** totals (entered, in journey now, exited, skipped); channel breakdown (Email /
   SMS / Push: sent, opened, clicked, skipped); versions table (version, status, note,
   activated by / when, entered / inside / exited).
2. **Flow:** read-only canvas of the selected version; stats strip under each node
   (entered · waiting · exited; Delivery also sent · skipped · opened · clicked); count and %
   on each split path and on the Received / Timeout and Matched / Timeout paths of a Wait.
   Clicking a node opens Contacts filtered to it.
3. **Contacts:** contacts waiting in a Wait show status "Waiting · <wait type>"; search by id / email / phone; filters: step, status. Columns: contact, event,
   received at, current step, status, last delivery result. Row click → side panel
   **"Where is this contact now?"**: payload, timeline (entered, waited, sent, opened /
   skipped, exited), path highlighted on a mini canvas.

## Mock data
- `EVENTS`: order_abandoned (device_name, cart_url, price), account_created (plan_name,
  activation_date), device_back_in_stock (device_name, product_url), payment_failed (amount,
  due_date, pay_url), plan_changed (old_plan, new_plan), order_completed (order_id, amount).
- `SEGMENTS` include `Langue Français`, `Langue English`, `Account created today`.
- `CONTENT_ITEMS`: per channel 3–5 single-language items, one default per channel.
- `DATAMARTS`: the contact lists a journey can target (MAIN DATAMART, PROSPECT DATAMART,
  DEVICE WAITLIST, HOME INTERNET DATAMART); each maps to a subset of `CONTACTS`.
- `CONTACTS`: a few hundred; FR/EN; some without phone or push token (to create skips).
- `JOURNEYS` (together they cover every roadmap item):
  | Journey | State | Shows |
  |---|---|---|
  | Device order abandonment | Live; v14 Active ("V14 – new template"), v13 Closing | batch event; segment split Français / Français + account today / English / English + account today / Remaining; one Delivery per path, each followed by "Wait for order_completed · timeout 24 h" → Received → Exit, Timeout → SMS reminder → Exit; payload placeholders |
  | Device back in stock | Live | single event, Prospects list, override unsubscribe |
  | Welcome – account created | Live; v2 Active ("V2 – add control group") | segment split FR / EN, shuffle 90/10 → control group, email Delivery with offer, wait 3 days with send window 09:00–20:00 Mon–Sat, engagement split → Push / SMS, skipped contacts |
  | Payment failed – reminder | Pending approval; v3 (one step added, one wait changed vs. v2) | approval and View changes |
  | Plan change – confirmation | Draft | validation errors |
  | Summer roaming promo | Past | closed versions |

## Out of scope
Campaigns, segment builder, offer / policy / content pages, content editing, content language
variants, simulation, project folders, merge paths, webhooks, set attribute, audience sync,
priority wait, export, anomaly detection, real integrations, authentication.

## Working method
1. Before coding, write a short plan (sections of `index.html`, data model, render functions,
   order of work). Show it and wait for OK.
2. Build in this order; keep the file opening cleanly after each step; commit per step:
   a. shell copied from CM-New-UI-UX2 + tokens + role switch + mock data;
   b. journey list;
   c. editor: layout, canvas, palette, "+", panels, validation;
   d. versions and approval (incl. View changes);
   e. monitor (overview, flow stats, contacts, contact panel);
   f. side-by-side visual check against CM-New-UI-UX2.
3. Add Playwright checks in `tests/` like CM-New-UI-UX2 (open each view, no console errors,
   screenshots at 1280 and 1440 px). Look at the screenshots — they catch what the console
   does not.
4. Keep a `CHANGELOG.md`; record product decisions in `docs/decisions.md`.
5. When a rule here is ambiguous, pick the simpler behaviour and list it under
   "Open questions" in the README — do not invent features.

## Do not
- Do not add a framework, bundler, router or npm runtime dependency.
- Do not invent a new visual style; copy CM-New-UI-UX2.
- Do not add anything from "Out of scope", even as a disabled placeholder.
- Do not hard-code stats; derive them from `CONTACT_STATES`.
