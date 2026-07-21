# Bookmarks

A single-user bookmark manager that runs on your own machine. It is a small web
application (built with SvelteKit) on top of one plain-text file, `bookmarks.toml`.

That file is the authoritative copy of your data: the application reads from it and
writes back to it, and nothing is stored anywhere else. You can edit it directly in a
text editor, and the application will reflect your changes.

See [`docs/design-spec.md`](docs/design-spec.md) for the full design and requirements.

## Features

- Add, browse, edit and delete bookmarks through a web interface.
- Organize bookmarks with tags and with collections — named folders that can be nested,
  such as `Dev/Frameworks`.
- Search and filter across the whole library.
- Select several bookmarks at once to delete them or re-fetch their metadata.
- Automatic lookup of a page's title, description and icon when a link is added, with
  the icon settable by hand when the lookup cannot find a good one.
- A map view that arranges bookmarks into clusters based on the tags and collections
  they have in common.
- Import from Chrome and other browsers, and export back out again.
- Four colour themes, a choice of fonts and text sizes, following your system's
  light/dark setting by default.
- Plain-text storage that you can also edit by hand.

## Appearance

The **Appearance** button in the top-right corner opens a panel with three settings.
Each applies as soon as it is picked, so there is nothing to save.

**Theme** — **Dark**, **Light**, **Darcula** (JetBrains' IDE theme), **Melange** (the
warm, low-contrast Neovim scheme), or **System**. System follows your operating
system's light/dark setting and changes with it; the rest stay put.

**Font** — System, Helvetica, Verdana, Trebuchet MS, Georgia, Times New Roman or
Monospace. No fonts are downloaded, so the list is limited to families that ship with
both Windows and macOS; each falls back to the nearest equivalent on a machine that
lacks it.

**Text size** — Small, Medium, Large or Extra large. Set as a percentage of your
browser's own text size rather than a fixed number, so if you have already raised
that, these scale from it. The whole interface resizes together, not just the body
text.

All three are remembered in the browser and applied before the first paint, so the
page never flashes the wrong colours, font or size while loading.

### Adding a theme

Themes are defined entirely in CSS. Components never name a colour — they name a role
such as `bg-surface` or `text-muted` — so a new theme needs no component changes.

1. Copy a file in `src/lib/theme/palettes/`, give it a new `data-theme` name and
   change the values, then add an `@import` for it to `src/lib/theme/palettes.css`.
   Every variable in the file must be present; a missing one silently inherits from
   the theme imported before it.
2. Add the theme to the `THEMES` list in `src/lib/theme/index.ts` with a label, an icon
   and whether it is fundamentally `light` or `dark`. It appears in the Appearance
   panel automatically.

`npm test` then checks the new theme automatically: every text-on-background pair must
meet the WCAG AA contrast minimum, and the theme must declare the same set of variables
as the others. Both checks read `palettes.css` directly, so they cover themes added
later without anyone having to remember to test them.

## Requirements

- Node.js 20 or newer (developed and tested on Node 26).

## Getting started

```bash
npm install
npm run dev            # then open http://localhost:5173
```

## Importing and exporting

The **/import** page offers three ways to bring bookmarks in.

1. **Directly from Chrome.** The application reads Chrome's own bookmarks file from your
   computer, so no export is required first. If Chrome is installed in a non-standard
   location, set the `CHROME_USER_DATA_DIR` environment variable to point at it.
2. **From an exported bookmarks file.** In Chrome, open `chrome://bookmarks`, then use
   the ⋮ menu and choose _Export bookmarks_. Firefox, Safari and Edge all export the
   same file format, so files from those browsers work as well.
3. **From a pasted list of links**, one per line.

**Importing your open tabs.** Chrome cannot export open tabs directly. The most
practical route is to press <kbd>⇧⌘D</kbd> and choose "Bookmark all tabs…", which places
every tab in the current window into a new bookmark folder. Import that folder using
option 1 above, entering its name in the _"Only this folder"_ field.

