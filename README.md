# Etiya CM — Journey MVP prototype

A front-end-only prototype of the **journey layer** for Etiya Campaign Management: event-triggered,
per-customer journeys with versions and approval, message steps at parity with campaigns, flow
nodes, monitoring and management. It covers the seven P1 roadmap items and nothing else.

- Stack: Vite + React + TypeScript, one dependency for auto-layout (`@dagrejs/dagre`). No backend,
  no browser storage: all state lives in memory and is seeded from `src/mock/` on every load.
- Look: follows the existing CM prototype (`cm-new-ui-ux-2`). The design tokens in
  `src/styles/tokens.css` are copied from it (Etiya brand kit — navy / lilac primary, orange accent,
  turquoise action, Roboto).
- UI text in English; sample message content in French and English (placeholder copy only).

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/ — deployable to Vercel as is (hash routing, no rewrites)
npm run lint
```

Routes: `#/journeys` · `#/journeys/:id` (editor, `?v=<versionId>` selects a version) ·
`#/journeys/:id/monitor` (`?tab=overview|flow|contacts`, `&step=<stepId>`).

Top right: **Marketer / Approver** role switcher. The approver's queue is the *Pending approval*
tab of the journey list; the Payment failed journey has a v3 waiting there.

## Where things are

```
src/
  app/        hash router, in-memory store (React context + reducer) with every action
  model/      types · graph helpers · dagre layout · validation · version diff · stats · placeholder rendering
  mock/       event catalogue · content items · segments / offers / policies / users · generated contacts ·
              the six journeys · simulator that walks contacts through a version and writes their event log
  screens/
    journeys/ Screen 1 — journey list
    editor/   Screen 2 — version bar, palette, canvas, step panels (Delivery stepper, splits, …), validation bar, settings, test send, diff view
    monitor/  Screen 3 — overview, flow with stats, contacts, "Where is this contact now?"
  ui/         small primitives (icons, modal, pills, formatting)
  styles/     tokens · base · components · editor / monitor
docs/plan.md  the plan written before coding
```

## Roadmap items → where to look

| # | Item | In the prototype |
|---|---|---|
| 1 | Journey object + version management | Version bar in the editor (`VersionBar.tsx`): Draft / Pending approval / Active / Closing / Closed, version note, copy to new version, structure lock where only the Delivery content choice can change (logged in the version history), approval on activation, approver diff (`DiffView.tsx`, `model/diff.ts`), validation bar |
| 2 | Per-customer journey state | `ContactState` + log in `model/types.ts`; Monitor › Contacts and the contact drawer; the Exit node |
| 3 | Event-triggered entry | Event entry panel (`panels/EventPanel.tsx`): catalogue, single / batch (API only), create contact if missing, payload placeholders, sample requests, "processed within 60 s" |
| 4 | Delivery step parity | `panels/DeliveryPanel.tsx`: Create → Channel → Details stepper; one channel (Email / SMS / Push) per Delivery; ready-made single-language content from `mock/contents.ts` with a read-only preview; offer (name / code / link placeholders, sends attributed to it), communication rules, send to unsubscribed (only when the journey allows it), skip-when-unreachable info |
| 5 | Flow nodes | `panels/SplitPanels.tsx`, `SimplePanels.tsx`: segment split with fixed Remaining (also used for the FR / EN language split), engagement split (opened / clicked / remaining, linked to an earlier delivery), shuffle split (%, split evenly, must total 100), control group (the only hold-out mechanism, with a shuffle split), duration wait |
| 6 | Monitoring | `screens/monitor/`: totals, channel, offer and version breakdown, stats strip on the canvas, per-contact log and single-contact lookup; all numbers derived from the simulated logs in `model/stats.ts` |
| 7 | Management + test | Journey list with status tabs and filters; "+ New journey" opens the canvas directly (Event entry and Exit placed, event step selected; name and contact list in Settings); contact list Customers / Prospects per journey; test send with a rendered preview (`TestSendDialog.tsx`) |

## Seed journeys

