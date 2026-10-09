# Etiya CM — Journey MVP prototype

## What this is
A working, front-end-only prototype of the **journey layer** for Etiya Campaign Management (CM).
It covers exactly the seven P1 roadmap items below, so that every Fizz flow (Canadian telco,
French/English, ~2M contacts, today on Symplify) that belongs in a journey can be built here.
Audience: internal reference for engineering/UX first, then a customer demo. Behaviour and rules
matter as much as looks.

## Product rules that frame everything
- **Journey = per-customer and event-triggered.** Every journey starts from an event.
  Segment-based, scheduled sends are campaigns and are **not** part of this prototype.
- Event-type campaigns no longer exist; a one-step event flow is a journey
  (Event → Delivery → Exit).
- No project folders. No simulation / "advance 1 day". No segment entry.
- **Content is single-language.** A Delivery picks one ready-made content item; language is
  split with a Segment split (*Langue Français* / *Langue English* paths), never inside content.
- **Hold-outs only via Shuffle split + Control group step.** A Delivery has no control-group share.

## Stack and look
- Vite + React + TypeScript. No backend: all state in memory, seeded from one mock module
  (`src/mock/`). Deployable to Vercel as a static site.
- Visual language: follow the existing CM prototype (https://cm-new-ui-ux-2.vercel.app/, source
  repo `CM-New-UI-UX2`). Tokens are copied into `src/styles/tokens.css`; do not invent a new style.
- UI text in English; sample content in French and English.
- Keep dependencies small (`@dagrejs/dagre` for auto-layout). Do not add a UI kit.

## Roadmap items → what the prototype must show
| # | Roadmap item | Must show |
|---|---|---|
| 1 | Journey object + version management | journey as container; versions Draft / Pending approval / Active / Closing / Closed; version note; copy to new version; active structure locked, only the Delivery content choice editable; approval on activation |
| 2 | Per-customer journey state | each contact's current step and status (Waiting / In step / Exited / Skipped / Control group); Exit node |
| 3 | Event-triggered entry | single and batch API entry; create contact if missing; payload fields as placeholders; "processed within 60 s" |
| 4 | Delivery step parity with campaigns | one Delivery step type (Email / SMS / Push, one channel each); ready-made single-language content; offer (name, code, link as placeholders; sends attributed to the offer); communication rules (policy); override unsubscribe; skip when channel unreachable |
| 5 | Flow nodes | segment split (+ fixed Remaining; used for language), engagement split (opened / clicked + Remaining), shuffle split (%), control group, duration wait |
| 6 | Monitoring | step stats on canvas; version, channel and offer breakdown; per-contact event log; single-contact lookup |
| 7 | Management + test | journey list with status tabs; contact list (Customers / Prospects); test send |

Every screen and behaviour below maps to one of these; keep that mapping visible in code
comments where helpful.

## Navigation
Left nav: **Journeys** (list) · **Monitor** (opens from a journey). Top right: role switcher
**Marketer / Approver**.

## Screen 1 — Journey list  [1][7]
- Tabs: Draft · Pending approval · Live · Past (with counts). "Pending approval" is the
  approver's queue.
- Search; filters: event, channel, contact list.
- Columns: name (+ "Override unsubscribe" badge when on), event, channels (icons), active
  version + note (second line if a version is Closing or Pending), entered last 30 days,
  last modified + by.
- Row actions: open, duplicate, open Monitor.
- "+ New journey": opens the editor directly with an Event entry and an Exit already placed
  (defaults: first event, single entry, Customers; the Event entry step is selected). Name and
  contact list are set in Settings, event and single / batch in the Event entry panel.

## Screen 2 — Journey editor
### Version bar  [1]
- Version selector: number, status chip, note, activated by / when.
- Actions by state and role:
  - Draft (Marketer): Submit for approval (asks for a short note) · Delete
  - Pending approval (Marketer): Withdraw
  - Pending approval (Approver): View changes · Approve and activate · Reject (comment required)
  - Active: Copy to new version · Stop → Closing or Closed
  - Closing: Close
- Active / Closing: banner "Structure locked — only the content choice of a Delivery can be
  changed"; palette and "+" hidden; all other panel fields read-only.
- Also in the bar: Settings, Test send, layout toggle (left→right / top→bottom).

### Approval rules  [1]
- Activating a new version requires approval (first activation and any copy whose structure
  changed).
- **The only change allowed in an Active version without approval is the Delivery content
  choice.** It is logged in the version history ("Content changed (step): A → B").
- Stopping (Closing / Closed) needs no approval.
- On approve: version → Active; previous Active → Closing. On reject: version → Draft, reject
  comment shown on the version.
- Approver "View changes": canvas diff vs. the current Active version — added steps green,
  removed red, changed amber — plus a side list of changes and the marketer's note.

### Journey settings  [1][7]
Name, description, contact list (Customers / Prospects), override unsubscribe (confirmation
dialog; badge on the journey), test users.

### Palette (left)
Entry: Event · Message: Delivery · Wait: Duration · Split: Segment, Engagement, Shuffle ·
Action: Control group, Exit.

### Canvas (centre)
- **Auto-layout only** (no free positioning). Two orientations with a toggle; default
  **left→right**; orientation saved per journey.
- Zoom, pan, fit to screen; collapse / expand a split path.
- Three ways to add a step: drag from the palette onto a connection; "+" on a connection
  (menu of step types); "Add next step" inside the selected step's panel.
- Step card: icon (channel icon for a Delivery), name, one-line summary; red border when
  invalid. A path ending without Exit is drawn dashed.

