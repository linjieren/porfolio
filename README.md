# Ella Ren — Selected Work

Reading edition of Ella Ren’s (Linjie Ren) selected-work portfolio. The page is a designed site: an index, five case studies, native video, and a contact close. It is not a set of slide screenshots.

Canonical public copy and media come from the approved nine-slide portfolio. Prototypes, illustrative concepts, team work, and films stay labelled as such.

## Local preview

```bash
npm ci
npm run build
npm run preview
```

Open `http://127.0.0.1:4173/porfolio/`.

The project is published from `linjieren/porfolio`, so every asset path assumes the GitHub Pages base `/porfolio/`. This repository does not replace [linjieren.github.io](https://linjieren.github.io/).

## GitHub Pages

Production URL, once Pages is enabled and a deployment has succeeded:

https://linjieren.github.io/porfolio/

Workflow: `.github/workflows/pages.yml`

It builds with Vite (`base: '/porfolio/'`) and deploys the `dist` folder with the official GitHub Pages actions. A push to `main` runs it. `workflow_dispatch` is also enabled.

### If the site is not live yet

Someone with admin access on `linjieren/porfolio` needs to:

1. Merge the portfolio pull request into `main`.
2. In **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.
3. Open the **Actions** tab and confirm “Deploy GitHub Pages” finished on the `main` commit.
4. Visit https://linjieren.github.io/porfolio/ and confirm the cover, a case study, and one video.

If the first Actions run asks to approve the `github-pages` environment, approve it for this repository only.

Do not point this project at a custom domain that belongs to another site, and do not edit `linjieren.github.io` as part of this deploy.

## What is in the repo

Public page, styles, three prototype/film videos, stills, portraits, and the slide-edition PDF. Speaker notes and the source PowerPoint are not part of the site.
