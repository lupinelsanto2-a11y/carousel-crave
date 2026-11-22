# Carousel Crave

Design seamless Instagram carousels on one wide canvas, then export each panel as a separate image.

## Run locally

```bash
bun install        # or: npm install
bun run dev        # or: npm run dev
```

## Publish on GitHub Pages

This repo is already set up for it — a GitHub Actions workflow (`.github/workflows/deploy.yml`) builds the app as a static site and publishes it on every push to `main`.

1. Create a new repository on GitHub and push this code to it.
2. In the repo on GitHub, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push a commit to `main` (or run the workflow manually from the **Actions** tab).

Your site will be live at `https://<your-username>.github.io/<repo-name>/`.

The workflow automatically sets the correct base path from your repository name, so no config changes are needed.

## Build manually

```bash
bun run build
```

The static site is output to `dist/client/` — that folder can be hosted on any static file host.
