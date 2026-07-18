# Bookmarks

A personal, local-only bookmark manager. A small web UI (SvelteKit) on top of a
single, hand-editable `bookmarks.toml` file — the file is the source of truth.

See [`docs/design-spec.md`](docs/design-spec.md) for the full design & requirements.

## Features

- Add / browse / edit / delete bookmarks from the browser.
- Tags and collections, with search + filtering.
- Automatic metadata fetch (title, description, favicon) when you add a URL.
- Graph view showing how bookmarks cluster by shared tags and collections.
- Import from Chrome (and any browser) + export back out.
- Plain-text storage you can also edit by hand.

## Importing from Chrome

Open **/import**. Three ways in:

1. **Straight from your Chrome profile** — no export step; the app reads Chrome's
   bookmarks file directly. Set `CHROME_USER_DATA_DIR` if Chrome lives somewhere unusual.
2. **An exported bookmarks HTML file** — `chrome://bookmarks` → ⋮ → _Export bookmarks_.
   Firefox, Safari and Edge produce the same format.
3. **A pasted list of URLs**, one per line.

**To import all your open tabs:** press <kbd>⇧⌘D</kbd> in Chrome ("Bookmark all tabs…"),
save them into a new folder, then use option 1 and put that folder's name in
_"Only this folder"_. Chrome has no direct "export open tabs", so this is the shortest path.

Browser folders become collections, original dates are preserved, and URLs you already
have are skipped rather than overwritten. **/export** gives you a bookmarks HTML file
that imports into any browser.

## Requirements

- Node.js 20+ (developed on Node 26).

## Getting started

```bash
npm install
npm run dev            # http://localhost:5173
```

## Data / storage

Bookmarks live in a single TOML file, by default at:

```
~/.bookmarks/bookmarks.toml
```

Override the location with the `BOOKMARKS_FILE` environment variable:

```bash
BOOKMARKS_FILE=/path/to/bookmarks.toml npm run dev
```

The minimum needed to add a bookmark by hand is a `url`:

```toml
[[bookmark]]
url = "https://example.com"
```

The app fills in the rest (title/description/favicon) on next load. Note: when the
app rewrites the file it normalizes formatting, so hand-written comments inside
bookmark blocks may not be preserved.

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build (adapter-node -> build/)
npm run preview    # preview the production build
npm test           # unit tests (Vitest)
npm run check      # type-check (svelte-check)
npm run format     # format with Prettier
```

## Production

```bash
npm run build
node build         # serves the app; honors BOOKMARKS_FILE
```
