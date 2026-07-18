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

### 6a. Duplicate detection — DECIDED

`url` is the identity, but the _same page_ can be written many ways. Two derived keys,
never stored — the URL you typed is kept verbatim, so the TOML stays yours and these
rules can change later without a migration.

**Strict key — certainly the same page. Merged without asking.**
Lowercased host/scheme, default ports dropped, decorative `#fragment` dropped, empty
path ≡ `/`, tracking parameters stripped by denylist (`utm_*`, `fbclid`, `gclid`, …),
remaining query parameters sorted.

**Loose key — probably the same page. Warns, never merges on its own.**
Everything above, plus folding `www`/non-`www`, `http`/`https` and a trailing slash.

**Deliberately NOT done:** `youtu.be` ↔ `youtube.com`, AMP unwrapping, `m.` subdomains,
locale paths, or following redirects at add time. Site-specific rules with an endless
tail, and a network round-trip on every add.

**Two carve-outs that matter:**

- A fragment is kept when it looks like a route (`#/path`, `#!/path`) — hash-routed
  apps put real page identity there.
- Only _known tracking_ parameters are stripped, never the query wholesale.
  `youtube.com/watch?v=…` is the standing example: the query **is** the identity, and
  blanket-stripping it would merge unrelated videos.

**Behavior**

| Situation                | Strict match                     | Loose match                               |
| ------------------------ | -------------------------------- | ----------------------------------------- |
| Adding a URL by hand     | Refused; offers to open or merge | Refused; offers merge **or** "add anyway" |
| Importing a batch        | Skipped quietly                  | **Imported** and reported for review      |
| Editing a bookmark's URL | Refused (would collide)          | Allowed                                   |

The asymmetry on import is deliberate: silently dropping a bookmark because of a
_guess_ is worse than keeping a duplicate, so probable matches are imported and listed
rather than discarded.

**Why this scope.** The rules were chosen by measuring a representative browser
bookmark library rather than by assumption. Exact matching and fragment normalization
accounted for essentially all real duplicates found; the `www`, `http`-vs-`https`,
tracking-parameter and trailing-slash rules caught none beyond those. The aggressive
tier is cheap to implement but earns little, which is why it warns instead of merging.
A dedicated "find duplicates" cleanup screen was considered and deferred — with dedupe
applied at import time, it would generally open to an empty list.

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
6. **Graph view** (`/graph`) — see §8a.
7. **Import & export** (`/import`, `/export`) — see §8b.

### 8a. Graph / map view — DECIDED

A second view (toggle **List / Graph** in the header, routed at `/graph`) shows
bookmarks as a force-directed "map" of how they group together.

- **Model: hub nodes.** Rather than drawing an edge between every pair of bookmarks
  that share something (which explodes for popular tags), tags and collections become
  their own small nodes; each bookmark links to the tags/collections it belongs to.
  Only hubs shared by **≥ 2 bookmarks** are shown, so the graph reflects real
  groupings; bookmarks with no shared attribute appear as lone nodes.
- **Rendering:** [`@xyflow/svelte`](https://svelte.flow) (Svelte Flow) for the canvas +
  interactions; **d3-force** computes a settled layout (link/charge/center/collide +
  mild centering) that Svelte Flow then renders. Dark theme, attribution hidden.
- **Node types:** bookmark (favicon + title card, click opens the URL), tag (blue pill),
  collection (green folder pill). Hub size hints at how many bookmarks it holds.
- **Interactions:** pan & zoom; click a bookmark to open it. Node dragging is off.
- **Pure/testable core:** `$lib/graph.ts` (`buildGraph`) and `$lib/graphLayout.ts`
  (`layoutGraph`) are framework-free; `buildGraph` is unit-tested.

### 8b. Import & export — DECIDED

Bringing an existing browser library in, and getting it back out again. Three import
sources, one export format.

**Sources**

1. **Live Chrome profile** (no export step). Chrome keeps its bookmarks as JSON at
   `<user data dir>/<Profile>/Bookmarks`; since the app runs locally we read it
   directly. Profiles are auto-discovered per platform (macOS / Windows / Linux),
   overridable with `CHROME_USER_DATA_DIR`. Timestamps are **WebKit epoch**
   (microseconds since 1601-01-01) and are converted to ISO.
2. **Exported bookmarks HTML** — the **Netscape Bookmark File Format**, which Chrome,
   Firefox, Safari and Edge all produce. It is not well-formed HTML (tags are routinely
   left unclosed), so it is read with a small tokenizer rather than an HTML parser.
3. **Pasted URL list** — one URL per line, optionally `url<space>Title`; `#` comments
   and blanks ignored.

**Open tabs.** Chrome has no native bulk "export open tabs". The supported flow is
Chrome's own **"Bookmark all tabs…" (⇧⌘D / Ctrl+Shift+D)**, which drops every tab in
the window into a new bookmark folder — that folder is then imported via source 1
using the **"only this folder"** scope. Source 3 covers "copy all tab URLs" extensions.

**Mapping & options**

- Browser **folder nesting → our `/`-separated `collection`** path, so hierarchy survives.
- Original creation dates are **preserved** (`added`), not reset to import time.
- Per-run options: a **collection prefix**, **extra tags** applied to everything, and a
  **folder scope** filter.
- Non-`http(s)` entries (bookmarklets, `chrome://`, `place:`) are skipped.

**Safety:** import **never overwrites** an existing bookmark — a URL already present is
skipped, so curated tags/notes are safe. Duplicates _within_ a batch collapse too
(browsers happily file one page in two folders). The whole batch is written in a
**single transaction**. After importing, the first 25 new entries get background
metadata enrichment (a cap, to avoid a fetch storm when importing a large library).

**Export** (`GET /export`) renders everything back to Netscape HTML, so it round-trips
into any browser. Note the format stores whole-second dates, so sub-second precision is
lost on a round trip.

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

- Favorite/star, local favicon caching, comment-preserving TOML writes.
- File-watcher live refresh, full-text ranking, keyboard shortcuts, git-based sync.
