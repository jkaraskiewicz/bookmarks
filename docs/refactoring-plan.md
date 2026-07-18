# Refactoring Plan

**Goal:** apply clean-code principles — small files, small functions, DRY, SLAP
(Single Level of Abstraction Per function), pragmatic design patterns — without
over-engineering a single-user local app.

**Verification after every phase:** `npm run check` + `npm test` (+ `npm run format`).

---

# Round 2 — after the graph, import/export and dedupe features

**Status:** 🏗️ in progress. Review covered 3,135 lines across 45 files.

Three features landed after Round 1, and each added its own duplication. Two findings
are behavioral defects rather than style, so they come first and separately.

## Phase 0 — Defects (behavior changes; commit on their own)

- [ ] **Nested collections flatten on export** (`import/netscape.ts`). A bookmark in
      `Dev/Frameworks` exports as a single folder literally named `Dev/Frameworks`,
      rather than `Frameworks` nested inside `Dev`. Chrome shows a slash in the folder
      name. It survives our own re-import (we re-join on `/`), which is why the existing
      round-trip test passes — the test only checks our side.
      _Fix:_ build a folder tree in `serializeNetscape` and emit real nesting; add a test
      asserting `<H3>Dev</H3>` containing `<H3>Frameworks</H3>`.
- [ ] **Chrome profile file read three times per `/import` load**
      (`server/chromeProfile.ts` + `routes/import/+page.server.ts`). `hasBookmarks`
      reads the whole file just to test existence, `countLinks` reads it again, and the
      page `load` reads it a third time for `chromeFolders` — parsing the JSON twice.
      ~960KB of I/O per page view for a 319KB profile.
      _Fix:_ `access()` for existence; read and parse once, derive count + folders from
      the single parse.

## Phase 1 — DRY

- [ ] **`parseTags` duplicated verbatim** in `routes/+page.server.ts` and
      `routes/import/+page.server.ts`; `parseTagAttr` in `import/netscape.ts` is a third
      variant of the same idea. → one `splitList` helper in `$lib/tags.ts`.
- [ ] **Button class strings duplicated** — the primary button in `AddBar`, `EditDialog`
      and `routes/import/+page.svelte`; the ghost button in ~4 places. `ui.ts` already
      exists for this and currently covers only inputs. → add `primaryButton`,
      `ghostButton`, `cardClass`.
- [ ] **Bookmark construction duplicated** between `addBookmark` and `addBookmarks`
      (same 8-line literal, differing only in the `added` fallback). → one
      `buildBookmark(input, fields)` factory.
- [ ] **Two epoch converters** — `isoFromAddDate` (Unix seconds) and `isoFromChromeTime`
      (WebKit microseconds). → `$lib/import/time.ts` with both, named by their unit.

## Phase 2 — SLAP / structure

- [ ] **Repository error strategy is inconsistent.** `addBookmark` throws for a missing
      URL but returns a result object for duplicates; `updateBookmark` throws. Only the
      `update` action wraps in `try`/`catch`, so the five actions handle failure five
      ways. No path currently 500s (each is guarded upstream), but it is fragile and the
      actions all repeat parse → validate → call → map-error.
      → a `DomainError` class thrown by the repository, plus one `action()` wrapper that
      maps it to `fail(409, …)`.
- [ ] **`buildGraph` does four things** — grouping members, creating hubs, counting
      degrees, assembling nodes — and its `add` helper is write-only code:
      `(map.get(key) ?? map.set(key, []).get(key)!).push(id)`.
      → split into named steps; replace the helper with a readable `pushTo`.

## Phase 3 — Tests

- [ ] **`repository.ts` has no tests** despite being the most logic-dense module
      (transactions, dedupe wiring, merge semantics). Testable by pointing
      `BOOKMARKS_FILE` at a temp file.
- [ ] `html.ts` (entity decode/escape) — small but trivially testable.

---

## Deliberately NOT doing (Round 2)

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
