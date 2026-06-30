# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

No build step required. Open `index.html` directly in a browser, or serve locally:

```bash
python -m http.server 8000
# then visit http://localhost:8000
```

## Architecture

This is a zero-dependency vanilla JS app. No package manager, no bundler, no framework.

**Two-module design:**

- `js/storage.js` — Singleton object (`BucketStorage`) that owns all LocalStorage I/O. Every read/write goes through here. Data is stored as a JSON array under the key `bucketList`.
- `js/app.js` — `BucketListApp` class instantiated as the global `app`. Calls `BucketStorage` for data, then re-renders the full list on every state change (`this.render()`).

**Rendering model:** There is no virtual DOM or diffing. `render()` replaces `innerHTML` of `#bucketListContainer` on every mutation. Inline `onclick="app.handleX(...)"` attributes in generated HTML rely on `app` being a global.

**CSS layering:** Tailwind CSS is loaded via CDN and handles layout/spacing. `css/styles.css` overrides Tailwind for custom visuals (gradients, card borders, hover lifts). When Tailwind and the custom CSS conflict, use `!important` in `styles.css` or add a more specific selector.

## Data Shape

Each item stored in LocalStorage:
```js
{
  id: "1730880000000",   // Date.now().toString() at creation
  title: "string",
  completed: false,
  createdAt: "ISO string",
  completedAt: null      // ISO string when completed, null otherwise
}
```

## Key Conventions

- New items are prepended (`unshift`) so the list shows newest first.
- `BucketStorage` methods always call `load()` before mutating — there is no in-memory cache; LocalStorage is the single source of truth.
- Item HTML is generated in `createBucketItemHTML()` in `app.js`. The `.bucket-item` and `.completed-item` CSS classes on the wrapper drive card appearance; `.btn-edit` / `.btn-delete` classes drive action button styles.
- Filter state (`all` / `active` / `completed`) lives only in `BucketListApp.currentFilter`; filtering is done by `BucketStorage.getFilteredList()` on every render.
