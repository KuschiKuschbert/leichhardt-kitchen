// Fixed, invented lines keep the first service study out of operational records.
export const board = [
  { id: 'G1', section: 'Grill', day: 'today', name: 'Red onions' },
  { id: 'G2', section: 'Grill', day: 'today', name: 'Portion steaks' },
  { id: 'S1', section: 'Sauce', day: 'today', name: 'Pickled onions' },
  { id: 'G3', section: 'Grill', day: 'tomorrow', name: 'Red onions' }
];

export function answer(intent, previousSection) {
  const clarify = { text: 'Please say the section and item again.', section: previousSection };
  if (!intent || !['list', 'tick'].includes(intent.action)) return clarify;
  const section = intent.section || previousSection;
  if (section && !['Grill', 'Sauce'].includes(section)) return clarify;
  if (!['today', 'tomorrow'].includes(intent.day)) return clarify;
  const lines = board.filter(line => (!section || line.section === section) && line.day === intent.day);
  if (intent.action === 'list') {
    return { text: (section || 'All sections') + ', ' + intent.day + ': ' +
      (lines.map(line => line.name).join(', ') || 'no lines') + '.', section };
  }
  const item = String(intent.item || '').toLowerCase().trim();
  if (!item) return clarify;
  const matches = lines.filter(line => line.name.toLowerCase().includes(item));
  if (matches.length !== 1) return { text: matches.length ? 'Which section, Grill or Sauce? Repeat the tick with the section.' : 'No matching line. Say the item again.', section };
  const line = matches[0];
  return { text: 'Proposed tick: ' + line.section + ', ' + line.name + ', ' + line.day + '.', section: line.section };
}
