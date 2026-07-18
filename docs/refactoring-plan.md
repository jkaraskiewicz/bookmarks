# Refactoring Plan

**Goal:** apply clean-code principles — small files, small functions, DRY, SLAP
(Single Level of Abstraction Per function), pragmatic design patterns — without
over-engineering a single-user local app.

**Verification after every phase:** `npm run check` + `npm test` (+ `npm run format`).

---

# Round 4 — after the graph rework

**Status:** ✅ Complete (2026-07-19). `check` (0 errors) + `test` (145 passing) +
`build` green. The graph rework grew `graph.ts` from 119 to 310 lines and introduced a
new vocabulary (hubs, affinity, membership); this round tidies it.

## Phase 1 — Split `graph.ts` (310 lines, three responsibilities)

- [x] Building hubs (collections, tags, membership sets)
- [x] Computing affinity (co-occurrence, thresholds, ancestor filtering)
- [x] Assembling the graph (`buildGraph`)
      → `graph/hubs.ts`, `graph/affinity.ts`, `graph/index.ts`, mirroring the
      `netscape/` split from Round 3.

## Phase 2 — Stop decoding node ids by hand

`keepMostSpecific` reaches into the id encoding with `id.startsWith('c:')` (4×) and
`id.slice(2)` (2×). The encoding is defined in one place (`collectionId`) but taken
apart ad-hoc with a magic offset — change the prefix and this breaks silently.

- [x] Compute affinity over hub **nodes**, which already carry `kind`, instead of
      re-deriving kind from the id string.
- [x] Where an id genuinely must be inspected, add `isCollectionId` / `collectionPath`
      next to the constructors, so encoding and decoding live together.

## Phase 3 — Visual tuning constants and edge styling

Magic numbers for how strongly affinity reads are spread across two files: `230`,
`110`, `0.15`, `0.55` in the layout; `0.18`, `0.42`, `0.8`, `1.6` and a label
threshold inline in `GraphView`'s template strings.

- [x] Name them where they belong.
- [x] Move edge styling out of the component into `graphEdgeStyle.ts` — a pure
      function is easier to read and to change than an interpolated template string
      inside a `.map`.

## Phase 4 — DRY and SLAP

- [x] `keepMostSpecific` destructures partner/collection identically twice.
- [x] `tagHubs` returns `{ nodes }` — a one-key wrapper for no reason, while
      `collectionHubs` returns `{ nodes, edges }`. Return `GraphNode[]`.
- [x] `buildGraph` decides what to reveal, emits nodes, emits edges and orders the
      result. Extract the reveal pass.

## Phase 5 — Names

- [x] `hubMembership` → `bookmarksByHub` (says what the map holds)
- [x] `keepMostSpecific` → `withoutRedundantAncestors`
- [x] `totals` → `nestedCounts`

## Outcome

`graph.ts` (310 lines) became a module of focused files:

| file                 | lines | responsibility                             |
| -------------------- | ----- | ------------------------------------------ |
| `graph/types.ts`     | 77    | shapes, id construction **and** inspection |
| `graph/hubs.ts`      | 106   | collections, tags, membership              |
| `graph/affinity.ts`  | 106   | overlap, thresholds, ancestor filtering    |
| `graph/index.ts`     | 83    | assembly (`buildGraph`)                    |
| `graph/edgeStyle.ts` | 37    | how an edge reads on the canvas            |
| `graph/layout.ts`    | 146   | force simulation (moved in from `$lib/`)   |

Id decoding is now confined to `types.ts`; a grep for `startsWith('c:')` or `slice(2)`
anywhere else returns nothing, tests included.

Behaviour verified unchanged rather than assumed: the same 12 affinity edges on the
multi-tag fixture (identical pairs, pre- and post-refactor), 17 hubs at rest on a
~360-bookmark library, 64ms to expand, and neighbouring nodes shifting only 44px when
a second hub opens.

**Self-inflicted duplication caught during the round:** splitting `graph.spec.ts` in
two copied the fixture library into both halves. Extracted to `graph/fixtures.ts`.

---

# Round 3 — naming pass and single-responsibility splits

**Status:** ✅ Complete (2026-07-19). `check` (0 errors) + `test` (124 passing) +
`build` green. Focus: are the names optimal, and does each file/function do one thing?

## Phase 1 — One vocabulary per concept

The same idea currently has two or three names, which is the costliest kind of naming
problem: the reader has to hold a translation table.

- [x] **`strictKey` / `looseKey` → `exactKey` / `similarKey`.** The result of comparing
      them is reported everywhere else as `'exact' | 'similar'` (`AddResult.duplicate`,
      `DuplicateNotice`, the spec). Two vocabularies for one concept.
- [x] **Three unrelated "normalize"s.** `normalize` (toml.ts, coerces a parsed table),
      `normalizeFields` (repository, trims strings), `normalizeUrl` (url.ts, adds a
      missing scheme). → `toBookmark`, `trimFields`, `ensureScheme` — each says what it
      actually does.

## Phase 2 — Names that misdescribe the thing

