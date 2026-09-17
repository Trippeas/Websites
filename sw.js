/* =====================================================================
   Gains - service worker

   Two jobs:
     1. Make the home screen app open with no signal at the gym.
     2. Make sure it still picks up a new build the moment there is one.

   So the app page is network first: if the phone can reach GitHub we
   always take the fresh copy, and the cached one is only a fallback for
   when it cannot. Web fonts go the other way - they never change, so
   cache first.

   Anything that is not this app is passed straight through, so the other
   sites in this repo are unaffected.
   ===================================================================== */
var CACHE = "gains-v6";
var PAGE = new URL("gains.html", self.location).href;

self.addEventListener("install", function(){
  self.skipWaiting();
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        return k === CACHE ? Promise.resolve() : caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if (req.method !== "GET") return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }

  var isPage = url.origin === self.location.origin && /\/gains\.html$/.test(url.pathname);
  var isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!isPage && !isFont) return;

  if (isFont) {
    e.respondWith(
      caches.match(req).then(function(hit){
        return hit || fetch(req).then(function(res){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
          return res;
        }).catch(function(){ return hit; });
      })
    );
    return;
  }

  e.respondWith(
    fetch(req, { cache: "no-store" }).then(function(res){
      var copy = res.clone();
      caches.open(CACHE).then(function(c){ c.put(PAGE, copy); });
      return res;
    }).catch(function(){
      return caches.match(PAGE).then(function(hit){
        return hit || new Response("Gains is offline and has no saved copy yet.", {
          status: 503, headers: { "Content-Type": "text/plain" }
        });
      });
    })
  );
});
