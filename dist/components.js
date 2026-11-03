export const abilities = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
export const componentTypes = [
  "Statistics",
  "Weapon",
  "Ammunition",
  "Inventory",
  "Spell requirements",
  "Notes",
];
export function defaultData(type) {
  switch (type) {
    case "Statistics":
      return {
        scores: Object.fromEntries(abilities.map((a) => [a, 10])),
        ac: 10,
        hp: 10,
        maxHp: 10,
        speed: 30,
        proficiency: 2,
      };
    case "Weapon":
      return {
        ability: "STR",
        proficient: true,
        attackBonus: 0,
        damageDice: "1d6",
        damageBonus: 0,
        addAbility: true,
        damageType: "",
        properties: "",
        ammoId: null,
      };
    case "Ammunition":
      return { current: 20, maximum: 20 };
    case "Inventory":
      return { limit: 150, items: [] };
    case "Spell requirements":
      return { verbal: true, somatic: true, material: false, description: "" };
    default:
      return null;
  }
}
export function makeComponent(type) {
  return {
    id: crypto.randomUUID(),
    type,
    label: type,
    value: "",
    data: defaultData(type),
  };
}
export const modifier = (score) => Math.floor((score - 10) / 2);
export const signed = (n) => (n >= 0 ? "+" + n : String(n));
export function weaponSummary(character, component) {
  const d = component.data;
  const stats = character.components.find(
    (m) => m.type === "Statistics" && m.data,
  )?.data;
  const ability =
    stats && d.ability !== "None" ? modifier(stats.scores[d.ability]) : 0;
  return {
    hasStats: Boolean(stats) || d.ability === "None",
    attack:
      ability + (d.proficient ? (stats?.proficiency ?? 0) : 0) + d.attackBonus,
    damage: (d.addAbility ? ability : 0) + d.damageBonus,
  };
}
export function inventorySummary(component) {
  const weight = component.data.items.reduce(
      (sum, i) => sum + i.quantity * i.weight,
      0,
    ),
    limit = component.data.limit;
  return {
    weight: Math.round(weight * 100) / 100,
    limit,
    remaining: Math.round((limit - weight) * 100) / 100,
    percent: limit ? Math.min(100, (weight / limit) * 100) : weight ? 100 : 0,
    over: weight > limit,
  };
}
export function componentSummary(character, m) {
  if (!m.data) return m.value;
  const d = m.data;
  switch (m.type) {
    case "Statistics":
      return `AC ${d.ac} · HP ${d.hp}/${d.maxHp} · Speed ${d.speed} ft\n${abilities.map((a) => `${a} ${d.scores[a]} (${signed(modifier(d.scores[a]))})`).join(" · ")}`;
    case "Weapon": {
      const w = weaponSummary(character, m),
        ammo = character.components.find((a) => a.id === d.ammoId);
      return `Attack ${signed(w.attack)} · Damage ${d.damageDice}${w.damage ? signed(w.damage) : ""}${d.damageType ? " " + d.damageType : ""}${ammo?.data ? " · " + ammo.label + " " + ammo.data.current + "/" + ammo.data.maximum : ""}${!w.hasStats ? " · Add statistics to calculate ability modifiers" : ""}`;
    }
    case "Ammunition":
      return `${d.current} / ${d.maximum} remaining`;
    case "Inventory": {
      const i = inventorySummary(m);
      return `${i.weight} / ${i.limit} lb · ${i.over ? Math.abs(i.remaining) + " lb over limit" : i.remaining + " lb available"}`;
    }
    case "Spell requirements":
      return (
        [
          d.verbal ? "Verbal" : null,
          d.somatic ? "Somatic" : null,
          d.material
            ? "Material" + (d.description ? ": " + d.description : "")
            : null,
        ]
          .filter(Boolean)
          .join(" · ") || "No casting requirements selected"
      );
    default:
      return m.value;
  }
}
const num = (n, min, max, integer = false) =>
  Number.isFinite(n) &&
  n >= min &&
  n <= max &&
  (!integer || Number.isInteger(n));
export function validateComponentData(m) {
  const d = m.data;
  if (d == null) return;
  const fail = () => {
    throw Error("Invalid structured " + m.type + " component.");
  };
  if (typeof d !== "object" || Array.isArray(d)) fail();
  switch (m.type) {
    case "Statistics":
      if (
        !d.scores ||
        !abilities.every((a) => num(d.scores[a], 1, 30, true)) ||
        !num(d.ac, 0, 100, true) ||
        !num(d.hp, 0, 100000, true) ||
        !num(d.maxHp, 1, 100000, true) ||
        d.hp > d.maxHp ||
        !num(d.speed, 0, 10000, true) ||
        !num(d.proficiency, 0, 20, true)
      )
        fail();
      break;
    case "Weapon":
      if (
        ![...abilities, "None"].includes(d.ability) ||
        typeof d.proficient !== "boolean" ||
        typeof d.addAbility !== "boolean" ||
        !num(d.attackBonus, -100, 100, true) ||
        !num(d.damageBonus, -100, 100, true) ||
        typeof d.damageDice !== "string" ||
        !/^([1-9]|[1-4]\d|50)d(4|6|8|10|12|20|100)$/.test(d.damageDice) ||
        typeof d.damageType !== "string" ||
        d.damageType.length > 100 ||
        typeof d.properties !== "string" ||
        d.properties.length > 1000 ||
        !(d.ammoId === null || typeof d.ammoId === "string")
      )
        fail();
      break;
    case "Ammunition":
      if (
        !num(d.current, 0, 100000, true) ||
        !num(d.maximum, 0, 100000, true) ||
        d.current > d.maximum
      )
        fail();
      break;
    case "Inventory":
      if (
        !num(d.limit, 0, 1000000) ||
        !Array.isArray(d.items) ||
        d.items.length > 500
      )
        fail();
      {
        const ids = new Set();
        for (const i of d.items) {
          if (
            !i ||
            typeof i.id !== "string" ||
            !/^[A-Za-z0-9_-]{1,100}$/.test(i.id) ||
            ids.has(i.id) ||
            typeof i.name !== "string" ||
            i.name.length > 200 ||
            !num(i.quantity, 0, 100000, true) ||
            !num(i.weight, 0, 100000)
          )
            fail();
          ids.add(i.id);
        }
      }
      break;
    case "Spell requirements":
      if (
        !["verbal", "somatic", "material"].every(
          (k) => typeof d[k] === "boolean",
        ) ||
        typeof d.description !== "string" ||
        d.description.length > 10000
      )
        fail();
      break;
    default:
      fail();
  }
}
