/**
 * Responsive restyle for old.reddit.com so it is comfortable on a phone.
 *
 * This is the core, living deliverable. old.reddit.com ships a fixed desktop
 * layout (no mobile viewport, ~1000px min width, tiny tap targets). The CSS
 * below is injected into the WebView on every page load to:
 *   - force a proper mobile viewport
 *   - collapse the desktop layout to a single full-width column
 *   - hide the right sidebar and the noisier header chrome
 *   - bump font sizes and tap-target sizes (vote arrows, links, buttons)
 *   - tame deep comment-tree indentation
 *   - hide promoted / ad posts
 *
 * Treat the selectors as living code: old reddit markup is stable but not
 * frozen. Tweak freely while testing against real pages.
 */
export const oldRedditMobileCss = `
/* ---- global box model / kill horizontal overflow ---------------------- */
*, *::before, *::after { box-sizing: border-box !important; }

html, body {
  min-width: 0 !important;
  max-width: 100% !important;
  overflow-x: hidden !important;
  -webkit-text-size-adjust: 100% !important;
}

body {
  font-size: 15px !important;
  line-height: 1.45 !important;
}

/* ---- hide desktop-only chrome ---------------------------------------- */
.side,                       /* right sidebar (subreddit info, ads, rules) */
#sr-header-area,             /* tiny top "subreddit list" bar             */
.listingsignupbar,
.infobar.listingsignup,
.footer-parent,              /* desktop footer links                       */
.debuginfo,
.promotedlink,               /* promoted posts in listings                 */
.thing.promoted,
.ad-container, .ad-container-wrap,
#ad_main, .promotedlink.promoted { display: none !important; }

/* ---- main content goes full width ----------------------------------- */
.content[role="main"],
.content {
  margin: 0 !important;
  padding: 6px 8px !important;
  width: 100% !important;
  max-width: 100% !important;
}

/* ---- header: drop the logo, lay out as stacked rows ----------------- */
#header {
  overflow: visible !important;
  position: relative !important;
  display: flex !important;
  flex-wrap: wrap !important;
  align-items: center !important;
  padding: 4px 8px !important;
}

/* remove the reddit logo / snoo to reclaim the space */
#header-img-a,
#header-img,
#header a.default-header,
#header .default-header { display: none !important; }

/* Row 1: the user / messages controls. old reddit positions this absolutely in
   the corner; pull it into the normal flow as the header's top row so it's fully
   visible and tappable. */
#header-bottom-right {
  order: 1 !important;
  flex: 1 1 100% !important;
  position: static !important;
  margin: 0 !important;
  padding: 2px 0 !important;
  background: transparent !important;
  color: inherit !important;
  text-align: right !important;
}
#header-bottom-right .user,
#header-bottom-right .user a { color: inherit !important; }

/* Row 2: page name + tab menu */
#header-bottom-left {
  order: 2 !important;
  flex: 1 1 100% !important;
  padding-bottom: 4px !important;
  min-width: 0 !important;
}

#header-bottom-left .tabmenu { overflow-x: auto !important; white-space: nowrap !important; }
#header-bottom-left .tabmenu li a,
#header-bottom-right a,
#header-bottom-right .user a {
  font-size: 14px !important;
  padding: 8px 6px !important;
  display: inline-block !important;
}

.pagename, #header .pagename { font-size: 18px !important; }

/* search box full width and tappable */
#search input[type="text"] {
  width: 100% !important;
  font-size: 16px !important;       /* >=16px stops iOS/Android zoom-on-focus */
  padding: 10px !important;
}

/* ---- link listing rows ---------------------------------------------- */
#siteTable { margin: 0 !important; }

.thing {
  padding: 6px 0 !important;
  border-bottom: 1px solid rgba(128,128,128,0.18) !important;
}

/* vote column: enlarge the touch target around the tiny sprite arrows */
.midcol {
  margin: 0 6px 0 0 !important;
  min-width: 38px !important;
}
.arrow {
  margin: 6px auto !important;
  transform: scale(1.4);
  transform-origin: center;
}

/* thumbnails: keep modest, never push layout */
.thumbnail {
  margin: 2px 8px 2px 0 !important;
  max-width: 70px !important;
  height: auto !important;
}
.thumbnail img { max-width: 70px !important; height: auto !important; }

/* titles + tagline */
.link .entry { overflow: visible !important; }
a.title {
  font-size: 16px !important;
  line-height: 1.35 !important;
  word-break: break-word !important;
}
.tagline { font-size: 12px !important; line-height: 1.5 !important; }
.tagline a, .tagline time { white-space: normal !important; }

/* the action buttons (comments / share / save ...) */
.flat-list.buttons { line-height: 2 !important; }
.flat-list.buttons li a {
  font-size: 13px !important;
  padding: 4px 6px !important;
  display: inline-block !important;
}

/* ---- self / link post body + comments ------------------------------- */
.usertext-body, .md {
  font-size: 15px !important;
  line-height: 1.55 !important;
  max-width: 100% !important;
  overflow-x: auto !important;       /* tables / code scroll, don't overflow */
}
.md img { max-width: 100% !important; height: auto !important; }

/* comment tree: shrink the per-level indent so deep threads stay readable */
.commentarea .child,
.commentarea .comment .child {
  margin-left: 8px !important;
  padding-left: 6px !important;
  border-left: 1px solid rgba(128,128,128,0.25) !important;
}
.comment .entry { padding-bottom: 2px !important; }
.comment .expand { padding: 0 6px !important; font-size: 15px !important; }

/* ---- forms (replying / posting) ------------------------------------- */
textarea, input[type="text"], input[type="password"], input[type="url"] {
  max-width: 100% !important;
  font-size: 16px !important;
}
.usertext-edit textarea, .usertext-edit .md {
  width: 100% !important;
  max-width: 100% !important;
}

/* ---- media never exceeds the viewport width ------------------------- */
/* Replaced elements: clamp width, drop any forced min-width, keep ratio. */
img, video, audio, iframe, embed, object, canvas, svg {
  max-width: 100% !important;
  min-width: 0 !important;
}
img, video, embed, object, canvas, svg {
  height: auto !important;            /* preserve aspect ratio once width is clamped */
}

/* Wrapper/containers that carry inline pixel widths (gifs, gfycat/imgur
   embeds, reddit's own video player). Constrain the box and clip overflow. */
.expando,
.media,
.media-embed,
.media-preview,
.media-preview-content,
.embedly,
.reddit-video-player-root,
.reddit-video,
[class*="gallery"],
[style*="width"] .media-preview {
  max-width: 100% !important;
  min-width: 0 !important;
  overflow: hidden !important;
}

/* Embeds with no intrinsic ratio (iframes): fill the column width rather than a
   fixed pixel width that overflows horizontally. */
.media-embed iframe,
.expando iframe { width: 100% !important; }

/* Tall / portrait media: cap to the screen in BOTH dimensions and scale by the
   element's own aspect ratio, so a portrait video/gif can't run off the bottom. */
video,
.expando img,
.media-preview img,
.media-preview-content img {
  max-width: 100% !important;
  max-height: 85vh !important;
  width: auto !important;
  height: auto !important;
  margin: 0 auto !important;
  display: block !important;
}
/* let reddit's video player box follow the (now height-capped) video */
.reddit-video-player-root { height: auto !important; max-height: 85vh !important; }
`;

/**
 * Returns a self-contained JS snippet (string) that forces a mobile viewport
 * and injects {@link oldRedditMobileCss}. Safe to run repeatedly — it is
 * idempotent (re-uses its <style> element and viewport meta).
 *
 * Built via JSON.stringify so the CSS is correctly escaped into a JS string
 * literal regardless of its contents.
 */
export function buildInjectionCode(): string {
  return `(function () {
  try {
    var head = document.head || document.documentElement;

    var v = document.querySelector('meta[name="viewport"]');
    if (!v) {
      v = document.createElement('meta');
      v.setAttribute('name', 'viewport');
      head.appendChild(v);
    }
    v.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');

    var ID = '__old_reddit_mobile_style__';
    var el = document.getElementById(ID);
    if (!el) {
      el = document.createElement('style');
      el.id = ID;
      el.setAttribute('type', 'text/css');
      head.appendChild(el);
    }
    el.textContent = ${JSON.stringify(oldRedditMobileCss)};
  } catch (e) {
    /* swallow — never break the page */
  }
})();`;
}
