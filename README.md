# drewroen.com

Static site, served by GitHub Pages straight from `main` at `/` — what is
committed is what ships, no build step. Live at
https://drewroen.github.io/drewroen.com/

- `index.html` — entry page, with a link to each section
- `sandbox/` — one directory per stat (`index.html` + `data.json` + `chart.js`),
  listed in `sandbox/index.html`
- `blog/` — markdown posts, listed in `blog/index.html`
- `css/style.css` — all styling, including the design tokens
- `js/` — `tables.js` (sortable data tables), `markdown.js` (renders a post),
  `post-list.js` (fills the blog index)

## Writing a blog post

Markdown, rendered in the browser — no build step:

1. `blog/<slug>/index.md` — the post itself. Its first `# Heading` becomes the
   page title and the browser tab title.
2. `blog/<slug>/index.html` — the post page. Copy it from any existing post;
   the only per-post thing in it is nothing at all, it fetches `./index.md`.
3. `blog/posts.json` — add one entry: `{ "slug": "<slug>", "title": "…", "date": "YYYY-MM-DD" }`.
   The index lists posts newest first.

`marked` is pinned with a version and an integrity hash in the post page's script
tag; it is the one CDN dependency on the site. Without JavaScript a post page
shows a link to its raw markdown and the index shows "No posts yet.".
