# Old Reddit Mobile

An Android app that loads **old.reddit.com** in a native WebView and injects a
responsive stylesheet so the classic old-reddit layout is comfortable on a phone.
It uses the public website only — **no Reddit API** — so it is unaffected by
Reddit's API-key revocation. You log in with your normal reddit username/password
inside the app and the session persists.

## How it works

- The app's own WebView only shows a splash screen (`index.html`).
- On launch (`src/main.ts`) it opens a full-screen in-app WebView
  ([`@capgo/capacitor-inappbrowser`](https://www.npmjs.com/package/@capgo/capacitor-inappbrowser))
  pointed at `https://old.reddit.com/`.
- On every page load it injects a mobile viewport + stylesheet
  (`src/old-reddit-mobile.ts`). `preShowScript` styles the first page *before* it
  is shown (no flash of unstyled desktop reddit); `urlChangeEvent` /
  `browserPageLoaded` re-inject on every subsequent navigation.
- The Android hardware back button navigates the webview's history
  (`activeNativeNavigationForWebview`).

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
- **External links** currently open inside the same WebView (hardware back
  returns). Routing non-reddit links to the system browser is an easy future
  addition in `src/main.ts`.
- **Dark mode** is not themed in v1. Easiest add: DarkReader via `preShowScript`
  (the plugin supports it) or reddit's own night mode with an account pref.
- Old reddit markup is stable but not frozen — treat the CSS selectors as living
  code.

## Project layout

```
index.html                  splash screen shown until reddit loads
src/main.ts                 opens the webview + wires up style injection
src/old-reddit-mobile.ts    the responsive CSS + injection snippet
capacitor.config.ts         appId / appName / android config
android/                    generated native project (open this in Android Studio)
```
