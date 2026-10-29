// Recommendation metadata is separate from the schemaVersion:1 learning JSON.
export function selectDailyWord(words, history = {}, today) {
  if (!words.length) return null;
  const cached = words.find(w => w.id === history[today]);
  if (cached) return cached;
  const previous = Object.keys(history).filter(d => d < today).sort().reverse();
  const recent = previous.slice(0, Math.min(3, words.length - 1)).map(d => history[d]);
  let pool = words.filter(w => !recent.includes(w.id));
  if (!pool.length) pool = words;
  const hash = text => { let h = 2166136261; for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
  const compare = (a, b) => {
    const dueA = a.due <= today, dueB = b.due <= today;
    return Number(dueB) - Number(dueA) || a.stage - b.stage ||
      a.due.localeCompare(b.due) || hash(today + a.id) - hash(today + b.id) || a.id.localeCompare(b.id);
  };
  return [...pool].sort(compare)[0];
}

export function dailyWord(words, storage, today, memory = {}) {
  const key = 'mandarin-garden-daily-word-v1';
  let history = memory;
  try {
    const parsed = JSON.parse(storage.getItem(key));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) history = parsed;
  } catch { /* In-memory continuity remains available when storage is blocked. */ }
  history = Object.fromEntries(Object.entries(history).filter(([d, id]) => /^\d{4}-\d{2}-\d{2}$/.test(d) && typeof id === 'string'));
  const word = selectDailyWord(words, history, today);
  if (word) history[today] = word.id;
  else delete history[today];
  const dates = Object.keys(history).sort().slice(-60);
  history = Object.fromEntries(dates.map(d => [d, history[d]]));
  for (const d of Object.keys(memory)) delete memory[d];
  Object.assign(memory, history);
  try { storage.setItem(key, JSON.stringify(history)); } catch { /* Learning data is unaffected. */ }
  return word;
}
