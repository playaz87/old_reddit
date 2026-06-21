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

const START_URL = 'https://old.reddit.com/r/all/';

/** Re-inject the viewport + stylesheet into whatever page is currently loaded. */
async function injectStyles(): Promise<void> {
  try {
    await InAppBrowser.executeScript({ code: buildInjectionCode() });
  } catch {
    /* webview may be momentarily unavailable mid-navigation — ignore */
  }
}

/**
 * Open a URL in the device's default browser (Chrome Custom Tab on Android,
 * SFSafariViewController on iOS) rather than the managed reddit WebView. The
 * injected page script (see ./old-reddit-mobile.ts) intercepts taps on
 * non-reddit links and asks for this via window.mobileApp.postMessage.
 */
async function openExternal(url: string): Promise<void> {
  try {
    await InAppBrowser.open({
      url,
      showArrow: true,
      showTitle: true,
      urlBarHidingEnabled: true,
      toolbarColor: '#1a1a1b',
    });
  } catch {
    /* nothing sensible to do if the OS can't present a browser — ignore */
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

  // The injected page script posts here to hand a non-reddit link off to the
  // system browser instead of letting it load inside the reddit WebView.
  await InAppBrowser.addListener('messageFromWebview', (event) => {
    const detail = event?.detail;
    if (detail && detail.action === 'openExternal' && typeof detail.url === 'string') {
      void openExternal(detail.url);
    }
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
      // Keep target="_blank" links (some media / cross-posts) in the same
      // managed webview so they get styled and never bounce to the system
      // browser or new reddit; the in-page rewrite also pins them to old.reddit.
      openBlankTargetInWebView: true,
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
