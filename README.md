# Ishara – Dumb Charades

*Ishara* (इशारा) means "a gesture" or "a signal". It's a progressive web app for playing dumb charades with **English and Hindi movies**, built in a bright, light Material Design 3 style with sky-blue accents and pastel tiles. There's no build step and no server code, and it works fully offline once loaded.

## How it works

One screen, one button. Tap **Get a movie** and a random English or Hindi movie appears; tap **Next movie** for another.

- ~1,500 movies, picked at random; none repeats until you've seen them all
- The card shows the number of words and the letters in each word (handy for signalling), plus the language and year
- Light, bright Material 3 Expressive look with sky-blue accents
- Installable to the home screen and works offline

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
