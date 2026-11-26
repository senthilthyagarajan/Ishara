# Ishara – Dumb Charades

*Ishara* (इशारा) means "a gesture" or "a signal". It's a progressive web app for playing dumb charades with **English and Hindi movies**, built in a bright, light Material Design 3 style with sky-blue accents and pastel tiles. There's no build step and no server code, and it works fully offline once loaded.

## How it works

Two tabs at the bottom:

**Movies**: pick **Easy**, **Medium** or **Hard**, then tap **Get a movie**. A random English or Hindi movie at that level appears; tap **Next movie** for another. The home button (or the phone's back gesture) returns to the start.

- ~1,500 movies; none repeats until you've seen every movie at that level
- The card shows the number of words and the letters in each word (handy for signalling), plus the language, year and level
- A 90-second timer starts with each movie: tap it to pause or resume. It turns red for the last 10 seconds, beeps for the last 5 and buzzes at zero, and the screen stays on while it runs

**Scores**: add up to 6 teams, rename them, and tap **+** / **−** to keep score. The leader gets a 👑. Scores are saved on the phone, so they survive closing the app; **Reset scores** sets everyone back to 0.

Light, bright Material 3 Expressive look with sky-blue accents. Installable to the home screen and works offline.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

A service worker needs `http://localhost` or HTTPS, so opening `index.html` directly from disk won't make the app installable.

## Deploy

It's all static files, so any static host works. For GitHub Pages: **Settings → Pages → Deploy from a branch → `main` / root**. The app will then be at `https://<user>.github.io/Ishara/`. All paths are relative, so the sub-path works.

## Adding movies

Edit `movies.js`: add `"Title|Year"` to the right language and difficulty list. Films from 1990 or earlier, and duplicates, are dropped automatically. Then bump the version on every release: `CACHE` and `V` in `sw.js`, and the matching `?v=` numbers on `styles.css`, `movies.js` and `app.js` in `index.html`. Keeping them in step means a phone never mixes an old script with a new page.
