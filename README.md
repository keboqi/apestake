# APE Staking Rewards Calculator

This project is a simple static web application with Cloudflare Functions for fetching staking information. It uses HTML, CSS and JavaScript for the front end, and Cloudflare Pages Functions located in the `functions` folder.

## Project Structure

- `index.html` – main web page
- `styles.css` – styling
- `script.js` – client-side logic
- `functions/` – serverless functions used by Cloudflare Pages
- `_headers` – custom headers for responses

## Local Development

1. Install [Wrangler](https://developers.cloudflare.com/workers/wrangler/):
   ```bash
   npm install -g wrangler
   ```
2. Run the Pages preview server:
   ```bash
   wrangler pages dev
   ```
   This serves your site locally with the functions enabled at `http://localhost:8788`.

## Deploying to Cloudflare Pages

1. Push this repository to a new GitHub (or GitLab) repository.
2. Log in to your Cloudflare account and create a **Pages** project.
3. Connect the repository you just pushed.
4. **Build settings**:
   - **Framework preset**: `None`
   - **Build command**: leave empty (static site)
   - **Build output directory**: `.` (the root of the repo)
5. Cloudflare automatically detects the `functions/` directory and deploys the Pages Functions along with the static assets.
6. Once the build finishes, your site will be live and API routes will be available under `/api/*`.

For more details, see the [Cloudflare Pages documentation](https://developers.cloudflare.com/pages/).
