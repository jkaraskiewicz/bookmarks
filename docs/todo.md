# TODO / Backlog

Running list of things we've noticed but deliberately deferred. Not a spec — just
notes to pick up later.

## Graph view (`/graph`)

Reworked around hubs (spec §8a): collapsed overview, click to expand, drag to pin,
search to reveal. Measured on a ~360-bookmark library: 17 hub circles at rest, no
overlapping nodes even fully expanded, ~120ms to open a mid-size hub and ~310ms to
open the largest (142 bookmarks).

Remaining ideas:

- [ ] **Opening a very large hub is still a lot of labels.** 142 bookmarks around one
      circle is legible but dense. Could paginate ("show 30 more"), or cluster by
      domain within a hub.
- [ ] **Relayout cost grows with what's open** — ~450ms per expansion once most of the
      library is showing. Only matters if you expand everything; a web worker or
      incremental layout would fix it if it becomes annoying.
- [ ] **`minShared` is fixed at 2.** Expose it as a control to make the map sparser or
      denser.
- [ ] **Tag hubs are unproven at scale** — verified on a small multi-tag library, but a
      real tagged library may need the affinity thresholds (2 shared, a third of the
      smaller hub) tuned. Expose them as controls if the defaults feel wrong.
- [ ] Hovering a node could dim everything not connected to it.
- [ ] Clicking a hub could also filter the list view.

## Duplicates

Detection is in place (see spec §6a). Deferred pieces:

- [ ] **Cleanup screen** for duplicates already in the library. Deliberately not built:
      dedupe runs at import time, so today it would list nothing. Worth building if
      duplicates ever accumulate in practice — e.g. after hand-editing the TOML, or if
      the matching rules get stricter later and older entries need re-checking.
- [ ] The TOML file itself isn't checked for duplicates on read, so hand-added ones are
      invisible until you happen to notice. A "possible duplicates" hint in the list
      view would cover that.
- [ ] Merge currently unions tags and concatenates notes. It never merges two _existing_
      bookmarks — only new input into an existing one.

## Other

- [ ] Auto-fetch failures are silent — no "couldn't fetch" indicator (spec §7 says there
      should be one). Now more visible: a bookmark behind a login keeps the URL as its
      title with no explanation of why. The icon half of this is covered — you can set
      one by hand — but the title and description are not.
- [ ] **Metadata for pages behind a login.** The server fetches anonymously, so a
      private Google Doc answers 401 and only its favicon can be recovered. Fixing it
      properly means capturing title and description from the tab you are already
      logged into — a bookmarklet or small extension that posts them to the local
      server. Would work for every authenticated site, not just Google.
- [ ] `description` is still read-only. It can now be copied into notes and edited
      there, which covers most of why you would want to change it, but there is no way
      to correct or clear the description itself.
- [ ] Collection tree nodes aren't collapsible.
