(function attachDebugEventLog(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const DEFAULT_LIMIT = 120;

  function create(limit) {
    return {
      limit: Number.isInteger(limit) && limit > 0 ? limit : DEFAULT_LIMIT,
      events: [],
    };
  }

  function add(log, type, data) {
    if (!log || !Array.isArray(log.events) || !type) return null;
    const event = Object.assign({
      at: new Date().toISOString(),
      type: String(type),
    }, data || {});
    log.events.push(event);
    if (log.events.length > log.limit) {
      log.events.splice(0, log.events.length - log.limit);
    }
    return event;
  }

  function list(log) {
    return log && Array.isArray(log.events) ? log.events.slice() : [];
  }

  function clear(log) {
    if (log && Array.isArray(log.events)) log.events.length = 0;
  }

  Sanma.DebugEventLog = {
    DEFAULT_LIMIT,
    create,
    add,
    list,
    clear,
  };
})(window);
