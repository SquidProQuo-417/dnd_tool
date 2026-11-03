# Rules library

## Content and coverage

The bundled sources are the Creative Commons editions of SRD 5.1 (2014 rules, 403 PDF pages) and SRD 5.2.1 (2024 rules, 364 PDF pages). This is an SRD reference, not every published D&D book. The original, unmodified PDFs are included under `dist/rules/`. Attribution appears in the app and [the bundled attribution file](../dist/rules/ATTRIBUTION.txt).

The current index contains 1,832 topics for 2014 and 2,851 for 2024. Topic counts include section headings, spells, equipment, class features, monsters and other SRD material. They do not represent individually hand-reviewed rules.

## Navigation

The rules panel begins with the current campaign edition. Switching editions affects browsing only. Common topics retain their selection where contextual matching is possible. A missing counterpart shows an explanation instead of substituting a different rule. Named actions and bonus actions are grouped under Combat → Turn order → Your turn → Actions. Source hierarchy is preserved on each indexed entry for contextual matching.

Search runs locally over titles, topic paths and full extracted text. It supports ordinary keyword questions, ignores common filler words, and ranks title matches above body matches. It is not a generative answer engine. Alternative views offer alphabetical order, bookmarks and recently opened entries. Bookmarks and recent entries stay in device preferences, separate from campaign exports.

## Extraction limits

`npm run build:rules` reproducibly rebuilds the JSON indexes from the bundled PDFs using the development-only PDF.js dependency. It performs column-aware line ordering, heading detection and paragraph reflow. The 2014 illustrated Adventuring/Combat section starts and small-font exhaustion sidebar have explicit extraction adjustments. Each JSON index records its exact source PDF SHA-256 hash.

Automatic extraction can alter paragraph boundaries and table layout. The reference provides the original PDF page for every entry, and tables and complex stat blocks should be checked there. Some entries are section headings with subtopic links rather than standalone rule descriptions. This milestone does not claim a fully hand-reviewed transcription. The runtime uses static JSON, not the PDF parser, and makes no third-party requests to search rules.

The service worker caches both JSON indexes and original PDFs with the app. The initial offline cache is roughly 13 MB. A successful initial online load is required; use browser installation and storage controls normally.

## Maintenance

1. Verify any new source version and its license before changing the bundled PDF.
2. Update source metadata and extraction handling in `scripts/build-rules.mjs`.
3. Run `npm run build:rules`, `npm test`, `npm run check`, and `npm run test:browser`.
4. Increment the service-worker cache version for releases that change bundled assets.
5. Update this document, the attribution file and the shared roadmap as coverage changes.

Homebrew overlays, standard equipment presets, advanced panel docking and detached windows remain separate milestones.
