(function attachGameRecord(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const MAX_EVENTS = 500;
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function create(options) {
    const input = options || {};
    return { id: input.id || `game-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: input.createdAt || new Date().toISOString(), seed: input.seed || "", ruleConfig: clone(input.ruleConfig || {}),
      players: clone(input.players || []), rounds: [], finalPoints: [] };
  }
  function addRound(record, options) { const round = Object.assign({ roundLabel: "東1局", honba: 0, events: [], result: {} }, clone(options || {})); round.events = (round.events || []).slice(-MAX_EVENTS);
  record.rounds.push(round); return round; }
  function addEvent(round, type, detail) { round.events.push({ at: new Date().toISOString(), type, detail: detail || "" }); if (round.events.length > MAX_EVENTS) round.events.splice(0, round.events.length - MAX_EVENTS); }
  function serialize(record) { return JSON.stringify(record); }
  function deserialize(raw) { const value = typeof raw === "string" ? JSON.parse(raw) : clone(raw); if (!value || !value.id || !Array.isArray(value.rounds)) throw new Error("牌譜形式が不正です。");
  value.rounds.forEach((round) => { round.events = (round.events || []).slice(-MAX_EVENTS); }); return value; }
  Sanma.GameRecord = { MAX_EVENTS, create, addRound, addEvent, serialize, deserialize };
})(window);
