# Workspace panels

The preparation tools now share a docked panel system. A tool has one live location in the workspace; opening it again focuses its existing tab. Campaign content remains in the campaign model. Layout preferences are local to the browser and do not enter campaign exports.

## Open, arrange and resize

- Use the sidebar or **Open a tool** to open or restore a tool in the focused panel.
- Drag a tab onto another tab to reorder or move it. Drag into the center of a panel to add it as a tab.
- While dragging, edge targets let you dock left, right, above, or below a panel.
- The split icon in a panel header opens a tool/position chooser. An existing tool moves instead of duplicating its data.
- Drag the divider between panels to resize it. Focus a divider and use the arrow keys to resize from the keyboard.
- Use the arrow keys, Home and End on a focused tab to navigate that panel's tabs.
- The panel's **…** menu also moves tabs between panels, reorders them, docks them, sets priority, collapses the panel, or hides its active tool. These controls provide alternatives to dragging.

The last empty panel is removed automatically. All tools may be hidden; the empty workspace still provides the opener and layout controls.

## Visibility priorities

Each panel has Low, Normal, High or Essential priority. When the workspace cannot fit the full arrangement at readable panel sizes, the focused panel stays visible and other panels are retained in priority order. Panels displaced for space appear in the restore bar and return automatically when the window grows.

Restoring a panel from the bar focuses it, so another lower-priority panel may temporarily take its place in the bar. Explicitly collapsed panels stay collapsed until restored, even after the window grows. Tab contents, campaign records and the saved split tree are retained. Text sizes are not scaled down to make every panel fit.

Minimum fitting sizes are currently 350 × 240 CSS pixels per panel; a single focused panel is allowed to fit a smaller screen. Panel contents adapt or scroll. Divider proportions adapt to maintain minimum sizes while the saved proportions remain available for wider windows.

Compact rules panels begin with navigation collapsed to leave the selected rule readable. Use the navigation button inside the rules panel to open the search/tree. Existing tool headings become compact in small panels while text remains at the configured size.

## Save and recover

**Save layout** records a name, the split tree, tab order, active tabs, divider proportions, panel priorities and explicit collapse state. Saving over the same name requires selecting Replace. Up to 32 named arrangements can be kept. **Layouts** loads or deletes named layouts, restores the previous layout, or resets to the single-panel overview. Reset does not change campaign data.

Changes to the active layout autosave on this device. Named layouts do not automatically change when the active workspace is rearranged. On startup an invalid stored layout falls back to a valid previous layout, or the default workspace. Campaign records are not reset during layout recovery.

Current note/character selection and tool-specific scroll positions are retained during rearrangement in the running session; named layouts do not store those as campaign content. The dice panel keeps its last ten rolls for the running session.

## Deferred

Floating panels, separate desktop windows, multiple copies of a tool, and advanced phone/tablet controls are later work. Homebrew is deferred. Initiative/combat tracking will plug into this same tool registry next.