- [x] `anchorLines` returns a single string → `anchorLine`.
- [x] `prepareItems` — "prepare" says nothing → `applyImportOptions`.
- [x] `updateBookmarkByUrl(url, transform)` sits beside `updateBookmark(url, changes)`;
      the names suggest a lookup difference when the real difference is what is applied
      → `transformBookmark`.
- [x] `walk` (chromeJson) → `collectLinks`, and return a list rather than filling an
      output parameter.
- [x] `groupBy` (graph) is too generic for "bookmark ids per attribute" →
      `bookmarkIdsByAttribute`; `hubsFor` → `buildHubs`.
- [x] `withinScope` → `isWithin`; `TOKEN` → `TOKEN_PATTERN`; `TRACKING_PARAM` →
      `TRACKING_PARAM_PATTERN` (both are patterns, and the latter matches many params).

## Phase 3 — Single-letter locals

Cryptic locals in `toml.ts` (`r`, `str`, `t`, `v`, `b`, `doc`, `out`), `filter.ts`
(`b`, `t`, `f`), `html.ts` (`s`, `n`), `chromeProfile.ts` (`e`), `metadata.ts` (`res`,
`type`, `og`), `netscape.ts` (`last`, `folders`, `lower`) and `repository.ts`
(`known`, `loose`, `near`, `possible`).

- [x] Expand to names that say what the value is. Loop variables over an obvious
      collection (`for (const tag of tags)`) are already fine and stay.

## Phase 4 — Single responsibility

- [x] **`repository.ts` (210 lines) mixes file I/O with domain operations.** Extract
      `server/store.ts` — `readFromDisk`, `writeToDisk`, `transact` — leaving the
      repository to express operations on bookmarks.
- [x] **`netscape.ts` (156 lines) both parses and serializes.** Split into
      `import/netscape/parse.ts` and `import/netscape/serialize.ts`; the shared format
      notes go in the directory's index.
- [x] **`routes/import/+page.svelte` (167 lines)** repeats a card-with-form structure
      four times → an `ImportCard` component for the shared chrome.

## Outcome

- One vocabulary for duplicates end to end: `exactKey` / `similarKey` now match the
  `'exact' | 'similar'` outcome that callers, the UI and the spec already used.
- Three unrelated "normalize"s became `toBookmark`, `trimFields`, `ensureScheme`.
- `repository.ts` 210 → 178 lines with persistence moved to `store.ts`;
  `netscape.ts` split into `parse.ts` / `serialize.ts` behind an index that carries the
  format notes; `import/+page.svelte` 167 → 128 with `ImportCard` and `ImportSummary`.
- No behavior change: verified add, exact/probable duplicates, merge, 404, a
  folder-scoped import, export and all three pages after the rename pass.

**Note for future rounds:** BSD `sed` (macOS) does not support `\b` word boundaries,
so `sed 's/\bfoo\b/bar/'` silently matches nothing. Rename with a real parser or
Python, and always grep for stragglers afterwards.

---

# Round 2 — after the graph, import/export and dedupe features

**Status:** ✅ Complete (2026-07-19). Review covered 3,135 lines across 45 files.
`check` (0 errors) + `test` (124 passing, up from 87) + `build` green.

Three features landed after Round 1, and each added its own duplication. Two findings
are behavioral defects rather than style, so they come first and separately.

## Phase 0 — Defects (behavior changes; commit on their own)

- [x] **Nested collections flatten on export** (`import/netscape.ts`). A bookmark in
      `Dev/Frameworks` exports as a single folder literally named `Dev/Frameworks`,
      rather than `Frameworks` nested inside `Dev`. Chrome shows a slash in the folder
      name. It survives our own re-import (we re-join on `/`), which is why the existing
      round-trip test passes — the test only checks our side.
      _Fix:_ build a folder tree in `serializeNetscape` and emit real nesting; add a test
      asserting `<H3>Dev</H3>` containing `<H3>Frameworks</H3>`.
- [x] **Chrome profile file read three times per `/import` load**
      (`server/chromeProfile.ts` + `routes/import/+page.server.ts`). `hasBookmarks`
      reads the whole file just to test existence, `countLinks` reads it again, and the
      page `load` reads it a third time for `chromeFolders` — parsing the JSON twice.
      Three full reads of the profile file per page view, where one suffices.
      _Fix:_ `access()` for existence; read and parse once, derive count + folders from
      the single parse.

## Phase 1 — DRY

- [x] **`parseTags` duplicated verbatim** in `routes/+page.server.ts` and
      `routes/import/+page.server.ts`; `parseTagAttr` in `import/netscape.ts` is a third
      variant of the same idea. → one `splitList` helper in `$lib/tags.ts`.
- [x] **Button class strings duplicated** — the primary button in `AddBar`, `EditDialog`
      and `routes/import/+page.svelte`; the ghost button in ~4 places. `ui.ts` already
      exists for this and currently covers only inputs. → add `primaryButton`,
      `ghostButton`, `cardClass`.
