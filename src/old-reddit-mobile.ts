/**
 * Mobile restyle + navigation layer for old.reddit.com.
 *
 * old.reddit.com ships a fixed desktop layout (no mobile viewport, ~1000px min
 * width, tiny tap targets) and is otherwise feature-frozen. Everything this app
 * adds therefore lives in code injected into the WebView on every page load:
 *
 *   1. A clean, dark, Reddit-is-Fun-style restyle (see {@link oldRedditMobileCss}).
 *      Per-subreddit custom stylesheets are stripped so the look is consistent.
 *   2. A subreddit switcher: a fixed top bar + slide-in drawer that lets you
 *      jump to any subreddit by typing it, search all of reddit, browse your
 *      subscribed subs, and keep starred favourites + a visited-history list
 *      (RIF-style — you can save subs without subscribing). Favourites/history
 *      persist in localStorage on the old.reddit.com origin.
 *   3. Link hardening: any *.reddit.com link (galleries, media, "continue this
 *      thread", etc.) is rewritten to old.reddit.com so nothing ever bounces
 *      the user into the new-reddit UI.
 *
 * The injected JS (see {@link switcherScript}) is plain ES5-ish browser code; it
 * runs in the page's own origin, so fetch() is authenticated and localStorage
 * is shared across navigations.
 *
 * Treat the selectors as living code: old reddit markup is stable but not
 * frozen. Tweak freely while testing against real pages.
 */
