# Ishara – Dumb Charades

*Ishara* (इशारा) means "a gesture" or "a signal". It's a progressive web app for playing dumb charades with **English and Hindi movies**, built in a bright, light Material Design 3 style with sky-blue accents and pastel tiles. There's no build step and no server code, and it works fully offline once loaded.

## Features

- **A simple randomizer**: ~1,500 English and Hindi movies, picked at random with no filters to set
- **Team game**: 2–6 named teams, with a choice of time to act, turns per team and passes per turn. Each guessed movie scores 1 point
- **Quick pick**: shows a random movie, with an optional timer
- The movie card shows the number of words and the letters in each word, to help the actor signal, plus the language and year
- While the timer runs, the title is covered; press and hold to peek
- Beeps and vibration for the last 5 seconds, and the screen stays on while the timer runs
- Movies already played don't repeat until the list runs out (you can reset this)
- Material 3 Expressive design: big pastel tiles, sky-blue accents (`#2AB6F6`), light theme
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