| Journey | State | Shows |
|---|---|---|
| Device order abandonment | Live; v14 Active ("V14 – new template"), v13 Closing, v12 Closed | batch event, language split, segment split *Account created today* + Remaining, payload and offer placeholders |
| Device back in stock | Live; v2 Active | single event, Prospects list, override unsubscribe, skips for prospects without phone / push |
| Welcome – account created | Live; v2 Active ("V2 – add control group"), v1 Closed | shuffle 90/10 → control group, language split, email with offer, wait 3 days, engagement split → Push / SMS, skipped contacts |
| Payment failed – reminder | v2 Active, v3 Pending approval (a Push reminder added on the FR and EN paths) | approval flow and diff view |
| Plan change – confirmation | Draft | every validation error |
| Summer roaming promo | Past; v1 and v2 Closed | closed versions |

Contacts: 420 generated (320 customers, 100 prospects), FR/EN, some without phone or push token,
some unsubscribed. Generic names and `@example.com` addresses only.

## Open questions

Where the brief was ambiguous the simpler behaviour was chosen. These are the calls to confirm:

1. **Tabs are views, not states.** A live journey with a version waiting for approval appears in
   both *Live* and *Pending approval* (the approver's queue shows the pending version; *Live* shows
   the active one with the pending one on a second line).
2. **Every activation goes through Submit → Approve**, including a copy whose structure did not
   change. The brief only requires approval when the structure changed; a "content-only copy
   activates without approval" shortcut was left out to keep one path.
3. **Content choice in an Active version** applies immediately (no draft) and is logged as
   "Content changed (step): A → B". Everything else on a Delivery (channel, offer, rules) is locked.
4. **"Skipped" as a contact status** means the contact reached Exit after its last message step was
   skipped (unreachable channel or unsubscribed). While inside, a skipped contact simply continues.
5. **Deleting a split** keeps its first path (spliced into the previous step) and drops the other
   paths with their steps. Deleting a single-outlet step splices it out.
6. **Language split.** Each language path duplicates the steps that follow it (the graph is a tree,
   no merge paths), so a bilingual journey has an FR branch and an EN branch; the *Remaining* path
   of the language split goes to Exit. The Delivery stepper's first step, *Create*, holds the
   delivery name; channel and content sit together in *Channel* because the content list depends
   on the channel.
7. **Engagement split on an SMS** can only take *Clicked* or *Remaining* — there is no open
   tracking for SMS, so *Opened* stays empty.
8. **Sending to unsubscribed contacts** needs both the journey setting (*Override unsubscribe*,
   with a confirmation) and the per-message switch.
9. **Stop → Closed** is modelled as "contacts inside are removed"; in the mock no contact actually
   moves, so Monitor numbers do not change when a seed version is stopped.
10. **Date range in Monitor** filters by the date the event was received (entry date), and applies
    to all three tabs.
11. **Contact list** (Customers / Prospects) is locked while a version is Active or Closing;
    everything else in Settings can change at any time.
12. **Test send** renders the chosen content with the test user's fields, the edited payload and
    the Delivery's offer; unreachable channels (no phone / no push token) produce a warning
    instead of a send. There is no language choice: the content item has one language.
13. **Volumes** are a few hundred simulated contacts per journey, not Fizz's ~2 M; the simulator
    (`src/mock/simulate.ts`) guarantees that step counts add up across splits.
15. **Offer attribution** is shown as an *Offers* table in Monitor › Overview (sent / opened /
    clicked per offer) and in the contact timeline ("attributed to DEV10"); there is no offer page.
16. **Content items** are a fixed list; the Delivery only picks one. Which items exist per channel,
    and the per-channel default, are mock data.
14. **Batch entry** is a flag on the event entry with a sample batch request; there is no batch
    status screen.

## Out of scope (as per the brief)

Campaigns, segment builder, offer / policy / content management, content editor, real
integrations, authentication, simulation controls, project folders, merge paths, webhooks, set
attribute, audience sync, advanced waits, export, anomaly detection.
