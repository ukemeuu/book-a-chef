/**
 * Unit test for multi-cuisine dispatch scoring.
 *   node supabase/tests/multi-cuisine.test.mjs
 *
 * Pure logic, no database or network required.
 */

const relatedMap = {
  Swahili: ["Seafood", "Coastal Fusion"],
  Seafood: ["Swahili", "Coastal Fusion"],
  BBQ: ["Nyama Choma", "Kenyan Traditional"],
  "Nyama Choma": ["BBQ", "Kenyan Traditional"],
  Italian: ["Continental", "Fine Dining"],
  Continental: ["Italian", "Fine Dining"],
  "Fine Dining": ["Continental", "Italian"],
  Indian: ["Pan-Asian"],
  "Pan-Asian": ["Indian"],
  Vegan: ["Vegetarian"],
  Vegetarian: ["Vegan"],
};

// Mirrors the block in utils/dispatch.ts.
function cuisineScore(booking, chef) {
  const requested = Array.isArray(booking.cuisine_types) && booking.cuisine_types.length
    ? booking.cuisine_types
    : booking.cuisine_type
    ? [booking.cuisine_type]
    : [];

  let score = 0;
  if (requested.length === 0) return score;

  const chefCuisines = chef.cuisines || [];

  if (requested.includes("Any")) {
    score += 40;
  } else {
    const directHits = requested.filter((c) => chefCuisines.includes(c));
    if (directHits.length > 0) {
      if (directHits.length >= requested.length) score += 40;
      else if (directHits.length >= 2) score += 32;
      else score += 25;

      const relatedHit = requested.some((c) =>
        (relatedMap[c] || []).some((r) => chefCuisines.includes(r))
      );
      if (relatedHit) score += 8;
    }
  }
  return score;
}

const cases = [
  {
    name: "chef covers both requested cuisines → full marks",
    booking: { cuisine_type: "Italian", cuisine_types: ["Italian", "Seafood"] },
    chef: { cuisines: ["Italian", "Seafood"] },
    expect: 40,
  },
  {
    name: "chef covers one of two → partial credit",
    booking: { cuisine_type: "Italian", cuisine_types: ["Italian", "Seafood"] },
    chef: { cuisines: ["Italian"] },
    expect: 25,
  },
  {
    name: "'Any' awards full marks (no literal matching)",
    booking: { cuisine_type: "Any", cuisine_types: ["Any"] },
    chef: { cuisines: ["Swahili"] },
    expect: 40,
  },
  {
    name: "related cuisine adds bonus on top of a direct hit",
    booking: { cuisine_types: ["Swahili"] },
    chef: { cuisines: ["Swahili", "Coastal Fusion"] },
    expect: 48,
  },
  {
    name: "no overlap → zero",
    booking: { cuisine_types: ["Italian"] },
    chef: { cuisines: ["Swahili", "BBQ"] },
    expect: 0,
  },
  {
    name: "legacy row (no cuisine_types) still scores on cuisine_type",
    booking: { cuisine_type: "Indian" },
    chef: { cuisines: ["Indian", "Pan-Asian"] },
    expect: 48,
  },
  {
    name: "empty cuisine list scores zero rather than throwing",
    booking: { cuisine_types: [] },
    chef: { cuisines: ["Italian"] },
    expect: 0,
  },
  {
    name: "chef with no cuisines array does not throw",
    booking: { cuisine_types: ["Italian"] },
    chef: {},
    expect: 0,
  },
];

let pass = 0;
let fail = 0;

for (const c of cases) {
  const got = cuisineScore(c.booking, c.chef);
  if (got === c.expect) {
    pass++;
    console.log(`  PASS  ${c.name} (${got})`);
  } else {
    fail++;
    console.log(`  FAIL  ${c.name} — expected ${c.expect}, got ${got}`);
  }
}

console.log(`\n${pass}/${cases.length} passed`);
process.exit(fail === 0 ? 0 : 1);
