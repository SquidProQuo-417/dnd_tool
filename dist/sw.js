const CACHE = "waypoint-shell-v1";
const FILES = [
  "./",
  "./index.html",
  "./shell.js",
  "./shell.css",
  "./workspace-model.js",
  "./workspace-ui.js",
  "./styles.css",
  "./icon.svg",
  "./manifest.webmanifest",
];
self.addEventListener("install", (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener("activate", (event) =>
  event
    .waitUntil(
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith("waypoint-") && key !== CACHE)
              .map((key) => caches.delete(key)),
          ),
        ),
    )
    .then(() => self.clients.claim()),
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
