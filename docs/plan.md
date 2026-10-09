# Build plan — Etiya CM Journey MVP prototype

Written before coding (working method, step 1). Updated only where the build deviated.

## Folder structure

```
src/
  main.tsx                 entry
  App.tsx                  shell: top bar, left nav, hash router, toasts
  app/                     router (hash based), store (React context + reducer), toasts, current user/role
  model/
    types.ts               Journey, Version, Step, Outlet, Contact, ContactState, EventDef, lists
    graph.ts               step graph helpers: build graph, parents, add/remove step on a connection, subtree
    layout.ts              dagre auto-layout (LR / TB)
    validation.ts          editor validation rules (roadmap item 1)
    diff.ts                version diff for the approver "View changes" (item 1)
    stats.ts               step / channel / version stats derived from contact states (item 6)
    render.ts              placeholder rendering for test send (item 7)
  mock/
    events.ts              fixed event catalogue (item 3)
    lists.ts               segments, offers, policies, users (dropdown-only lists)
    contacts.ts            a few hundred generated contacts, FR/EN, some without phone / push token
    journeys.ts            the six journeys of the brief, with their versions
    simulate.ts            deterministic walk of contacts through a version → ContactState + event log
    index.ts               seed() builds the in-memory world once
  screens/
    journeys/              Screen 1: journey list, new-journey dialog
    editor/                Screen 2: version bar, palette, canvas, step panels, validation bar,
                           settings, test send, diff view
    monitor/               Screen 3: overview, flow, contacts, contact drawer
  ui/                      small primitives (Button, Pill, Tabs, Field, Modal, Icon, …)
  styles/                  tokens.css (Etiya brand kit, copied from the CM prototype), base.css, components.css
docs/plan.md               this file
README.md                  how to run, what is where, open questions
```

## Data model

- **Journey** — container: id, name, description, contactList (customers | prospects),
  overrideUnsubscribe, testUserIds, orientation (LR | TB, saved per journey), versions[],
  updatedAt / updatedBy.
- **Version** — number, status (draft | pending | active | closing | closed), note, steps[],
  submitted / activated / closed by + at, rejectComment, history[] ("Content updated by X at T",
  "Approved by …", …).
- **Step** — id, type, name, `outlets[]` and `config`.
  - Every step has `outlets: { id, label, next: stepId | null }[]`. Single-outlet steps
    (event, message, wait) have one outlet; splits have several; control group and exit have none.
    An outlet whose `next` is null is a path without Exit (drawn dashed, flagged by validation).
  - Types: `event` (eventId, entryMode single | batch, createContactIfMissing) ·
    `delivery` (channel email | sms | push, contentId of a ready-made single-language content
    item, offerId, policyId, sendToUnsubscribed) · `wait` (amount, unit) ·
    `segmentSplit` (segment per outlet + fixed Remaining outlet) ·
    `engagementSplit` (messageStepId; outlets Opened / Clicked / Remaining) ·
    `shuffleSplit` (percent per outlet) · `controlGroup` (name) · `exit`.
  - The graph is a tree (one parent per step, no merge paths), which keeps "add on a
    connection", delete, collapse and validation simple.
- **Contact** — id, type, names, email, phone?, pushToken?, language, plan.
- **ContactState** — journeyId, versionId, contactId, event payload, receivedAt, currentStepId,
  status (waiting | in_step | exited | skipped | control), lastDeliveryResult, log[] of
  { at, stepId, kind: entered | waited | sent | opened | clicked | skipped | exited | control }.
  Every statistic on the Monitor is derived from these logs, so step counts add up by construction.
- **EventDef** — id, name, payload fields (name, type, sample value).
- **ContentItem** — id, channel, name, language, isDefault, body (email / sms / push fields).

## Screens

1. Journey list (tabs Draft / Pending approval / Live / Past, search, filters, row actions,
   "+ New journey").
2. Journey editor (version bar, palette, auto-layout canvas, step panels, validation bar,
   settings, test send, approver diff view).
3. Monitor (overview, flow with stats strip, contacts with "Where is this contact now?").

## Order of work (one commit per step, app runnable after each)

a. shell, navigation, role switcher, mock data, simulator
b. journey list
c. editor: canvas auto-layout, palette, "+", step panels, validation
d. versions and approval incl. diff view
e. monitor
f. polish against the CM prototype look

## Deviations from the plan
- Steps (c) and (d) were built together: the version bar and the lock mode shape the editor.
- Deleting a split keeps its first path instead of removing the whole subtree (see README › Open questions).
- Spec change (2026-10-09): Email / SMS / Push steps became one Delivery step with ready-made
  single-language content, a Create → Channel → Details stepper, no control-group share, offer
  placeholders with attribution, and language handled by a Segment split. Seed journeys gained
  FR / EN branches.
- The reference prototype's host was not reachable from the build environment; its source repository
  (`CM-New-UI-UX2`, `index.html` + `docs/brand.md`) was used instead to copy the tokens and component styles.
