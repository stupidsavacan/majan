(function attachGameRecordStorage(global) {
  const Sanma = global.Sanma = global.Sanma || {}; const RECORDS_KEY = "offlineSanma.phase8.records"; const STATS_KEY = "offlineSanma.phase8.stats"; const MAX_RECORDS = 30;
  const defaults = () => ({ version: 1, gamesPlayed: 0, roundsPlayed: 0, wins: 0, losses: 0, yakumanCount: 0, highestHand: null, totalScoreMovement: 0, lastPlayedAt: null });
  let corruptedRecovered = false; let lastError = null;
  function read(key, fallback) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (e) { corruptedRecovered = true; lastError = e.message; try { localStorage.removeItem(key);
  } catch (_) {} return fallback; } }
  function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { lastError = e.message; return false; } }
  function loadRecords() {
    const value = read(RECORDS_KEY, []);
    if (!Array.isArray(value)) { corruptedRecovered = true; return []; }
    return value.slice(0, MAX_RECORDS).reduce((valid, item) => {
      try { valid.push(Sanma.GameRecord.deserialize(item)); } catch (error) { corruptedRecovered = true; lastError = error.message; }
      return valid;
    }, []);
  }
  function saveRecord(record) { const records = loadRecords().filter((item) => item.id !== record.id); records.unshift(Sanma.GameRecord.deserialize(record)); return write(RECORDS_KEY, records.slice(0, MAX_RECORDS)); }
  function loadStats() { return Object.assign(defaults(), read(STATS_KEY, defaults())); }
  function updateStats(result) { const stats = loadStats(); const r = result || {}; stats.gamesPlayed += r.gameEnded ? 1 : 0; stats.roundsPlayed += 1; stats.wins += r.won ? 1 : 0; stats.losses += r.lost ? 1 : 0;
  stats.yakumanCount += Number(r.yakumanCount || 0); stats.totalScoreMovement += Number(r.scoreMovement || 0);
  if (r.highestHand && (!stats.highestHand || Number(r.highestHand.points || 0) > Number(stats.highestHand.points || 0))) stats.highestHand = r.highestHand; stats.lastPlayedAt = new Date().toISOString();
  write(STATS_KEY, stats); return stats; }
  function resetRecords() { return write(RECORDS_KEY, []); } function resetStats() { return write(STATS_KEY, defaults()); }
  function diagnostics() { let readable = true, writable = true; try { localStorage.getItem(RECORDS_KEY); localStorage.setItem("offlineSanma.phase8.probe", "1"); localStorage.removeItem("offlineSanma.phase8.probe");
  } catch (e) { readable = writable = false; lastError = e.message; } return { readable, writable, corruptedRecovered, lastError, recordCount: loadRecords().length }; }
  Sanma.GameRecordStorage = { RECORDS_KEY, STATS_KEY, MAX_RECORDS, loadRecords, saveRecord, loadStats, updateStats, resetRecords, resetStats, diagnostics };
})(window);