export const oldRedditMobileCss = `
/* ===================================================================== *
 *  Theme tokens
 * ===================================================================== */
:root {
  --orm-bg:      #0e0e0f;
  --orm-card:    #1a1a1b;
  --orm-card-2:  #202021;
  --orm-border:  #343536;
  --orm-hair:    rgba(128,128,128,0.16);
  --orm-text:    #d7dadc;
  --orm-muted:   #818384;
  --orm-accent:  #ff4500;
  --orm-link:    #6fb3ff;
  --orm-bar-h:   46px;
}

/* ===================================================================== *
 *  Global box model / overflow / dark base
 * ===================================================================== */
*, *::before, *::after { box-sizing: border-box !important; }

html, body {
  min-width: 0 !important;
  max-width: 100% !important;
  -webkit-text-size-adjust: 100% !important;
  background: var(--orm-bg) !important;
  color: var(--orm-text) !important;
}
/* Clip horizontal overflow on <html> ONLY. Putting overflow-x on <body> too
   makes body a second scroll container, which breaks position:sticky on the
   header. One scroll container = sticky works. */
html { overflow-x: hidden !important; }
body { overflow-x: visible !important; }

body {
  font-size: 15px !important;
  line-height: 1.45 !important;
  padding-top: var(--orm-bar-h) !important;   /* room for our fixed top bar */
  font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
}

/* Default text colour for the bulk of reddit's content containers. Kept off
   "*" so flair/sprites that rely on their own colour are left alone. */
.content, .sitetable, .thing, .entry, .usertext-body, .md, .panestack,
.commentarea, .menuarea, .infobar, p, li, td, th, dd, dt, label, .title-text {
  color: var(--orm-text) !important;
}

a, a:link { color: var(--orm-link) !important; }
.tagline, .tagline *, .subreddit, .domain, .domain a,
.flat-list.buttons li a, .comment .tagline a { color: var(--orm-muted) !important; }

/* ===================================================================== *
 *  Hide desktop-only chrome / ads / nags
 * ===================================================================== */
.side,                       /* right sidebar (subreddit info, ads, rules) */
#sr-header-area,             /* top "subreddit list" bar (our drawer replaces it) */
.listing-chooser,            /* desktop left rail (grey strip); drawer replaces it */
.listingsignupbar,
.infobar.listingsignup,
.cookie-infobar, .eu-cookie-banner, #eu-cookie-policy,
.footer-parent,              /* desktop footer links */
.debuginfo,
.promotedlink,               /* promoted posts in listings */
.thing.promoted,
.ad-container, .ad-container-wrap, .ad-container-mobile,
#ad_main, .promotedlink.promoted,
.premium-banner-outter, .gold-page-ad,
.give-gold-button, .gilded-icon { display: none !important; }

/* ===================================================================== *
 *  Main content full width
 * ===================================================================== */
.content[role="main"], .content {
  margin: 0 !important;
  padding: 4px 0 24px !important;
  width: 100% !important;
  max-width: 100% !important;
}

/* ===================================================================== *
 *  old reddit's own header — keep the sort tabs + search, drop the rest.
 *  (Our fixed bar sits above it and carries subreddit navigation.)
 * ===================================================================== */
#header {
  overflow: visible !important;
  /* Sticky directly beneath our fixed switcher bar so the sort tabs
     (hot/new/top) + search stay reachable while scrolling. */
  position: sticky !important;
  top: var(--orm-bar-h) !important;
  z-index: 2147483599 !important;   /* just under #orm-bar (…600) */
  display: flex !important;
  flex-wrap: wrap !important;
  align-items: center !important;
  padding: 4px 8px !important;
  background: var(--orm-card) !important;
  border-bottom: 1px solid var(--orm-border) !important;
}
#header-img-a, #header-img,
#header a.default-header, #header .default-header,
.pagename.redditname { display: none !important; }   /* logo + redundant name */

#header-bottom-right {
  order: 1 !important;
  flex: 1 1 100% !important;
  position: static !important;
  margin: 0 !important;
  padding: 2px 0 !important;
  background: transparent !important;
  color: var(--orm-muted) !important;
  text-align: right !important;
}
#header-bottom-right a, #header-bottom-right .user a { color: var(--orm-muted) !important; }

#header-bottom-left {
  order: 2 !important;
  flex: 1 1 100% !important;
  padding-bottom: 4px !important;
  min-width: 0 !important;
}
/* sort tabs (hot / new / top …) as a scrollable segmented chip bar */
#header-bottom-left .tabmenu {
  display: flex !important;
  gap: 6px !important;
  align-items: center !important;
  margin: 0 !important;
  padding: 4px 8px 6px !important;
  overflow-x: auto !important;
  -webkit-overflow-scrolling: touch !important;
  scrollbar-width: none !important;             /* hide the scrollbar, keep the scroll */
}
#header-bottom-left .tabmenu::-webkit-scrollbar { display: none !important; }
#header-bottom-left .tabmenu li { display: inline-block !important; margin: 0 !important; }
#header-bottom-left .tabmenu li a.choice {
  display: block !important;
  padding: 7px 14px !important;
  border-radius: 999px !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  line-height: 1 !important;
  text-transform: capitalize !important;
  white-space: nowrap !important;
  color: var(--orm-text) !important;
  background: var(--orm-card-2) !important;
  border: 1px solid var(--orm-border) !important;
}
#header-bottom-left .tabmenu li a.choice:active { background: var(--orm-border) !important; }
#header-bottom-left .tabmenu li.selected a.choice {
  background: var(--orm-accent) !important;
  color: #fff !important;
  border-color: var(--orm-accent) !important;
}

/* user / preferences / logout links on the right */
#header-bottom-right a, #header-bottom-right .user a {
  font-size: 14px !important;
  padding: 8px 6px !important;
  display: inline-block !important;
}
.pagename, #header .pagename { font-size: 16px !important; }

#search input[type="text"] {
  width: 100% !important;
  font-size: 16px !important;       /* >=16px stops zoom-on-focus */
  padding: 10px !important;
  background: var(--orm-bg) !important;
  color: var(--orm-text) !important;
  border: 1px solid var(--orm-border) !important;
  border-radius: 8px !important;
}

/* ===================================================================== *
 *  Link listing — Reddit-is-Fun style cards
 * ===================================================================== */
#siteTable, .sitetable { margin: 0 !important; }

.thing {
  background: var(--orm-card) !important;
  border: 1px solid var(--orm-border) !important;
  border-radius: 10px !important;
  margin: 6px 6px !important;
  padding: 8px 10px !important;
  overflow: hidden !important;
}
.thing.stickied { border-color: rgba(75,160,90,0.5) !important; }

/* Listing cards use flexbox instead of old reddit's floats. Floats made the
   entry content (preview button + action buttons) wrap *around* the thumbnail
   inconsistently — sometimes onto a second line. As a single flex row (NOWRAP)
   the columns are fixed: [votes] [thumbnail] [entry fills the rest], so the
   votes sit on the same row as the title and every card aligns. */
#siteTable .thing.link {
  display: flex !important;
  flex-wrap: nowrap !important;
  align-items: flex-start !important;
}
/* Pin the side columns to fixed widths so the entry's left offset is a known
   constant (used by the full-width preview rule further down). */
#siteTable .thing.link > .midcol { order: 0 !important; float: none !important; flex: 0 0 36px !important; }
#siteTable .thing.link > .thumbnail { order: 1 !important; float: none !important; flex: 0 0 70px !important; }
#siteTable .thing.link > .entry { order: 2 !important; flex: 1 1 0 !important; min-width: 0 !important; float: none !important; }
/* drop the 1./2./3. rank number and the empty presentational siblings that
   would otherwise force extra full-width rows under nowrap. */
#siteTable .thing.link > .rank,
#siteTable .thing.link > p.parent,
#siteTable .thing.link > .clearleft,
#siteTable .thing.link > .child { display: none !important; }

/* nested comment .thing should NOT get the card / flex treatment */
.commentarea .thing, .comment .thing {
  display: block !important;
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  margin: 0 !important;
  padding: 4px 0 !important;
}

/* vote column: keep the arrows a comfortable tap target. Card height is driven
   by the entry column, so arrow size here costs no extra vertical space. */
.midcol {
  margin: 0 6px 0 0 !important;
  min-width: 36px !important;
}
.arrow { margin: 4px auto !important; transform: scale(1.3); transform-origin: center; }
.midcol .score, .score.unvoted, .score.likes, .score.dislikes {
  color: var(--orm-text) !important;
  font-size: 11px !important;
  font-weight: 700 !important;
}

/* thumbnails: modest, rounded, never push layout */
.thumbnail {
  margin: 2px 10px 0 0 !important;
  width: 70px !important;
  height: auto !important;
  border-radius: 8px !important;
  overflow: hidden !important;
}
.thumbnail img { max-width: 100% !important; height: auto !important; }

/* preview / expando toggle: old reddit ships a light-grey sprite button that
   floats and jumps around. Un-float it for a consistent slot and invert the
   sprite so it reads as a dark control on the dark theme. */
.entry .top-matter .expando-button {
  float: none !important;
  display: inline-block !important;
  margin: 2px 0 !important;
  border-radius: 6px !important;
  filter: invert(0.88) !important;
}

/* Expanded preview spans the FULL card width, not just the (narrower) entry
   column. The expando is nested in .entry, which begins after the vote (+ maybe
   thumbnail) columns, so wide media (reddit-video) and text previews would
   otherwise be confined to that column. Pull the expando left by the exact width
   of the preceding columns so it reaches the card's content edge, and lift the
   inherited max-width:100% clamp (relative to .entry) so the box can widen.

   Two cases, keyed on whether the card actually has a thumbnail column (both
   media posts and self posts may have one; pure-text posts often have none):
     - with thumbnail:    midcol(36) + 6 + thumbnail(70) + 10 = 122px
     - without thumbnail:  midcol(36) + 6                      =  42px */
#siteTable .thing.link:has(> .thumbnail) .entry > .expando {
  margin-left: calc(-1 * (36px + 6px + 70px + 10px)) !important;
  max-width: none !important;
}
#siteTable .thing.link:not(:has(> .thumbnail)) .entry > .expando {
  margin-left: calc(-1 * (36px + 6px)) !important;
  max-width: none !important;
}

/* titles + tagline */
.link .entry { overflow: visible !important; }
a.title {
  font-size: 15px !important;
  line-height: 1.3 !important;
  word-break: break-word !important;
  color: var(--orm-text) !important;
  font-weight: 600 !important;
}
a.title:visited { color: #9a9c9e !important; }
.tagline { font-size: 11px !important; line-height: 1.45 !important; }
.tagline a, .tagline time { white-space: normal !important; }
.linkflairlabel, .flair {
  border-radius: 4px !important;
  font-size: 11px !important;
  padding: 1px 6px !important;
}

/* action buttons (comments / share / save ...): keep them on ONE line that
   scrolls horizontally rather than wrapping to a ragged second row. */
.flat-list.buttons {
  display: flex !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
  gap: 2px !important;
  margin-top: 2px !important;
  overflow-x: auto !important;
  white-space: nowrap !important;
  -webkit-overflow-scrolling: touch !important;
  scrollbar-width: none !important;
}
.flat-list.buttons::-webkit-scrollbar { display: none !important; }
.flat-list.buttons li { float: none !important; display: inline-block !important; margin: 0 !important; flex: 0 0 auto !important; }
.flat-list.buttons li a {
  font-size: 13px !important;
  padding: 3px 6px !important;
  display: inline-block !important;
}
.entry .buttons li a.comments { color: var(--orm-link) !important; font-weight: 600 !important; }

/* the big "next/prev page" + "load more" buttons */
.morelink, .morelink a {
  background: var(--orm-accent) !important;
  border: 0 !important;
  border-radius: 8px !important;
}
.morelink a { color: #fff !important; font-weight: 700 !important; }
.nextprev a, .morechildren a {
  background: var(--orm-card-2) !important;
  border: 1px solid var(--orm-border) !important;
  border-radius: 8px !important;
  padding: 8px 12px !important;
  color: var(--orm-text) !important;
}

/* ===================================================================== *
 *  Self / link post body + comments
 * ===================================================================== */
.usertext-body, .md {
  font-size: 15px !important;
  line-height: 1.55 !important;
  max-width: 100% !important;
  overflow-x: auto !important;
}
.md img { max-width: 100% !important; height: auto !important; }
.md a { color: var(--orm-link) !important; }
.md blockquote { border-left: 3px solid var(--orm-border) !important; color: var(--orm-muted) !important; padding-left: 10px !important; margin-left: 0 !important; }
.md code, .md pre { background: #000 !important; color: #d7dadc !important; border-radius: 6px !important; }
.md pre { padding: 8px !important; }
.md table, .md th, .md td { border-color: var(--orm-border) !important; }

.commentarea { padding: 0 6px !important; }
.comment { border: 0 !important; }
.commentarea .child, .commentarea .comment .child {
  margin-left: 8px !important;
  padding-left: 8px !important;
  border-left: 2px solid var(--orm-hair) !important;
}
.comment .entry { padding-bottom: 2px !important; }
.comment .expand { padding: 0 6px !important; font-size: 15px !important; color: var(--orm-muted) !important; }
.comment.collapsed .entry .noncollapsed { color: var(--orm-muted) !important; }
.usertext-body .md { background: transparent !important; }

/* ===================================================================== *
 *  Forms / inputs / dropdowns (replies, login, sort menus)
 * ===================================================================== */
textarea, input[type="text"], input[type="password"], input[type="url"],
input[type="search"], input[type="email"], input[type="number"], select {
  max-width: 100% !important;
  font-size: 16px !important;
  background: var(--orm-card) !important;
  color: var(--orm-text) !important;
  border: 1px solid var(--orm-border) !important;
  border-radius: 8px !important;
}
.usertext-edit textarea, .usertext-edit .md { width: 100% !important; max-width: 100% !important; }
.btn, button.btn, .pretty-button, input[type="submit"] {
  background: var(--orm-card-2) !important;
  color: var(--orm-text) !important;
  border: 1px solid var(--orm-border) !important;
  border-radius: 8px !important;
  padding: 8px 12px !important;
}
.drop-choices, .drop-choices.srdrop {
  background: var(--orm-card) !important;
  border: 1px solid var(--orm-border) !important;
}
.drop-choices a.choice { color: var(--orm-text) !important; }
.drop-choices a.choice:hover { background: var(--orm-card-2) !important; }

/* ===================================================================== *
 *  Media never exceeds the viewport
 * ===================================================================== */
img, video, audio, iframe, embed, object, canvas, svg {
  max-width: 100% !important;
  min-width: 0 !important;
}
img, video, embed, object, canvas, svg { height: auto !important; }

.expando, .media, .media-embed, .media-preview, .media-preview-content,
.embedly, .reddit-video-player-root, .reddit-video,
[class*="gallery"], [style*="width"] .media-preview {
  max-width: 100% !important;
  min-width: 0 !important;
  overflow: hidden !important;
}
.media-embed iframe, .expando iframe { width: 100% !important; }

video, .expando img, .media-preview img, .media-preview-content img {
  max-width: 100% !important;
  max-height: 85vh !important;
  width: auto !important;
  height: auto !important;
  margin: 0 auto !important;
  display: block !important;
}
.reddit-video-player-root { height: auto !important; max-height: 85vh !important; }

/* ===================================================================== *
 *  Injected subreddit switcher: top bar + drawer
 * ===================================================================== */
#orm-bar {
  position: fixed !important;
  top: 0; left: 0; right: 0;
  height: var(--orm-bar-h);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 6px;
  background: var(--orm-card);
  border-bottom: 1px solid var(--orm-border);
  z-index: 2147483600;
}
#orm-menu-btn, #orm-fav-btn {
  background: none; border: 0; color: var(--orm-text);
  font-size: 22px; line-height: 1; padding: 8px 10px; cursor: pointer;
  border-radius: 8px;
}
#orm-menu-btn:active, #orm-fav-btn:active { background: var(--orm-card-2); }
#orm-fav-btn.on { color: var(--orm-accent); }
#orm-title {
  flex: 1; min-width: 0;
  font-size: 17px; font-weight: 700; color: var(--orm-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

#orm-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.55);
  opacity: 0; visibility: hidden;
  transition: opacity .2s ease;
  z-index: 2147483601;
}
#orm-drawer {
  position: fixed; top: 0; left: 0; bottom: 0;
  width: 86%; max-width: 360px;
  background: var(--orm-card);
  border-right: 1px solid var(--orm-border);
  transform: translateX(-100%);
  transition: transform .22s ease;
  z-index: 2147483602;
  display: flex; flex-direction: column;
  box-shadow: 2px 0 18px rgba(0,0,0,0.5);
}
body.orm-open #orm-drawer { transform: translateX(0); }
body.orm-open #orm-backdrop { opacity: 1; visibility: visible; }

#orm-drawer-head { padding: 10px; border-bottom: 1px solid var(--orm-border); }
#orm-search {
  width: 100%; box-sizing: border-box;
  font-size: 16px; padding: 11px 12px;
  border-radius: 10px; border: 1px solid var(--orm-border);
  background: var(--orm-bg); color: var(--orm-text);
}
#orm-search::placeholder { color: var(--orm-muted); }

#orm-scroll { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding-bottom: 28px; }

.orm-quick { display: flex; gap: 8px; padding: 10px; }
.orm-chip {
  flex: 1; padding: 11px 6px;
  border-radius: 9px; border: 1px solid var(--orm-border);
  background: var(--orm-card-2); color: var(--orm-text);
  font-size: 14px; font-weight: 600; cursor: pointer;
}
.orm-chip:active { background: var(--orm-border); }

.orm-sec-title {
  padding: 14px 12px 4px;
  font-size: 11px; text-transform: uppercase; letter-spacing: .06em;
  color: var(--orm-muted);
}
.orm-row {
  display: flex; align-items: center;
  padding: 12px; border-bottom: 1px solid var(--orm-hair);
  cursor: pointer;
}
.orm-row:active { background: var(--orm-card-2); }
.orm-row-name { flex: 1; min-width: 0; font-size: 15px; color: var(--orm-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.orm-star {
  background: none; border: 0;
  font-size: 20px; color: #5a5a5b; padding: 4px 6px; cursor: pointer;
}
.orm-star.on { color: var(--orm-accent); }
.orm-go .orm-row-name { color: var(--orm-link); font-weight: 600; }
.orm-go-arrow { color: var(--orm-accent); font-size: 18px; padding: 0 6px; }
.orm-empty { padding: 16px 12px; color: var(--orm-muted); font-size: 13px; }

#orm-ptr {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  height: var(--orm-bar-h) !important;
  pointer-events: none !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: var(--orm-card-2) !important;
  border-bottom: 1px solid var(--orm-border) !important;
  box-shadow: 0 6px 14px rgba(0,0,0,0.35) !important;
  transform: translateY(calc(-1 * var(--orm-bar-h))) !important;
  transition: transform .16s ease !important;
  z-index: 2147483604 !important;
}
#orm-ptr-inner {
  padding: 0 12px !important;
  color: var(--orm-muted) !important;
  font-size: 13px !important;
  font-weight: 600 !important;
}
body.orm-ptr-visible #orm-ptr { transform: translateY(0) !important; }
body.orm-ptr-ready #orm-ptr-inner {
  color: var(--orm-accent) !important;
}
`;

