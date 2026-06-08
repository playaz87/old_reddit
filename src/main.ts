import {
  InAppBrowser,
  ToolBarType,
  BackgroundColor,
} from '@capgo/capacitor-inappbrowser';
import { buildInjectionCode } from './old-reddit-mobile';

/**
 * Entry point. The app's own WebView only ever shows the splash screen
 * (index.html); the real UI is a full-screen in-app WebView pointed at
 * old.reddit.com, into which we inject a mobile-friendly stylesheet on every
 * page load. See ./old-reddit-mobile.ts for the styling itself.
 */

const START_URL = 'https://old.reddit.com/';

/** Re-inject the viewport + stylesheet into whatever page is currently loaded. */
async function injectStyles(): Promise<void> {
  try {
    await InAppBrowser.executeScript({ code: buildInjectionCode() });
  } catch {
    /* webview may be momentarily unavailable mid-navigation — ignore */
  }
}

function setStatus(text: string): void {
  const el = document.getElementById('status');
  if (el) el.textContent = text;
}

async function launch(): Promise<void> {
  // Register listeners before opening so we never miss a navigation.

  // Fires on each in-page navigation (old reddit uses full page loads, so this
  // marks a fresh document that needs the stylesheet re-applied).
  await InAppBrowser.addListener('urlChangeEvent', () => {
    void injectStyles();
  });

  // Fires once a page's DOM is ready — the reliable moment to (re)style.
  await InAppBrowser.addListener('browserPageLoaded', () => {
    void injectStyles();
  });

  await InAppBrowser.addListener('pageLoadError', () => {
    setStatus('Could not load reddit. Check your connection and reopen the app.');
  });

  try {
    await InAppBrowser.openWebView({
      url: START_URL,
      // Full-screen: no plugin toolbar, the page is the whole app.
      toolbarType: ToolBarType.BLANK,
      backgroundColor: BackgroundColor.BLACK,
      // Keep the splash visible until reddit has loaded, then present the
      // webview already styled (preShowScript runs before it is shown) so the
      // user never sees raw, unstyled desktop old-reddit.
      isPresentAfterPageLoad: true,
      preShowScript: buildInjectionCode(),
      // Android hardware back button navigates the webview's history.
      activeNativeNavigationForWebview: true,
      // Lets you attach chrome://inspect during development; harmless in prod.
      isInspectable: true,
    });
  } catch (err) {
    setStatus('Failed to open reddit: ' + String(err));
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void launch());
} else {
  void launch();
}
