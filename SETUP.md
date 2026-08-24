# My People — one-time setup

Run these once, in order, from inside this project folder (after it's pushed into
`six-five-apps-my-people` on GitHub and cloned locally in VS Code).

## 1. Install Wrangler (Cloudflare's CLI), if you don't have it

```
npm install -g wrangler
wrangler login
```

`wrangler login` opens a browser tab to authorize your Cloudflare account.

## 2. Create the D1 database

```
wrangler d1 create six-five-apps-my-people
```

This prints a `database_id`. Copy it into `wrangler.toml`, replacing
`REPLACE_WITH_YOUR_DATABASE_ID`.

## 3. Apply the schema to that database

```
wrangler d1 execute six-five-apps-my-people --remote --file=./schema.sql
```

## 4. Push everything to GitHub

```
git add .
git commit -m "Initial My People build"
git push
```

## 5. Connect Cloudflare Pages to the repo

In the Cloudflare dashboard: Workers & Pages → Create → Pages → Connect to Git →
pick `six-five-apps-my-people`. Build settings: no build command, output directory
`public`. Deploy.

## 6. Bind the D1 database to the Pages project

Pages project → Settings → Functions → D1 database bindings → Add binding.
Variable name: `DB`. Database: `six-five-apps-my-people`. Save, then redeploy
(Deployments tab → Retry deployment) so the binding takes effect.

## 7. Lock it down with Cloudflare Access

Zero Trust → Access → Applications → Add an application → Self-hosted. Point it
at your Pages domain (or the custom subdomain once you set one up). Add a policy
that only allows your email in. No code changes needed for this part.

Once steps 1-6 are done the site is live and saving to a real database. Step 7
is what keeps it private to you.