/**
 * Plain browser JS (returned as a string) implementing the subreddit switcher,
 * favourites/history, and reddit-link hardening. Runs in the old.reddit.com
 * origin, so fetch() is authenticated and localStorage persists across loads.
 *
 * IMPORTANT: this is embedded inside the template literal returned by
 * {@link buildInjectionCode}, so it must contain no backticks and no `${`.
 */
export const switcherScript = `
function ormInit() {
  var SPECIAL = { all:1, popular:1, friends:1, mod:1 };
  var FEED_CACHE_KEY = 'orm_feed_cache_v1';
  var FEED_MARK_KEY = 'orm_feed_mark_v1';
  var FEED_SKIP_RESTORE_KEY = 'orm_feed_skip_restore_once_v1';
  var FEED_CACHE_TTL_MS = 20 * 60 * 1000;
  var FEED_MARK_TTL_MS = 30 * 60 * 1000;
  var FEED_SKIP_RESTORE_TTL_MS = 15 * 1000;
  var FEED_CACHE_MAX = 10;
  var PTR_THRESHOLD_PX = 92;
  var PTR_MAX_PULL_PX = 140;
  var ptrActive = false;
  var ptrStartY = 0;
  var ptrPull = 0;
  var ptrReloading = false;

  function $(id){ return document.getElementById(id); }
  function esc(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }
  function load(key, def){ try { var v = window.localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch(e){ return def; } }
  function store(key, val){ try { window.localStorage.setItem(key, JSON.stringify(val)); } catch(e){} }

  function getFavs(){ return load('orm_favs', []); }
  function getRecent(){ return load('orm_recent', []); }
  function getSubs(){ return load('orm_subs', { ts:0, names:[] }); }
  function nowMs(){ return Date.now ? Date.now() : (new Date()).getTime(); }
  function currentUrl(){ return location.origin + location.pathname + location.search; }
  function loadSession(key, def){ try { var v = window.sessionStorage.getItem(key); return v ? JSON.parse(v) : def; } catch(e){ return def; } }
  function atTop(){
    return (window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0) <= 0;
  }
  function isFeedPath(path){
    if (!path) return false;
    if (/^\\/r\\/[^\\/]+\\/comments\\//i.test(path)) return false;
    if (path === '/') return true;
    if (/^\\/(hot|new|top|rising|controversial|best)\\/?$/i.test(path)) return true;
    if (/^\\/r\\/(all|popular)\\/?$/i.test(path)) return true;
    if (/^\\/r\\/[^\\/]+\\/?$/i.test(path)) return true;
    if (/^\\/r\\/[^\\/]+\\/(hot|new|top|rising|controversial|best)\\/?$/i.test(path)) return true;
    return false;
  }
  function getFeedContainer(){
    return document.querySelector('#siteTable.sitetable')
      || document.querySelector('#siteTable')
      || document.querySelector('.sitetable');
  }
  function readFeedCache(){
    var cache = loadSession(FEED_CACHE_KEY, { entries: [] });
    if (!cache || !cache.entries || !cache.entries.length) return { entries: [] };
    var cutoff = nowMs() - FEED_CACHE_TTL_MS;
    cache.entries = cache.entries.filter(function(entry){
      return !!(entry && entry.url && entry.ts && entry.ts >= cutoff && typeof entry.html === 'string');
    });
    return { entries: cache.entries };
  }
  function writeFeedCache(entries){
    var keep = (entries || []).slice(0, FEED_CACHE_MAX);
    if (!keep.length) {
      try { window.sessionStorage.removeItem(FEED_CACHE_KEY); } catch(e){}
      return;
    }
    while (keep.length) {
      try {
        window.sessionStorage.setItem(FEED_CACHE_KEY, JSON.stringify({ entries: keep }));
        return;
      } catch(e) {
        keep.pop();
      }
    }
    try { window.sessionStorage.removeItem(FEED_CACHE_KEY); } catch(e){}
  }
  function markFeedReturn(url){
    try { window.sessionStorage.setItem(FEED_MARK_KEY, JSON.stringify({ url: url, ts: nowMs() })); } catch(e){}
  }
  function shouldRestoreFromMark(url){
    var skip = loadSession(FEED_SKIP_RESTORE_KEY, null);
    if (skip && skip.url && skip.ts) {
      if ((nowMs() - skip.ts) <= FEED_SKIP_RESTORE_TTL_MS && skip.url === url) {
        return false;
      }
      try { window.sessionStorage.removeItem(FEED_SKIP_RESTORE_KEY); } catch(e){}
    }
    var mark = loadSession(FEED_MARK_KEY, null);
    if (!mark || !mark.url || !mark.ts) return false;
    if ((nowMs() - mark.ts) > FEED_MARK_TTL_MS) {
      try { window.sessionStorage.removeItem(FEED_MARK_KEY); } catch(e){}
      return false;
    }
    if (mark.url !== url) return false;
    try { window.sessionStorage.removeItem(FEED_MARK_KEY); } catch(e){}
    return true;
  }
  function saveFeedSnapshot(){
    if (!isFeedPath(location.pathname)) return;
    var container = getFeedContainer();
    if (!container) return;
    var url = currentUrl();
    var cache = readFeedCache();
    var entries = (cache && cache.entries) ? cache.entries : [];
    entries = entries.filter(function(entry){ return entry.url !== url; });
    entries.unshift({
      url: url,
      html: container.innerHTML,
      scrollY: (window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0),
      ts: nowMs()
    });
    writeFeedCache(entries);
    markFeedReturn(url);
  }
  function restoreFeedSnapshotIfBack(){
    if (!isFeedPath(location.pathname)) return false;
    var url = currentUrl();
    if (!shouldRestoreFromMark(url)) return false;
    var cache = readFeedCache();
    var entries = (cache && cache.entries) ? cache.entries : [];
    var match = null;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i] && entries[i].url === url) { match = entries[i]; break; }
    }
    if (!match) return false;
    var container = getFeedContainer();
    if (!container) return false;
    container.innerHTML = match.html;
    setTimeout(function(){ window.scrollTo(0, Number(match.scrollY) || 0); }, 0);
    return true;
  }
  function ensurePtrUi(){
    if ($('orm-ptr')) return;
    var wrap = document.createElement('div');
    wrap.id = 'orm-ptr';
    wrap.innerHTML = '<div id="orm-ptr-inner">Pull to refresh</div>';
    document.body.appendChild(wrap);
  }
  function updatePtrUi(){
    var inner = $('orm-ptr-inner');
    if (!inner) return;
    if (ptrPull > 0) document.body.classList.add('orm-ptr-visible');
    else document.body.classList.remove('orm-ptr-visible');
    if (ptrPull >= PTR_THRESHOLD_PX) {
      document.body.classList.add('orm-ptr-ready');
      inner.textContent = 'Release to refresh';
    } else {
      document.body.classList.remove('orm-ptr-ready');
      inner.textContent = 'Pull to refresh';
    }
  }
  function resetPtrUi(){
    ptrPull = 0;
    document.body.classList.remove('orm-ptr-visible');
    document.body.classList.remove('orm-ptr-ready');
  }
  function triggerPullRefresh(){
    if (ptrReloading) return;
    ptrReloading = true;
    try {
      window.sessionStorage.setItem(FEED_SKIP_RESTORE_KEY, JSON.stringify({ url: currentUrl(), ts: nowMs() }));
    } catch(e){}
    var inner = $('orm-ptr-inner');
    if (inner) {
      document.body.classList.add('orm-ptr-visible');
      document.body.classList.remove('orm-ptr-ready');
      inner.textContent = 'Refreshing...';
    }
    location.reload();
  }
  function installPullToRefresh(){
    if (window.__ormPtrInstalled) return;
    window.__ormPtrInstalled = true;
    ensurePtrUi();
    document.addEventListener('touchstart', function(e){
      if (!isFeedPath(location.pathname) || document.body.classList.contains('orm-open') || !atTop()) { ptrActive = false; return; }
      if (!e.touches || e.touches.length !== 1) { ptrActive = false; return; }
      ptrActive = true;
      ptrStartY = e.touches[0].clientY;
      ptrPull = 0;
      updatePtrUi();
    }, { passive: true });
    document.addEventListener('touchmove', function(e){
      if (!ptrActive || ptrReloading) return;
      if (!e.touches || !e.touches.length) return;
      var dy = e.touches[0].clientY - ptrStartY;
      if (dy <= 0 || !atTop()) {
        ptrActive = false;
        resetPtrUi();
        return;
      }
      ptrPull = Math.min(PTR_MAX_PULL_PX, dy * 0.6);
      updatePtrUi();
      if (dy > 8) e.preventDefault();
    }, { passive: false });
    document.addEventListener('touchend', function(){
      if (!ptrActive || ptrReloading) { resetPtrUi(); ptrActive = false; return; }
      var shouldRefresh = ptrPull >= PTR_THRESHOLD_PX;
      ptrActive = false;
      resetPtrUi();
      if (shouldRefresh) triggerPullRefresh();
    }, { passive: true });
    document.addEventListener('touchcancel', function(){ ptrActive = false; resetPtrUi(); }, { passive: true });
  }

  function indexOfCI(arr, name){
    var l = name.toLowerCase();
    for (var i=0;i<arr.length;i++){ if (String(arr[i]).toLowerCase() === l) return i; }
    return -1;
  }
  function isFav(name){ return indexOfCI(getFavs(), name) >= 0; }
  function toggleFav(name){
    var f = getFavs(); var i = indexOfCI(f, name);
    if (i >= 0) { f.splice(i,1); }
    else { f.push(name); f.sort(function(a,b){ return a.toLowerCase() < b.toLowerCase() ? -1 : 1; }); }
    store('orm_favs', f);
  }
  function addRecent(name){
    if (!name || SPECIAL[name.toLowerCase()]) return;
    var r = getRecent(); var i = indexOfCI(r, name);
    if (i >= 0) r.splice(i,1);
    r.unshift(name);
    if (r.length > 40) r = r.slice(0,40);
    store('orm_recent', r);
  }

  function cleanName(n){ return String(n).replace(/^\\/?(r\\/)?/i, '').replace(/\\/.*$/, '').trim(); }
  function currentSub(){
    var m = location.pathname.match(/^\\/r\\/([^\\/]+)/i);
    if (!m) return null;
    if (m[1].indexOf('+') >= 0 || /^m\\b/i.test(m[1])) return null; /* multireddit */
    return m[1];
  }
  function currentLabel(){
    var s = currentSub();
    if (s) return 'r/' + s;
    if (location.pathname === '/' || /^\\/(hot|new|top|rising|controversial|best)\\b/.test(location.pathname)) return 'Front Page';
    if (/^\\/user\\//i.test(location.pathname)) return location.pathname.replace(/\\/$/, '').replace(/^\\/user\\//i, 'u/');
    if (location.pathname.length > 1) return location.pathname;
    return 'reddit';
  }

  function goSub(name){ name = cleanName(name); if (name) location.assign('https://old.reddit.com/r/' + encodeURIComponent(name) + '/'); }
  function goPath(p){ location.assign('https://old.reddit.com' + p); }

  function fetchSubs(done){
    fetch('/subreddits/mine/subscriber.json?limit=100', { credentials:'same-origin', headers:{ 'Accept':'application/json' } })
      .then(function(r){ return r.json(); })
      .then(function(j){
        var names = [];
        if (j && j.data && j.data.children) {
          j.data.children.forEach(function(c){ if (c.data && c.data.display_name) names.push(c.data.display_name); });
        }
        names.sort(function(a,b){ return a.toLowerCase() < b.toLowerCase() ? -1 : 1; });
        store('orm_subs', { ts: Date.now(), names: names });
        if (done) done(names);
      })
      .catch(function(){ if (done) done(getSubs().names || []); });
  }
  function searchNames(q, done){
    fetch('/api/search_reddit_names.json?query=' + encodeURIComponent(q) + '&include_over_18=true', { credentials:'same-origin' })
      .then(function(r){ return r.json(); })
      .then(function(j){ done((j && j.names) || []); })
      .catch(function(){ done([]); });
  }

  function rowHtml(name){
    var on = isFav(name) ? ' on' : '';
    var glyph = isFav(name) ? '\\u2605' : '\\u2606';
    return '<div class="orm-row" data-sub="' + esc(name) + '">'
      + '<span class="orm-row-name">r/' + esc(name) + '</span>'
      + '<button class="orm-star' + on + '" data-star="' + esc(name) + '" aria-label="favourite">' + glyph + '</button>'
      + '</div>';
  }
  function sectionHtml(title, names){
    if (!names || !names.length) return '';
    var rows = '';
    for (var i=0;i<names.length;i++) rows += rowHtml(names[i]);
    return '<div class="orm-sec-title">' + esc(title) + '</div>' + rows;
  }
  function filterCI(arr, ql){
    if (!ql) return arr.slice();
    return arr.filter(function(n){ return String(n).toLowerCase().indexOf(ql) >= 0; });
  }

  function render(){
    var q = $('orm-search').value.trim();
    var ql = q.toLowerCase();
    var html = '';

    html += '<div class="orm-quick">'
      + '<button class="orm-chip" data-path="/">Front</button>'
      + '<button class="orm-chip" data-path="/r/popular/">Popular</button>'
      + '<button class="orm-chip" data-path="/r/all/">All</button>'
      + '</div>';

    if (q) {
      html += '<div class="orm-row orm-go" data-sub="' + esc(q) + '">'
        + '<span class="orm-row-name">Go to r/' + esc(cleanName(q)) + '</span>'
        + '<span class="orm-go-arrow">\\u2192</span></div>';
    }

    html += sectionHtml('\\u2605 Favourites', filterCI(getFavs(), ql));
    html += sectionHtml('Subscribed', filterCI(getSubs().names, ql));
    html += sectionHtml('Recent', filterCI(getRecent(), ql));

    $('orm-list').innerHTML = html;

    var rc = $('orm-results');
    rc.innerHTML = '';
    if (q.length >= 2) {
      searchNames(q, function(names){
        if ($('orm-search').value.trim() !== q) return; /* stale */
        rc.innerHTML = sectionHtml('More subreddits', names.slice(0, 25));
      });
    }
  }

  var debounceTimer = null;
  function debouncedRender(){
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(render, 220);
  }

  function openDrawer(){
    document.body.classList.add('orm-open');
    var c = getSubs();
    if (!c.names.length || (Date.now() - c.ts) > 3600000) {
      fetchSubs(function(){ if (document.body.classList.contains('orm-open')) render(); });
    }
    render();
  }
  function closeDrawer(){ document.body.classList.remove('orm-open'); }

  function updateBar(){
    var t = $('orm-title'); if (t) t.textContent = currentLabel();
    var fb = $('orm-fav-btn'); if (!fb) return;
    var s = currentSub();
    if (s) {
      fb.style.display = 'block';
      var on = isFav(s);
      fb.textContent = on ? '\\u2605' : '\\u2606';
      fb.className = on ? 'on' : '';
    } else {
      fb.style.display = 'none';
    }
  }

  function buildUI(){
    if ($('orm-bar')) { updateBar(); return; }

    var bar = document.createElement('div');
    bar.id = 'orm-bar';
    bar.innerHTML =
      '<button id="orm-menu-btn" aria-label="subreddits">\\u2630</button>'
      + '<div id="orm-title"></div>'
      + '<button id="orm-fav-btn" aria-label="favourite current subreddit"></button>';
    document.body.appendChild(bar);

    var backdrop = document.createElement('div');
    backdrop.id = 'orm-backdrop';
    document.body.appendChild(backdrop);

    var drawer = document.createElement('div');
    drawer.id = 'orm-drawer';
    drawer.innerHTML =
      '<div id="orm-drawer-head">'
      + '<input id="orm-search" type="text" inputmode="search" placeholder="Go to or search subreddits\\u2026"'
      + ' autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" /></div>'
      + '<div id="orm-scroll"><div id="orm-list"></div><div id="orm-results"></div></div>';
    document.body.appendChild(drawer);

    $('orm-menu-btn').addEventListener('click', openDrawer);
    $('orm-title').addEventListener('click', openDrawer);
    backdrop.addEventListener('click', closeDrawer);
    $('orm-fav-btn').addEventListener('click', function(){
      var s = currentSub();
      if (s) { toggleFav(s); updateBar(); if (document.body.classList.contains('orm-open')) render(); }
    });

    var search = $('orm-search');
    search.addEventListener('input', debouncedRender);
    search.addEventListener('keydown', function(e){
      if (e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault();
        var q = search.value.trim();
        if (q) goSub(q);
      }
    });

    drawer.addEventListener('click', function(e){
      var t = e.target;
      var star = t && t.closest ? t.closest('.orm-star') : null;
      if (star) { e.stopPropagation(); toggleFav(star.getAttribute('data-star')); updateBar(); render(); return; }
      var chip = t && t.closest ? t.closest('.orm-chip') : null;
      if (chip) { goPath(chip.getAttribute('data-path')); return; }
      var row = t && t.closest ? t.closest('.orm-row') : null;
      if (row) { goSub(row.getAttribute('data-sub')); return; }
    });

    document.addEventListener('keydown', function(e){
      if ((e.key === 'Escape' || e.keyCode === 27) && document.body.classList.contains('orm-open')) closeDrawer();
    });

    updateBar();
  }

  /* ---- reddit-link hardening: keep everything on old.reddit.com --------- */
  function rewriteHref(raw){
    try {
      var u = new URL(raw, location.href);
      var h = u.hostname.toLowerCase();
      if (/(^|\\.)reddit\\.com$/.test(h) && h !== 'old.reddit.com') {
        u.hostname = 'old.reddit.com';
        u.protocol = 'https:';
        return u.href;
      }
    } catch(e){}
    return null;
  }
  function sweepLinks(root){
    var as = (root || document).querySelectorAll('a[href]');
    for (var i=0;i<as.length;i++){
      var r = rewriteHref(as[i].href);
      if (r) as[i].href = r;
    }
  }

  function installOnce(){
    if (window.__ormGlobals) return;
    window.__ormGlobals = true;
    installPullToRefresh();

    /* capture-phase rewrite catches links added after the initial sweep */
    document.addEventListener('click', function(e){
      var t = e.target;
      var a = t && t.closest ? t.closest('a[href]') : null;
      if (!a) return;
      var r = rewriteHref(a.href);
      if (r) a.href = r;
      if (isFeedPath(location.pathname)) {
        try {
          var u = new URL(a.href, location.href);
          if (!(u.origin === location.origin && u.pathname === location.pathname && u.search === location.search)) {
            saveFeedSnapshot();
          }
        } catch(e) {
          saveFeedSnapshot();
        }
      }
    }, true);
    window.addEventListener('pagehide', function(){ saveFeedSnapshot(); });
  }

  /* ---- run ------------------------------------------------------------- */
  installOnce();
  restoreFeedSnapshotIfBack();
  sweepLinks(document);
  addRecent(currentSub());
  buildUI();
}
`;

