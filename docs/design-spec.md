# Bookmark Manager — Design & Requirements Spec

**Status:** 🏗️ v1 scaffolded & implemented — core CRUD + search + metadata working
**Last updated:** 2026-07-18

---

## 1. Vision

A personal, local-only bookmark manager. A website (running on localhost) lets me
add, browse, tag, and search my bookmarks. Crucially, bookmarks are stored in a
**single plain-text `bookmarks.toml` file that I can also edit by hand** — the file
is the source of truth, and the app is a friendly UI on top of it.

## 2. Goals & Non-Goals

### Goals

- Add / browse / edit / delete bookmarks via a website.
- Organize with **tags** and **collections**.
- **Search & filter** across the collection.
- **Auto-fetch metadata** (title, description, favicon) asynchronously when a URL is added.
- **Human-readable, hand-editable** storage. Editing the file by hand and using the
  web UI both work and stay in sync.
- **Light** stack — minimal dependencies, fast to run, easy to maintain.

### Non-Goals (v1)

- ❌ Multi-user / accounts / login (single user, trusted machine).
- ❌ Public hosting (runs locally only).
- ❌ Cloud sync (plain-text + git could add this later "for free").
- ❌ Import/export (deferred to a later version).
- ❌ Favorite/star flag (deferred; tags can cover this for now).

## 3. Constraints & Principles

- **Single user, no auth.** Runs on `localhost`, not exposed publicly.
- **The TOML file is the source of truth.** No database. The app reads it fresh so
  manual edits appear, and writes it back in the same human-friendly format.
- **Keep it light.** One small codebase, minimal dependencies.
- **Non-destructive to manual edits.** Rewrites should preserve structure and, where
  feasible, comments/ordering (see §7 tradeoffs).

## 4. Tech Stack — DECIDED

**A single full-stack SvelteKit app (TypeScript).**

- SvelteKit **server routes / form actions = the backend** that reads/writes `bookmarks.toml`.
- SvelteKit **pages = the website**.
- One dependency tree, tiny runtime, `npm run dev` to run; builds to a standalone Node server.
- TypeScript throughout.

**Likely dependencies (kept deliberately small):**

- A TOML parse/serialize library (e.g. `smol-toml` — fast, spec-compliant).
- An HTML metadata extractor for the fetch step (e.g. `cheerio`, or a light hand-rolled parser).
- **Tailwind CSS** for styling — utility-first, small runtime, no component library.
- No database, no ORM.

## 5. Storage — DECIDED

**Single file: `bookmarks.toml`**, an array of `[[bookmark]]` tables.

**Location:** defaults to `~/.bookmarks/bookmarks.toml` (created on first run),
overridable via an env var (e.g. `BOOKMARKS_FILE`). Keeps data separate from the code
checkout so re-cloning/rebuilding the app never touches your bookmarks.

### 5.1 File format

```toml
# bookmarks.toml — edit by hand or via the web UI

[[bookmark]]
title       = "Angular"
url         = "https://angular.dev"
tags        = ["frontend", "docs"]
collection  = "Dev/Frameworks"
notes       = "Framework reference"
description = "The web development framework for building modern apps."  # auto-fetched
favicon     = "https://angular.dev/favicon.ico"                          # auto-fetched
added       = 2026-07-18T10:30:00

[[bookmark]]
title = "Hacker News"
url   = "https://news.ycombinator.com"
tags  = ["news"]
added = 2026-07-18T10:31:00
```

### 5.2 Hand-editing rules

- **Minimum to add a bookmark by hand:** a `[[bookmark]]` block with a `url`.
  Everything else is optional and can be auto-filled by the app later.
- On next load, the app can enrich hand-added entries (fetch missing title/metadata)
  and normalize the file.

### 5.3 Sync behavior

- The app **reads the file fresh on each request** (no stale in-memory cache), so
  manual edits are always reflected.
- Writes are **read-modify-write the whole file** with a simple in-process write lock
  to avoid interleaved writes.
- (Nice-to-have, later) a file watcher for live UI refresh when the file changes on disk.

## 6. Data Model — DECIDED

| Field         | Type         | Required | Source          | Notes                                                              |
| ------------- | ------------ | -------- | --------------- | ------------------------------------------------------------------ |
| `url`         | string       | ✅ yes   | user            | **Natural identity / unique key.**                                 |
| `title`       | string       | ~        | user or fetched | Falls back to fetched `<title>` / the URL.                         |
| `tags`        | string[]     | no       | user            | Many per bookmark.                                                 |
| `collection`  | string       | no       | user            | Zero-or-one. `/`-separated allows nesting (e.g. `Dev/Frameworks`). |
| `notes`       | string       | no       | user            | Freeform personal notes.                                           |
| `description` | string       | no       | **fetched**     | From `<meta>` / OpenGraph.                                         |
| `favicon`     | string (URL) | no       | **fetched**     | Remote URL; browser loads it (no local caching in v1).             |
| `added`       | datetime     | auto     | app             | Set on creation; preserved if present.                             |

**Design calls made (say the word to change):**

- **Identity = `url`.** No numeric `id` to keep hand-editing clean; the UI references
  a bookmark by its URL. Editing a URL is treated as an update to that entry.
