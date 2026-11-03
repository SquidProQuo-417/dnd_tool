const CACHE = "waypoint-shell-v5";
const FILES = [
  "./",
  "./index.html",
  "./shell.js",
  "./shell.css",
  "./actors.css",
  "./actors-model.js",
  "./actors-store.js",
  "./actors-ui.js",
  "./character-options.js",
  "./character-builder.js",
  "./character-features.js",
  "./character-sheet.js",
  "./character-sheet-ui.js",
  "./rule-content.js",
  "./presets/monsters-2014.json",
  "./presets/monsters-2024.json",
  "./rules/ATTRIBUTION.txt",
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
