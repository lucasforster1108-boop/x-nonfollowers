# x-nonfollowers

[简体中文](README.md) | English | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

Find the people on X (formerly Twitter) who you follow but who don't follow you back. Two ways to use it — pick either:

- **Method A (recommended): a browser userscript.** Two badges: ① open your following list and anyone who hasn't followed you back gets a red "Not following back" badge right under their avatar; ② while scrolling your timeline, authors you follow get a green "Following" badge under their avatar. What you see is what you get.
- **Method B: an archive comparison script.** Don't want to install a script? Compare X's official data archive offline and get the list.

Neither uses the official API or scrapes anything. Script A doesn't even send any extra network requests.

---

## Method A: the follow-badge userscript

File: [`userscript/x-follow-badge.user.js`](userscript/x-follow-badge.user.js)

### How it works

X's web app already knows the follow relationship between you two (the "Follows you" hint on profiles is proof) — it just doesn't show it in lists or timelines. This script listens in on the data the page loads for itself and marks the results in place:

- **Following list page**: hasn't followed you back → a small red pill badge "未回关" (not following back) under the avatar; mutual follows get no badge.
- **Scrolling posts** (home timeline etc.): the author is someone you follow → a green "已关注" (following) badge under the avatar; authors you don't follow get no badge.

It sends no extra requests, collects no data, and never unfollows anyone. Display only.

### Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) in your browser (Chrome / Edge / Firefox; on Android use Firefox + Tampermonkey)
2. Open `userscript/x-follow-badge.user.js` in this repo and click **Raw** — Tampermonkey will pop up the install confirmation; click Install (if you have an older version, the same steps update it)
3. Open your own following page `x.com/yourusername/following` and scroll to see the "not following back" badges; go back to the home timeline and look for the "following" badges while scrolling

### Limitations

- Only works with x.com open in a browser; userscripts can't be installed in the official X app.
- "Not following back" badges only appear on your own following page; "following" badges appear in timelines, and your own posts are never badged.
- If X changes its interface fields in a redesign, the badges may stop working — the script checks several fallback field locations, but if it really breaks, open an issue or wait for an update.

---

## Method B: the archive comparison script

File: `x_nonfollowers.py` (Python 3.8+, standard library only, nothing to install)

### Get your archive first

X's official data export is free: Settings and privacy → Your account → **Download an archive of your data** → verify your password and submit → wait for it to be generated (a few hours to a day or two) → download the zip.

### Run

```bash
# Feed it the zip directly
python x_nonfollowers.py twitter-2026-11-10.zip

# Or extract it and feed the folder (the script finds the files under data/ itself)
python x_nonfollowers.py ./twitter-2026-11-10

# Export the list as a spreadsheet or a web page (clickable links)
python x_nonfollowers.py twitter-2026-11-10.zip --csv out.csv --html out.html

# Also list the mutual follows
python x_nonfollowers.py twitter-2026-11-10.zip --show-mutual
```

Try it first with the fake data bundled in the repo:

```bash
python x_nonfollowers.py examples
```

### Limitations

- **IDs only, no usernames.** X archives store numeric IDs only — that's a limit of the official format. The result includes a profile link for each ID; click it to see who it is.
- **The data is a snapshot from the moment you requested it.** For later changes, request a fresh archive.

---

## Privacy

Both tools do all processing locally on your machine. Never share your data archive with anyone — it contains your complete account data.

## License

MIT