When importing, folders from your browser become collections, and the dates on which
bookmarks were originally saved are preserved. Bookmarks you already have are not added
a second time; see [Duplicate detection](#duplicate-detection) below.

The **/export** page produces a bookmarks file that can be loaded into any browser.

## Editing a bookmark

Most fields are yours to change directly. Two are worth explaining.

**The description is fetched, not typed.** It comes from the page itself and is shown
read-only. The **Copy to notes** button beside it puts that text into your notes,
where you can edit it — the copy is added below anything already there, and pressing
the button again does nothing rather than duplicating the text.

**The icon can be set by hand.** The address is an ordinary field with a preview
beside it, so you can tell at a glance whether it loads. This matters for pages the
fetcher cannot read — anything behind a login, for instance — where the only icon it
can offer is a guess at `/favicon.ico` that may not exist.

An icon you set is never overwritten by a later refresh, including a bulk one. The
fetcher only fills an icon that is missing, or replaces one it guessed itself. To hand
the choice back to it, clear the field and refresh.

## Duplicate detection

The application aims to prevent the same page being saved twice.

This is less straightforward than it appears, because one page can be reached through
several different addresses. A link copied from a newsletter may arrive as
`nba.com/news?utm_source=twitter`, while the same page typed by hand is simply
`nba.com/news`. Both lead to the same place, but the text differs. Comparing addresses
character by character would therefore miss many duplicates.

Instead, the application derives a simplified form of each address and compares those.
Differences fall into two categories, handled differently.

### Differences treated as identical

These differences never change which page is served, so addresses differing only in
these respects are treated as the same bookmark and a second copy is not created.

| Difference           | Explanation                                                                                                             | Example                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Capitalization       | The site name is not case-sensitive                                                                                     | `NBA.com/news` = `nba.com/news`                    |
| Section marker       | The `#` and anything after it scrolls to a section of a page rather than changing the page                              | `nba.com/news#scores` = `nba.com/news`             |
| Marketing parameters | Values such as `utm_source` and `fbclid` are added by newsletters and advertisements to track where a visitor came from | `nba.com/news?utm_source=twitter` = `nba.com/news` |
| Explicit port number | `:443` and `:80` are the values already used by default                                                                 | `nba.com:443/news` = `nba.com/news`                |

### Differences that require your decision

The following usually indicate the same page, but not reliably enough to merge
automatically:

```
nba.com/news        www.nba.com/news        http://nba.com/news/
```

When you add an address of this kind, the application reports that a similar bookmark
already exists and displays it. You may either add the tags and notes you entered to
the existing bookmark, or keep both as separate entries.

During an import the behavior is deliberately reversed: these entries are imported and
then listed for review. An unnecessary duplicate can be deleted afterwards, whereas a
bookmark discarded on the basis of an incorrect assumption is lost without notice.

### Limits of the matching

Beyond the marketing parameters listed above, the portion of an address following `?` is
never discarded, because it frequently identifies the page itself. Every YouTube video,
for example, is served from `youtube.com/watch`, and only the `?v=...` value
distinguishes one video from another. Removing it would reduce an entire video
collection to a single bookmark.

Equivalences that hold only for particular websites are also out of scope — `youtu.be`
links against full YouTube addresses, or mobile against desktop versions of a site. Each
would require a rule specific to that one website, and the set of such rules has no
natural limit.

### Effect on stored data

Addresses are stored exactly as entered. Simplification is applied only when comparing
two addresses; it never alters your bookmarks or the contents of `bookmarks.toml`.

## Storage

Bookmarks are held in a single text file, by default at:

```
~/.bookmarks/bookmarks.toml
```

The file is kept outside the application directory so that rebuilding or reinstalling
the application cannot affect your data. To store it elsewhere, set the
`BOOKMARKS_FILE` environment variable:

```bash
BOOKMARKS_FILE=/path/to/bookmarks.toml npm run dev
```

A web address is the only field required to add a bookmark by hand:

```toml
[[bookmark]]
url = "https://example.com"
```

The remaining fields — title, description and icon — are filled in automatically the
next time the application loads.

**Note on editing the file directly.** Whenever the application saves, it rewrites the
entire file in a standard layout. All bookmark data is preserved, but formatting is not:
fields are reordered and spacing is normalized, and any comments placed among the
bookmark entries are discarded. Editing the file is fully supported; only comments
written between entries will not survive. The explanatory comments at the top of the
file are generated by the application and are always present.

## Scripts

```bash
npm run dev        # development server, reloading as files change
npm run build      # produce a standalone build in build/
npm run preview    # serve that build locally
npm test           # run the unit tests
npm run check      # type-check the project
npm run format     # apply code formatting
```

## Running in production

`npm run dev` is intended for development. For everyday use, build the application once
and run the result:

```bash
npm run build
node build         # honors BOOKMARKS_FILE, if set
```
