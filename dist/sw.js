const CACHE = "waypoint-v4";
const FILES = [
  "./",
  "./index.html",
  "./app.js",
  "./model.js",
  "./components.js",
  "./component-ui.js",
  "./roadmap.js",
  "./rules-ui.js",
  "./rules-model.js",
  "./workspace-model.js",
  "./workspace-ui.js",
  "./rules/2014.json",
  "./rules/2024.json",
  "./rules/srd-2014.pdf",
  "./rules/srd-2024.pdf",
  "./rules/ATTRIBUTION.txt",
  "./styles.css",
  "./icon.svg",
  "./manifest.webmanifest",
];
self.addEventListener("install", (event) =>
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES))),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("waypoint-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      ),
  ),
);
self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  );
});
