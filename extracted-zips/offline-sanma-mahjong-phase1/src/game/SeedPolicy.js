(function attachSeedPolicy(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const MAX_SEED_LENGTH = 128;

  function validateSeed(seedText) {
    const seed = String(seedText || "");
    return seed.length <= MAX_SEED_LENGTH
      ? { ok: true, seed, reason: "" }
      : { ok: false, seed: null, reason: `seedは${MAX_SEED_LENGTH}文字以内で指定してください。` };
  }

  function requireValidSeed(seedText) {
    const result = validateSeed(seedText);
    if (!result.ok) throw new Error(result.reason);
    return result.seed;
  }

  function compactHash(text) {
    let hash = 2166136261;
    const source = String(text || "");
    for (let index = 0; index < source.length; index += 1) {
      hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function deriveSeed(seedText, suffix) {
    const base = requireValidSeed(seedText);
    if (!base) return "";
    const combined = `${base}:${String(suffix || "")}`;
    if (combined.length <= MAX_SEED_LENGTH) return combined;
    return `${base.slice(0, 96)}:${compactHash(combined)}`;
  }

  function hashSeed(seedText) {
    const source = requireValidSeed(seedText);
    let hash = 1779033703 ^ source.length;
    for (let index = 0; index < source.length; index += 1) {
      hash = Math.imul(hash ^ source[index].charCodeAt(0), 3432918353);
      hash = (hash << 13) | (hash >>> 19);
    }
    return function nextHash() {
      hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
      hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
      return (hash ^= hash >>> 16) >>> 0;
    };
  }

  Sanma.SeedPolicy = {
    MAX_SEED_LENGTH,
    validateSeed,
    requireValidSeed,
    deriveSeed,
    hashSeed,
  };
})(window);