/**
 * Returns a self-contained JS snippet (string) that forces a mobile viewport,
 * strips per-subreddit custom stylesheets, injects {@link oldRedditMobileCss},
 * and wires up the subreddit switcher / link hardening ({@link switcherScript}).
 *
 * Safe to run repeatedly — every step is idempotent (re-uses its <style>, meta,
 * and DOM nodes by id; global listeners install once via a window flag).
 *
 * The CSS is embedded via JSON.stringify so it is correctly escaped into a JS
 * string literal regardless of its contents; the switcher source is inlined
 * verbatim (it deliberately contains no backticks or template placeholders).
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

    // Strip per-subreddit custom CSS so the restyle is consistent everywhere.
    // Primary hook is the documented title attr; the redditmedia.com fallback
    // catches the subreddit stylesheet by host (reddit's own core CSS is served
    // from redditstatic.com, so this never removes the base styles).
    var subStyles = document.querySelectorAll(
      'link[title="applied_subreddit_stylesheet"], style[title="applied_subreddit_stylesheet"], link[rel~="stylesheet"][href*="redditmedia.com"]'
    );
    for (var i = 0; i < subStyles.length; i++) {
      if (subStyles[i].parentNode) subStyles[i].parentNode.removeChild(subStyles[i]);
    }

    var ID = '__old_reddit_mobile_style__';
    var el = document.getElementById(ID);
    if (!el) {
      el = document.createElement('style');
      el.id = ID;
      el.setAttribute('type', 'text/css');
      head.appendChild(el);
    }
    el.textContent = ${JSON.stringify(oldRedditMobileCss)};

    ${switcherScript}

    if (document.body) {
      ormInit();
    } else {
      document.addEventListener('DOMContentLoaded', function () { try { ormInit(); } catch (e) {} });
    }
  } catch (e) {
    /* swallow — never break the page */
  }
})();`;
}
