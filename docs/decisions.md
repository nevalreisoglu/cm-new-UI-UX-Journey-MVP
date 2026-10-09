# Decisions

| # | Decision | Why | Status |
|---|---|---|---|
| D1 | Journeys are trees: one incoming connection per step, no merge paths. Language paths duplicate the steps after the split. | Keeps insert-on-connection, delete, collapse, validation and layout simple; merge paths are out of scope. | Settled |
| D2 | Edges carry the path key (`label`): the segment id, `Remaining`, `Opened` / `Clicked`, or the shuffle path name. The canvas shows the display label. | Renaming a segment or changing a percentage must not break the connection. | Settled |
| D3 | Deleting a split keeps its first path (spliced into the previous step) and drops the other paths; deleting a single-outlet step splices it out; deleting a terminal leaves the connection open. | Least surprising on a tree; the open connection is flagged by validation. | Settled |
| D4 | `canEdit` is the single rule for Active / Closing: only `contentId` of a Delivery. The change is logged as "Content changed by X at T". | The brief; the version bar, panels and View changes all read the same rule. | Settled |
| D5 | The Delivery stepper is Channel → Content → Details, titled "Create" on its first screen, which also holds the delivery name. | The brief lists those three contents; the name needs a home. | Open |
| D6 | "Skipped" as a contact status = the contact reached Exit after its last Delivery was skipped. Inside the journey a skipped contact continues. | The brief's status list; skipping is per step. | Settled |
| D7 | Payment failed v3 = v2 + one Push step on the FR path + the FR wait changed 2 → 1 days. | The brief: one step added, one wait changed. | Settled |
| D8 | Sends are attributed to the Delivery's offer: an Offers table in Monitor › Overview and "attributed to CODE" in the contact timeline. No offer page. | The brief; offer pages are out of scope. | Settled |
| D9 | Every number in Monitor comes from `CONTACT_STATES`, written by a seeded walk of a few hundred contacts per journey. | "Do not hard-code stats"; counts add up across splits by construction. | Settled |
| D10 | Steps can be dragged freely in a Draft; the position is saved per step and per orientation, and the *Auto-layout* button puts every step back. Locked versions and the Monitor keep the automatic layout. | Asked for by the owner after review; the brief's "auto-layout only" stays the default. | Settled |
| D11 | A Draft's step cards carry a × to delete (as in CM-New-UI-UX2); on a locked version, selecting a step shows once why it cannot be edited. | Review feedback: deletion was not discoverable; the lock was silent. | Settled |
