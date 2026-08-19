# Apothéra — setup guide

This has two parts now:
- `public/index.html` — the website people see
- `server.js` — a small backend that holds your API key and talks to Google's Gemini API on the website's behalf

The website never touches your API key directly. That's what makes it safe to actually publish.

This version runs on **Google Gemini**, which has a genuinely usable free tier — good for getting started without spending anything.

## 1. Get a free API key

1. Go to https://aistudio.google.com/apikey
2. Sign in with a Google account
3. Click "Create API key" — copy it somewhere safe

Gemini's free tier has rate limits (a certain number of requests per minute/day), but no cost, so this is enough to run and test the real site.

## 2. Run it locally first (to test)

You'll need Node.js installed (nodejs.org — get the LTS version).

```
cd apothera
npm install
GEMINI_API_KEY=your-key-here npm start
```

Then open http://localhost:3000 in your browser. Try uploading a photo — it should work end-to-end now, for free.

## 3. Put it online so people can actually use it

Easiest free/cheap options, in order of simplicity:

**Render.com** (recommended for beginners)
1. Push this folder to a GitHub repo
2. On Render, "New Web Service" → connect the repo
3. Build command: `npm install` — Start command: `npm start`
4. In "Environment", add `GEMINI_API_KEY` = your key
5. Deploy — you'll get a live URL like `apothera.onrender.com`

**Railway.app** — same idea, also has a simple free tier to start.

**A domain name** — once it's live on Render/Railway, you can point a purchased domain (e.g. from Namecheap or GoDaddy) at it if you want something like `apothera.com` instead of the free subdomain.

## 4. Before you sell it — a few honest notes

- **Free tier limits**: Gemini's free tier caps how many requests can happen per minute and per day. Fine for testing and a small early audience — if this really takes off and you start charging, you'll eventually want to add billing on the Google Cloud side to raise those limits.
- **The rate limiter** in `server.js` is basic (in-memory, resets if the server restarts). It stops casual abuse but isn't bulletproof — fine to launch with, worth upgrading if traffic grows.
- **Liability**: this tool gives general information, never diagnoses or doses. Keep it that way — a "made a wrong call and someone got hurt" scenario is the real risk in this space. Consider adding actual Terms of Service and a clearer medical disclaimer before charging money for it.
- **This isn't legal advice** — if you're planning to actually sell a health-information product, it's worth a quick read on what disclosure your country/state requires for this kind of tool.

