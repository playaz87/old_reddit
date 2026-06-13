# Old Reddit Mobile

An Android app that loads **old.reddit.com** in a native WebView and injects a
clean, Reddit-is-Fun-style mobile layer so the classic old-reddit experience is
comfortable on a phone. It uses the public website only — **no Reddit API** — so
it is unaffected by Reddit's API-key revocation. You log in with your normal
reddit username/password inside the app and the session persists.

## Features

- **Clean dark restyle** — old reddit collapsed to a single-column, card-based,
  dark theme with large tap targets. Per-subreddit custom stylesheets are
  stripped so every subreddit looks consistent.
- **Subreddit switcher** — a fixed top bar + slide-in drawer (tap ☰). From it
  you can:
  - type any subreddit and go straight to it (Enter or the "Go to r/…" row),
  - search *all* of reddit as you type (not just subs you follow),
  - browse your **subscribed** subreddits,
  - jump to **Front Page / Popular / All**.
- **Favourites & history (RIF-style)** — star any subreddit (★ in the bar or
  next to any row) to save it without subscribing, and every subreddit you visit
  is remembered under **Recent**. Both persist across sessions in the
  old.reddit.com origin's `localStorage`.
- **No bounce to new reddit** — any `*.reddit.com` link (galleries, media,
  "continue this thread", cross-posts) is rewritten to `old.reddit.com`, so
  images and posts never open in the new-reddit UI.

## How it works

- The app's own WebView only shows a splash screen (`index.html`).
- On launch (`src/main.ts`) it opens a full-screen in-app WebView
  ([`@capgo/capacitor-inappbrowser`](https://www.npmjs.com/package/@capgo/capacitor-inappbrowser))
  pointed at `https://old.reddit.com/`.
- On every page load it injects a mobile viewport, the stylesheet, and the
  switcher / link-hardening JS (`src/old-reddit-mobile.ts`). `preShowScript`
  styles the first page *before* it is shown (no flash of unstyled desktop
  reddit); `urlChangeEvent` / `browserPageLoaded` re-inject on every subsequent
  navigation. All injection is idempotent.
- The Android hardware back button navigates the webview's history
  (`activeNativeNavigationForWebview`); `openBlankTargetInWebView` keeps
  `target="_blank"` links inside the styled webview.

## Prerequisites

- **Android Studio** (brings the Android SDK + its own bundled JDK 21).
  > Note: the system Java here is 24, which the Android Gradle Plugin does **not**
  > support. Building inside Android Studio is recommended because it uses its
  > bundled JDK automatically. For CLI builds, point Gradle at a JDK 17–21 (e.g.
  > set `JAVA_HOME`, or `org.gradle.java.home` in `~/.gradle/gradle.properties`).
- Node (already present).

## First-time setup

```bash
npm install
npm run build          # builds web assets into dist/
npx cap sync android   # copies web assets + plugins into the android/ project
```

## Run on your phone (Android Studio)

1. On the phone: **Settings → About phone → tap Build number 7×** to unlock
   Developer options, then **Developer options → enable USB debugging**.
2. Plug the phone into the Mac; accept the "Allow USB debugging" prompt.
3. In Android Studio: **Open** this project's `android/` folder. Let Gradle sync
   (it may download SDK Platform 36 / build-tools the first time).
4. Pick your phone in the device dropdown and click **Run** (▶).

To install a shareable APK instead: **Build → Build Bundle(s)/APK(s) → Build APK(s)**;
the debug APK lands in `android/app/build/outputs/apk/debug/`.

## Iterating on the styling

The look lives entirely in `src/old-reddit-mobile.ts` (the `oldRedditMobileCss`
string). After editing:

```bash
npm run build && npx cap sync android
```

then re-run from Android Studio.

**Tip:** the in-app WebView is launched with `isInspectable: true`, so with the
phone plugged in you can open `chrome://inspect` in desktop Chrome, inspect the
live reddit page, and tweak selectors there before baking them into the CSS.

## Notes / known limits

- **Login:** use reddit **username/password**. "Continue with Google/Apple"
  buttons are typically blocked inside WebViews (`disallowed_useragent`).
- **Subscribed list & all-reddit search** need you to be logged in (they call
  old.reddit's own JSON endpoints with your session cookie). Favourites, history
  and typing a subreddit by name work logged-out too. The subscribed list is
  cached for an hour and refreshed when you open the drawer.
- **External (non-reddit) links** open inside the same WebView; the hardware
  back button returns. Only reddit hostnames are rewritten — image hosts
  (`i.redd.it`, `preview.redd.it`) and third-party sites are left untouched.
- Old reddit markup is stable but not frozen — treat the CSS selectors and the
  injected DOM hooks as living code.

## Project layout

```
index.html                  splash screen shown until reddit loads
src/main.ts                 opens the webview + wires up style injection
src/old-reddit-mobile.ts    the responsive CSS + injection snippet
capacitor.config.ts         appId / appName / android config
android/                    generated native project (open this in Android Studio)
```
