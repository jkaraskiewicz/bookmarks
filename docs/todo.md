# TODO / Backlog

Running list of things we've noticed but deliberately deferred. Not a spec — just
notes to pick up later.

## Graph view (`/graph`)

The first version works but is rough. Ideas noted while using it:

- [ ] **Density / readability.** Clusters still land unevenly; large tag hubs pull
      everything toward them. Consider a stronger cluster separation force, or
      laying out each connected component separately and packing the components.
- [ ] **Threshold control.** `minShared` is hard-coded to 2 in `buildGraph`. Expose it
      as a slider so you can see the graph get denser/sparser live.
- [ ] **Filtering.** Reuse the list view's search/tag/collection filters to scope the
      graph, instead of always rendering everything.
- [ ] **Legend + colors.** No legend today; node colors (blue = tag, green = collection)
      are undocumented in the UI. Possibly color bookmarks by their collection.
- [ ] **Singleton handling.** Bookmarks with no shared tag/collection float as lone
      nodes and eat space. Options: hide them behind a toggle, or park them in a
      "unconnected" gutter.
- [ ] **Labels.** Long titles are truncated by the fixed card width; no tooltip on hover.
- [ ] **Interaction.** Clicking a tag/collection hub could filter the list view.
      Hovering a node could dim everything not connected to it.
- [ ] **Perf.** Layout is a synchronous `tick(300)` on every page load. Fine at current
      size; will need a web worker or cached positions if the collection grows a lot.

## Other

- [ ] Auto-fetch failures are silent — no "couldn't fetch" indicator (spec §7 says there
      should be one).
- [ ] `description` is read-only; no way to override or clear an auto-fetched one.
- [ ] Collection tree nodes aren't collapsible.