### Step panels (right)
- **Event entry [3]:** event (from the catalogue), single / batch, "create contact if missing",
  payload field list (each copyable as a placeholder), "API code" with sample single and batch
  requests, info line "Processed within 60 s". Batch entry is API only (no file upload).
- **Delivery [4]:** a 3-step stepper **Create → Channel → Details**, no campaign link.
  - Create: delivery name (+ summary of the choices).
  - Channel: Email / SMS / Push cards (one channel per Delivery); Content = dropdown of
    ready-made content items for that channel, channel default preselected, read-only preview
    with sample values, not editable here.
  - Details: offer (optional; its name, code and link become `{{offer_name}}`, `{{offer_code}}`,
    `{{offer_link}}`; sends are attributed to the offer), communication rules (policy from list),
    "Send even to unsubscribed" (visible only when the journey setting is on), info line
    "Contacts who can't be reached on this channel skip this step and continue."
  - No language variants, no control-group share.
- **Duration wait [5]:** N hours or days after the previous step.
- **Segment split [5]:** ordered segment list (add, remove, reorder); **Remaining** path is
  always present and cannot be removed. Language paths use the segments *Langue Français* /
  *Langue English*.
- **Engagement split [5]:** linked delivery (only earlier deliveries on the path); Opened /
  Clicked + Remaining.
- **Shuffle split [5]:** paths with %, "Split evenly", must total 100.
- **Control group [5]:** name; info line "Contacts stop here and are kept for comparison."
- **Exit:** no settings.

### Validation bar (bottom)  [1]
Blocks Submit for approval. Checks: no entry; split without segment; shuffle not 100; engagement
split without linked delivery; delivery without content; path without Exit. Clicking an issue
selects the step.

### Test send  [7]
Pick a Delivery step and a test user, edit the sample payload, Send → toast with the content
rendered (contact, payload and offer placeholders filled). Contacts do not move on the canvas.

## Screen 3 — Monitor  [6][2][1]
Per journey, three tabs; date-range filter applies to all.
1. **Overview:** totals (entered, in journey now, exited, skipped, control group); channel
   breakdown (Email / SMS / Push: sent, opened, clicked, skipped); offers (sends attributed to
   each offer: sent, opened, clicked); versions table (version, status, note, activated by /
   when, entered / inside / exited).
2. **Flow:** read-only canvas of the selected version; stats strip under each step
   (entered · waiting · exited; deliveries also sent · skipped · opened · clicked); count and %
   per split path. Clicking a step opens Contacts filtered to that step.
3. **Contacts:** search by ID / email / phone; filters: step, status. Columns: contact, event,
   received at, current step, status, last delivery result. Clicking a contact opens
   **"Where is this contact now?"**: event payload, step-by-step timeline (entered, waited,
   sent, opened / skipped, exited) and the contact's path highlighted on the canvas.

## Mock data (`src/mock/`)
- **Event catalogue** (fixed, no admin screen): order_abandoned (device_name, cart_url, price),
  account_created (plan_name, activation_date), device_back_in_stock (device_name,
  product_url), payment_failed (amount, due_date, pay_url), plan_changed (old_plan, new_plan).
- **Content items** (`contents.ts`): ready-made, one language each, per channel, one default
  per channel. Placeholders: contact fields, payload fields, offer fields.
- **Segments, offers, policies:** short fixed lists used only in dropdowns (no pages).
  Segments include *Langue Français* / *Langue English*; offers carry name, code and link.
- **Contacts:** a few hundred generated contacts with language FR/EN, some without phone or
  push token (to produce skips). Generic names only.
- **Journeys** (together they show every roadmap item):
  | Journey | State | Shows |
  |---|---|---|
  | Device order abandonment | Live; v14 Active ("V14 – new template"), v13 Closing | batch event, language split, segment split "account created today" + Remaining, payload placeholders, offer |
  | Device back in stock | Live | single event, Prospects list, override unsubscribe |
  | Welcome – account created | Live; v2 Active ("V2 – add control group") | shuffle 90/10 → control group, language split, email with offer, wait 3 days, engagement split → Push / SMS, skipped contacts |
  | Payment failed – reminder | Pending approval; v3 (a push reminder added per language vs. v2) | approval flow and diff view |
  | Plan change – confirmation | Draft | validation errors |
  | Summer roaming promo | Past | closed versions |
- Realistic, consistent numbers (step counts add up across splits).
- Placeholder FR/EN copy only; no real Fizz content.

## Out of scope
Campaigns, segment builder, offer / policy / content management pages, content editor, real
integrations, authentication, simulation, project folders, merge paths, webhooks, set attribute,
audience sync, advanced waits, export, anomaly detection.

## Working method
1. Before coding, write a short plan: folder structure, data model (Journey, Version, Step,
   Contact, ContactState, Event), screens, order of work. Show it and wait for OK.
2. Build in this order, keeping the app runnable and deployable after each step and committing
   per step:
   a. shell, navigation, role switcher, mock data;
   b. journey list;
   c. editor: canvas auto-layout, palette, "+", step panels, validation;
   d. versions and approval (incl. diff view);
   e. monitor (overview, flow stats, contacts, contact timeline);
   f. polish against the CM prototype look.
3. When a rule above is ambiguous, pick the simpler behaviour and list it under
   "Open questions" in the README instead of inventing features.

## Change log of the spec
- 2026-10-09: Email / SMS / Push palette items replaced by one Delivery step with a
  Create → Channel → Details stepper and ready-made single-language content; language split via
  Segment split; control-group share removed from Delivery; offer name / code / link as
  placeholders with send attribution; only the Delivery content choice is editable on Active
  versions. "+ New journey" opens the canvas directly.
