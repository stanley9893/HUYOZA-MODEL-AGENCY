# Huyoza Model Agency — Site + Backend

## What's in here
- `server.js` — the backend (pure Node.js, no npm install needed)
- `public/index.html` — the public site (landing page + application form)
- `public/admin.html` — password-protected dashboard to view/manage applications
- `applications.json` — created automatically the first time someone applies (not included — it's git-ignored)

## Run it locally
```
node server.js
```
Then open `http://localhost:3000` for the site, and `http://localhost:3000/admin.html` for the admin dashboard.

Default admin password is `changeme` — **change this before deploying** (see below).

## Deploy it for real (Render, free tier)

1. Create a [Render](https://render.com) account.
2. Push this folder to a GitHub repo.
3. On Render: **New → Web Service** → connect the repo.
4. Settings:
   - **Build command:** (leave blank — no dependencies to install)
   - **Start command:** `node server.js`
5. Under **Environment**, add:
   - `ADMIN_PASSWORD` = a strong password only you know
6. Deploy. Render gives you a live URL like `https://huyoza-agency.onrender.com`.
7. (Optional) In Render's settings, add your own domain under **Custom Domains**, and update your domain's DNS as instructed.

This also works on Railway, Fly.io, or any host that runs Node — set the start command to `node server.js` and set the `ADMIN_PASSWORD` environment variable.

## Tested and working (as of last update)
Full end-to-end test pass confirmed:
- Homepage and admin page load
- Valid applications submit and save
- Missing fields, underage applicants, and malformed requests are all rejected (400)
- Admin routes reject requests with no password or the wrong password (401)
- Admin routes return applications correctly with the right password
- Status updates (new → contacted → rejected) save correctly
- Unknown routes return 404

## One important limitation
Applications are stored in a flat file (`applications.json`) on the server's disk.
- On Render's **free tier**, the disk is wiped on redeploy — add a paid **persistent disk** ($1/mo) if you want data to survive redeploys.
- There's no automatic backup. Periodically export applications via the admin dashboard, or ask for a "download as CSV" feature to be added.

## Using the admin dashboard
1. Go to `/admin.html`
2. Enter the `ADMIN_PASSWORD` you set
3. See every applicant, sorted newest first, with total/new/contacted/rejected counts
4. Change an applicant's status from the dropdown — it saves automatically

## Changing the admin password later
Update the `ADMIN_PASSWORD` environment variable on your host and redeploy — no code changes needed.
