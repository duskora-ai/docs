# docs.duskora.ai

Public product docs for [Duskora.ai](https://duskora.ai), served at [docs.duskora.ai](https://docs.duskora.ai) by GitHub Pages from `main`. Set up the same way as the website repo: plain HTML and CSS, no build step. Edit the HTML and push. `CNAME` sets the custom domain.

Links in the Duskora app point here, so this repo must stay public and must never link to the private `duskora-ai/duskora` repo (the e2e check `pages never link to the private product repo` enforces this).

## Layout

- `index.html`: the docs home, listing every guide.
- `<section>/<guide>/index.html`: one guide per folder so URLs stay clean (for example `aws/iam-policy/`).
- `styles.css`, `fonts/`, `logo.svg` and the favicons are copied from the website repo. The docs-only rules are at the bottom of `styles.css`.

To add a guide, copy `aws/iam-policy/index.html`, update its title, description, canonical and `og:*` tags, link it from `index.html`, add it to `sitemap.xml` and to `PAGES` in `e2e/site.spec.ts`.

## AWS IAM policy

`aws/iam-policy.json` is served as-is (the page links it and the AWS CLI example downloads it) and `aws/iam-policy/index.html` shows the same JSON. The e2e check keeps the two equal and requires a table row for every action.

The source of truth is `docs/aws-iam-policy.json` in the Duskora repo, where a test keeps it equal to the actions the app checks (`AWS_REQUIRED_PERMISSIONS`). When that file changes, copy it here and update the page's table in the same release, before the app ships.

## Tests

`pnpm install && pnpm test:e2e` runs the Playwright checks in `e2e/` against a built-in static server (browsers: `pnpm exec playwright install chromium` if missing).
