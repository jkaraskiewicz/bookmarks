# Bookmarks

A personal, local-only bookmark manager. A small web UI (SvelteKit) on top of a
single, hand-editable `bookmarks.toml` file — the file is the source of truth.

See [`docs/design-spec.md`](docs/design-spec.md) for the full design & requirements.

## Features

- Add / browse / edit / delete bookmarks from the browser.
- Tags and collections, with search + filtering.
- Automatic metadata fetch (title, description, favicon) when you add a URL.
- Plain-text storage you can also edit by hand.

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