- [x] **Bookmark construction duplicated** between `addBookmark` and `addBookmarks`
      (same 8-line literal, differing only in the `added` fallback). → one
      `buildBookmark(input, fields)` factory.
- [ ] **Two epoch converters** — `isoFromAddDate` (Unix seconds) and `isoFromChromeTime`
      (WebKit microseconds). _Skipped after a closer look; see "Deliberately NOT doing"._

## Phase 2 — SLAP / structure

- [x] **Repository error strategy is inconsistent.** `addBookmark` throws for a missing
      URL but returns a result object for duplicates; `updateBookmark` throws. Only the
      `update` action wraps in `try`/`catch`, so the five actions handle failure five
      ways. No path currently 500s (each is guarded upstream), but it is fragile and the
      actions all repeat parse → validate → call → map-error.
      → a `DomainError` class thrown by the repository, plus one `action()` wrapper that
      maps it to `fail(409, …)`.
- [x] **`buildGraph` does four things** — grouping members, creating hubs, counting
      degrees, assembling nodes — and its `add` helper is write-only code:
      `(map.get(key) ?? map.set(key, []).get(key)!).push(id)`.
      → split into named steps; replace the helper with a readable `pushTo`.

## Phase 3 — Tests

- [x] **`repository.ts` has no tests** despite being the most logic-dense module
      (transactions, dedupe wiring, merge semantics). Testable by pointing
      `BOOKMARKS_FILE` at a temp file.
- [x] `html.ts` (entity decode/escape) — small but trivially testable.

---

## Outcome

- 26 new repository tests, verified by mutation testing: removing the import dedupe
  skip failed 2 of them, removing the update self-collision guard failed 2 more.
- Errors now carry their own status. `DomainError` + a `guard()` wrapper replaced five
  hand-rolled failure paths; a missing bookmark answers 404 rather than a generic 409.
- Verified end to end after refactoring: add, exact duplicate, probable duplicate,
  forced add, merge, empty URL, URL collision, unknown bookmark, delete.

## Deliberately NOT doing (Round 2)

- **Unifying the two epoch converters** (`isoFromAddDate`, `isoFromChromeTime`). They
  are three lines each, live in the modules that own their formats, and share only a
  shape — not a rule. A shared `time.ts` would put Chrome's WebKit epoch next to the
  Netscape Unix epoch and invite passing the wrong one.

- **Merging `updateBookmark` into `updateBookmarkByUrl`.** They share a find-index /
  copy / replace shape, but both read clearly as they are; merging trades four saved
  lines for an extra layer of indirection.
- **A `PageShell` component** for the three page shells. Their headers genuinely differ
  (add bar vs title vs title + back link); such a component tends to accumulate one prop
  per difference until it is harder to read than the duplication.
- **Moving `ImportSummary`** out of `$lib/import/types` so `server/repository.ts` does
  not import from a feature module. A mild layering smell that costs nothing in practice.
- **Tests for `chromeProfile.ts` / `graphLayout.ts`.** Both are thin wrappers over the
  filesystem and d3-force; tests would mostly assert the mock.

---

# Round 1 — initial split into modules and components

**Status:** ✅ Complete (2026-07-18). `check` + `test` (30 passing) + `build` green.

## Phase 1 — Extract pure domain logic out of the view (+ tests)

- [x] `$lib/collections.ts` — `TreeNode`, `buildCollectionTree`, `flattenCollectionTree`,
      `inCollection`
- [x] `$lib/filter.ts` — `filterBookmarks(bookmarks, { search, tags, collection })`
- [x] `$lib/url.ts` — `hostname()`; later also `normalizeUrl`
- [x] `collections.spec.ts`, `filter.spec.ts`, `url.spec.ts`
- [x] Rewire `+page.svelte` to import these

## Phase 2 — DRY `storage.ts`

- [x] `server/mutex.ts` — extract `withLock` as a reusable `createMutex()`
- [x] `transact()` HOF — collapse the repeated read-modify-write
- [x] `normalizeFields()` — shared field cleanup used by add + update
- [x] encapsulate the `pending` set as a small registry
- [x] split into `config.ts` / `repository.ts` / `enrichment.ts`
- [x] Tests for the mutex and CRUD

## Phase 3 — Split `+page.svelte` into components

- [x] `AddBar.svelte`, `Sidebar.svelte` → `CollectionTree.svelte` (recursive) +
      `TagFilter.svelte`, `BookmarkList.svelte` + `BookmarkRow.svelte`, `EditDialog.svelte`
- [x] shared styling via `components/ui.ts` — chose constants over micro-components
- [x] `+page.svelte` becomes a thin orchestrator

## Phase 4 — Polish `metadata.ts` + controller

- [x] `metadata.ts`: extract `extractTitle` / `extractDescription`
- [x] `+page.server.ts`: `formUrl(request)` helper
- [x] `errorMessage` derived in `+page.svelte`

## Deliberately NOT doing (Round 1)

- Full `BookmarkRepository` interface + dependency injection — overkill for one backend.
- Formal command/observer patterns — the `transact` HOF gives the benefit without ceremony.