- **`collection` is single-valued** (a folder), **hierarchical via `/`** (e.g.
  `Dev/Frameworks`). The UI renders these as a nested tree; selecting a parent node
  includes all descendants (prefix match). Tags remain the many-to-many mechanism.
- **`favicon` stored as a remote URL**, not downloaded — keeps storage plain-text and small.

## 7. Metadata Auto-Fetch — DECIDED (behavior)

- When a bookmark is **added** (via UI or discovered as a hand-added entry missing data),
  the server fetches the page and extracts: **title** (if not user-provided),
  **description** (meta/OpenGraph), and **favicon** URL.
- **Asynchronous / non-blocking:** adding a bookmark returns immediately; the entry
  appears right away and is enriched in the background, then written back to the file.
  The server exposes the set of URLs currently being fetched; the client shows a
  **"fetching…"** state on those rows and polls (~1s) until enrichment completes, then
  stops automatically. (No blind timeouts.)
- A manual **"refresh metadata"** action per bookmark is available to re-fetch (also
  runs in the background with the same "fetching…" indicator).
- Failures are non-fatal: the bookmark is kept with whatever data exists; a fetch error
  is surfaced softly (e.g. a small "couldn't fetch" indicator), never blocks saving.

**Tradeoff noted:** most TOML serializers do not preserve comments/formatting on
rewrite. v1 accepts that app-driven writes **normalize** the file (consistent field
order, standard spacing). Hand-written comments in `bookmarks.toml` may be lost when
the app next rewrites the file. If preserving comments becomes important, we revisit
with a format-preserving approach.

## 8. Features (v1) — DECIDED

1. **CRUD** — add, edit, delete bookmarks via the web UI. The add bar takes just a URL
   by default, with a **"More +" expander** for title/tags/collection/notes up front.
2. **Browse** — a clean compact list of bookmarks with favicon, title, tags, collection.
3. **Search & filter** — text search across title/url/notes/description, plus filter
   by tag(s) and by collection. (Client-side; the dataset is small.)
4. **Tags & nested collections** — assign/edit; browse tags as chips and collections as
   a nested tree (with per-node counts and a datalist for autocomplete on input).
5. **Auto-fetch metadata** — as described in §7, with a live "fetching…" indicator.

## 9. High-Level Architecture

```
┌────────────────────────── SvelteKit app (localhost) ──────────────────────────┐
│                                                                                │
│  Pages (Svelte)                     Server (SvelteKit endpoints/actions)       │
│  ─────────────                      ─────────────────────────────────────      │
│  • List / browse + search/filter    • load()  → read + parse bookmarks.toml    │
│  • Add / edit bookmark (modal)       • actions → create/update/delete          │
│  • Tag / collection facets          • metadata fetcher (async enrich)          │
│                                      • storage module (parse/serialize + lock) │
│                                                     │                          │
└─────────────────────────────────────────────────────┼──────────────────────────┘
                                                       ▼
                                             bookmarks.toml  (source of truth)
```

## 10. UI Design — DECIDED

- **Styling:** Tailwind CSS, dark-friendly, no component library.
- **Default view: compact list** — one row per bookmark (favicon · title link · url ·
  collection · tags), dense and fast to scan. A card/grid view can be added later.
  Each row shows a muted **subtitle line**: the user's `notes`, falling back to the
  auto-fetched `description` (rendered italic to signal it's machine-generated).

  ```
  [icon] Angular        angular.dev            #frontend #docs
         Framework reference I use daily.
  [icon] MDN            developer.mozilla.org  #docs #ref
         Resources for developers, by developers.   (italic = description fallback)
  ```

- **Sidebar:** search box, a **nested collection tree** (indented, with per-node
  counts; selecting a node filters to it and everything beneath it), and tag chips.

  ```
  Collections
    All
    Dev            3
      └ Frameworks 2
      └ Tools      1
    News           1
  ```

- **Add flow: just a URL.** Paste a URL → entry saved instantly → title/description/
  favicon fill in asynchronously (row shows "fetching…"). `url` is the only required
  field (matches the hand-edit rule in §5.2). A **"More +"** expander reveals
  title/tags/collection/notes for entering them up front.
- **Edit:** modal form for title / url / tags / collection / notes. The auto-fetched
  `description` is shown **read-only** ("Description (auto-fetched)") so it's visible
  but not confused for an editable field. Per-row "refresh metadata" (↻) action too.

## 11. Resolved Decisions Log

All prior open questions are now decided:

- **Storage format/layout** → single `bookmarks.toml` (§5).
- **Stack** → SvelteKit + Tailwind (§4).
- **Fields** → §6 table.
- **v1 features** → CRUD, browse, search & filter, tags/collections, auto-fetch (§8).
- **File location** → configurable, default `~/.bookmarks/bookmarks.toml` (§5).
- **Default view** → compact list (§10).
- **Add flow** → URL only (§10).
- **Styling** → Tailwind CSS, dark-friendly (§10).

## 12. Deferred / Future Ideas

- Import from / export to browser bookmarks (HTML).
- Favorite/star, local favicon caching, comment-preserving TOML writes.
- File-watcher live refresh, full-text ranking, keyboard shortcuts, git-based sync.
