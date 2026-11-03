// Layouts contain tool IDs and presentation state only; campaign records never live here.
export const tools = [
  "Overview",
  "Notes",
  "Characters",
  "Idea board",
  "Rules",
  "Dice",
  "Roadmap",
  "Settings",
];
const id = () => crypto.randomUUID();
export const newStack = (tabs = ["Overview"]) => ({
  type: "stack",
  id: id(),
  tabs: [...tabs],
  active: tabs[0],
  priority: 2,
  collapsed: false,
});
export const defaultWorkspace = () => {
  const root = newStack();
  return { version: 1, root, focused: root.id };
};
export function stacks(node) {
  return !node
    ? []
    : node.type === "stack"
      ? [node]
      : [...stacks(node.first), ...stacks(node.second)];
}
export function validateWorkspace(layout) {
  if (!layout || layout.version !== 1)
    throw Error("Unsupported workspace layout.");
  const ids = new Set(),
    seenTools = new Set();
  let count = 0;
  function visit(node, depth = 0) {
    if (
      !node ||
      depth > 16 ||
      ++count > 31 ||
      typeof node.id !== "string" ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(node.id) ||
      ids.has(node.id)
    )
      throw Error("Invalid panel tree.");
    ids.add(node.id);
    if (node.type === "stack") {
      if (
        !Array.isArray(node.tabs) ||
        !node.tabs.length ||
        node.tabs.length > tools.length ||
        !node.tabs.every(
          (t) =>
            tools.includes(t) && !seenTools.has(t) && (seenTools.add(t), true),
        ) ||
        !node.tabs.includes(node.active) ||
        !Number.isInteger(node.priority) ||
        node.priority < 1 ||
        node.priority > 4 ||
        typeof node.collapsed !== "boolean"
      )
        throw Error("Invalid panel tabs or priority.");
    } else if (node.type === "split") {
      if (
        !["row", "column"].includes(node.axis) ||
        !Number.isFinite(node.ratio) ||
        node.ratio < 0.1 ||
        node.ratio > 0.9
      )
        throw Error("Invalid panel split.");
      visit(node.first, depth + 1);
      visit(node.second, depth + 1);
    } else throw Error("Unknown panel type.");
  }
  if (layout.root) visit(layout.root);
  if (
    layout.focused !== null &&
    !stacks(layout.root).some((s) => s.id === layout.focused)
  )
    throw Error("Invalid focused panel.");
  return layout;
}
function prune(node) {
  if (!node) return null;
  if (node.type === "stack") return node.tabs.length ? node : null;
  node.first = prune(node.first);
  node.second = prune(node.second);
  return !node.first ? node.second : !node.second ? node.first : node;
}
function finish(layout) {
  layout.root = prune(layout.root);
  const all = stacks(layout.root);
  if (!all.some((s) => s.id === layout.focused && !s.collapsed))
    layout.focused = (all.find((s) => !s.collapsed) || all[0])?.id || null;
  return validateWorkspace(layout);
}
export function openTool(layout, tool, targetId = layout.focused) {
  if (!tools.includes(tool)) throw Error("Unknown tool.");
  const next = structuredClone(layout),
    all = stacks(next.root);
  let pane = all.find((s) => s.tabs.includes(tool));
  if (!pane) {
    pane =
      all.find((s) => s.id === targetId) ||
      all.find((s) => !s.collapsed) ||
      all[0];
    if (pane) pane.tabs.push(tool);
    else next.root = pane = newStack([tool]);
  }
  pane.active = tool;
  pane.collapsed = false;
  next.focused = pane.id;
  return finish(next);
}
export function activateTab(layout, paneId, tool) {
  const next = structuredClone(layout),
    pane = stacks(next.root).find((s) => s.id === paneId);
  if (!pane?.tabs.includes(tool)) throw Error("Tab is not in that panel.");
  pane.active = tool;
  pane.collapsed = false;
  next.focused = pane.id;
  return finish(next);
}
export function moveTab(layout, tool, targetId, index = Infinity) {
  const next = structuredClone(layout),
    all = stacks(next.root),
    target = all.find((s) => s.id === targetId);
  if (!target || !tools.includes(tool)) throw Error("Invalid tab destination.");
  for (const pane of all) {
    pane.tabs = pane.tabs.filter((t) => t !== tool);
    if (pane.active === tool) pane.active = pane.tabs[0];
  }
  target.tabs.splice(Math.max(0, Math.min(target.tabs.length, index)), 0, tool);
  target.active = tool;
  target.collapsed = false;
  next.focused = target.id;
  return finish(next);
}
export function dockTool(layout, tool, targetId, edge) {
  if (!["left", "right", "top", "bottom"].includes(edge))
    throw Error("Invalid docking edge.");
  const next = structuredClone(layout),
    all = stacks(next.root),
    target = all.find((s) => s.id === targetId);
  if (!target || !tools.includes(tool))
    throw Error("Invalid docking destination.");
  if (target.tabs.length === 1 && target.tabs[0] === tool) return next;
  for (const pane of all) {
    pane.tabs = pane.tabs.filter((t) => t !== tool);
    if (pane.active === tool) pane.active = pane.tabs[0];
  }
  const fresh = newStack([tool]),
    before = ["left", "top"].includes(edge),
    split = {
      type: "split",
      id: id(),
      axis: ["left", "right"].includes(edge) ? "row" : "column",
      ratio: 0.5,
      first: before ? fresh : target,
      second: before ? target : fresh,
    };
  function replace(node) {
    if (node.id === targetId) return split;
    if (node.type === "split") {
      node.first = replace(node.first);
      node.second = replace(node.second);
    }
    return node;
  }
  next.root = replace(next.root);
  next.focused = fresh.id;
  return finish(next);
}
export function hideTool(layout, tool) {
  const next = structuredClone(layout);
  for (const pane of stacks(next.root)) {
    pane.tabs = pane.tabs.filter((t) => t !== tool);
    if (pane.active === tool) pane.active = pane.tabs[0];
  }
  return finish(next);
}
export function setPanel(layout, paneId, changes) {
  const next = structuredClone(layout),
    pane = stacks(next.root).find((s) => s.id === paneId);
  if (!pane) throw Error("Unknown panel.");
  if (changes.priority !== undefined) pane.priority = changes.priority;
  if (changes.collapsed !== undefined) pane.collapsed = changes.collapsed;
  return finish(next);
}
export function setRatio(layout, splitId, ratio) {
  const next = structuredClone(layout);
  function visit(node) {
    if (!node) return;
    if (node.id === splitId && node.type === "split")
      node.ratio = Math.max(0.1, Math.min(0.9, ratio));
    else if (node.type === "split") {
      visit(node.first);
      visit(node.second);
    }
  }
  visit(next.root);
  return finish(next);
}
export function projectTree(node, visible) {
  if (!node) return null;
  if (node.type === "stack") return visible.has(node.id) ? node : null;
  const first = projectTree(node.first, visible),
    second = projectTree(node.second, visible);
  return !first ? second : !second ? first : { ...node, first, second };
}
export function minimumSize(node) {
  if (!node) return { width: 0, height: 0 };
  if (node.type === "stack") return { width: 350, height: 240 };
  const a = minimumSize(node.first),
    b = minimumSize(node.second);
  return node.axis === "row"
    ? { width: a.width + b.width + 8, height: Math.max(a.height, b.height) }
    : { width: Math.max(a.width, b.width), height: a.height + b.height + 8 };
}
export function fitWorkspace(layout, width, height) {
  const all = stacks(layout.root),
    shown = all.filter((s) => !s.collapsed),
    visible = new Set(shown.map((s) => s.id));
  const candidates = shown
    .filter((s) => s.id !== layout.focused)
    .sort((a, b) => a.priority - b.priority || all.indexOf(b) - all.indexOf(a));
  while (visible.size > 1) {
    const min = minimumSize(projectTree(layout.root, visible));
    if (min.width <= width && min.height <= height) break;
    const remove = candidates.shift();
    if (!remove) break;
    visible.delete(remove.id);
  }
  function allocate(node, w, h) {
    if (!node) return node;
    if (node.type === "stack")
      return { ...node, viewport: { width: w, height: h } };
    const a = minimumSize(node.first),
      b = minimumSize(node.second),
      total = Math.max(1, (node.axis === "row" ? w : h) - 8),
      low = (node.axis === "row" ? a.width : a.height) / total,
      high = 1 - (node.axis === "row" ? b.width : b.height) / total,
      ratio = low <= high ? Math.max(low, Math.min(high, node.ratio)) : 0.5;
    return {
      ...node,
      ratio,
      first: allocate(
        node.first,
        node.axis === "row" ? total * ratio : w,
        node.axis === "column" ? total * ratio : h,
      ),
      second: allocate(
        node.second,
        node.axis === "row" ? total * (1 - ratio) : w,
        node.axis === "column" ? total * (1 - ratio) : h,
      ),
    };
  }
  return {
    root: allocate(projectTree(layout.root, visible), width, height),
    visible,
    rail: all
      .filter((s) => !visible.has(s.id))
      .map((s) => ({ ...s, reason: s.collapsed ? "Collapsed" : "For space" })),
  };
}
