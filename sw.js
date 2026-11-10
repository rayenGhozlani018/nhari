/* Nhari — offline cache for the installed app */
const VERSION = "81e3882b54";
const CACHE = "nhari-" + VERSION;
const FILES = ["./", "index.html", "manifest.webmanifest", "fonts.css", "app.css", "local-ai.js", "prayer.js", "hadith.js", "data.js", "gym.js", "mapdata.js", "core.js", "money.js", "health.js", "food.js", "study.js", "deen.js", "routine.js", "work.js", "mentor.js", "review.js", "today.js", "prefs.js", "extras.js", "vendor/firebase-app-compat.js", "vendor/firebase-auth-compat.js", "vendor/firebase-firestore-compat.js", "firebase-config.js", "sync.js", "local.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/favicon.png", "icons/apple-touch-icon.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(async (c) => {
    await c.addAll(FILES);
    const css = await (await fetch("fonts.css")).text();
    const fonts = [...css.matchAll(/url\((fonts\/[^)]+)\)/g)].map(m => m[1]);
    await c.addAll(fonts);
  }).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("nhari-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// "Partager → Nhari" from the gallery: keep the shared screenshots, then open the Work screen that reads them
const SHARE = "share-nhari";
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method === "POST" && url.origin === location.origin && url.pathname.endsWith("/share-target")) {
    e.respondWith((async () => {
      try {
        const fd = await e.request.formData();
        const files = fd.getAll("images").filter(f => f && f.size);
        const text = [fd.get("title"), fd.get("text")].filter(Boolean).join("\n");
        const c = await caches.open(SHARE);
        for (const k of await c.keys()) await c.delete(k);
        let i = 0;
        for (const f of files.slice(0, 5)) await c.put(new Request("./shared/" + (i++)), new Response(f, { headers: { "content-type": f.type || "image/jpeg" } }));
        if (text) await c.put(new Request("./shared/text"), new Response(text, { headers: { "content-type": "text/plain" } }));
      } catch (err) { /* open the app anyway */ }
      return Response.redirect("./index.html?share=1#work", 303);
    })());
    return;
  }
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // the Claude API and links go to the network
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
    const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res;
  }).catch(() => caches.match("index.html"))));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window" }).then(list => list.length ? list[0].focus() : self.clients.openWindow("./index.html#today")));
});
