# Refactoring Plan

**Status:** ✅ All phases complete (2026-07-18). `check` + `test` (30 passing) + `build` green.

**Goal:** apply clean-code principles — small files, small functions, DRY, SLAP
(Single Level of Abstraction Per function), pragmatic design patterns — without
over-engineering a single-user local app.

**Verification after every phase:** `npm run check` + `npm test` (+ `npm run format`).

---

## Phase 1 — Extract pure domain logic out of the view (+ tests)

`+page.svelte` currently holds untested domain algorithms. Move them to `$lib`:

- [x] `$lib/collections.ts` — `TreeNode`, `buildCollectionTree`, `flattenCollectionTree`,
      `inCollection` (from `+page.svelte:29-71`)
- [x] `$lib/filter.ts` — `filterBookmarks(bookmarks, { search, tags, collection })`
      (from `+page.svelte:73-81`)
- [x] `$lib/url.ts` — `hostname()` (from `+page.svelte:99-105`); later also `normalizeUrl`
- [x] `collections.spec.ts`, `filter.spec.ts`, `url.spec.ts`
- [x] Rewire `+page.svelte` to import these

## Phase 2 — DRY `storage.ts`

- [x] `server/mutex.ts` — extract `withLock` as a reusable `createMutex()`
- [x] `transact()` HOF — collapse the repeated read-modify-write in
      add/update/delete/refresh into one helper
- [x] `normalizeFields()` — shared field cleanup used by add + update
      (dedupes `storage.ts:71-78` vs `92-99`)
- [x] (optional) encapsulate the `pending` set as a small registry
- [x] (optional) split into `config.ts` / `repository.ts` / `enrichment.ts`
- [x] Tests for the mutex and CRUD

## Phase 3 — Split `+page.svelte` into components

- [x] `AddBar.svelte` (header add form + "More" fields)
- [x] `Sidebar.svelte` → `CollectionTree.svelte` (recursive) + `TagFilter.svelte`
- [x] `BookmarkList.svelte` + `BookmarkRow.svelte`
- [x] `EditDialog.svelte`
- [x] shared styling via `components/ui.ts` (`inputBase` / `fieldClass`) + local
      button-class consts — chose constants over micro-components (less indirection)
- [x] remove duplicated Tailwind class strings (search input == `fieldClass`, etc.)
- [x] `+page.svelte` becomes a thin orchestrator

## Phase 4 — Polish `metadata.ts` + controller

- [x] `metadata.ts`: compute the `<title>` match once (currently twice at `:33-34`);
      extract `extractTitle` / `extractDescription` so `extractMetadata` reads at one level
- [x] `+page.server.ts`: `formUrl(request)` helper for the repeated formData/url reads
- [x] tidy the `form && 'message' in form` access → `errorMessage` derived in `+page.svelte`

---

## Deliberately NOT doing (avoid over-engineering)

- Full `BookmarkRepository` interface + dependency injection — overkill for one backend.
- Formal command/observer patterns — the `transact` HOF gives the benefit without ceremony.
