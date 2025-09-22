import { normalizeCitations } from './normalizeCitations.js';
import { normalizeDate } from './normalizeDate.js';

export const normalizeEvent = (tree, event, id) => {
  if (!event) return event;
  if (!id) throw new Error('Event ID is required');

  const date = event.children.find(({ type }) => type === 'DATE');
  const place = event.children.find(({ type }) => type === 'PLAC');

  const sources = event.children.filter(({ type }) => type === 'SOUR');

  return {
    id: id,
    type: event.type,
    date: date ? date.data.value : '',
    normalizedDate: date ? normalizeDate(date.data.value) : undefined,
    place: [event.data.value, place?.data.value].filter(Boolean).join(', '),
    sources: normalizeCitations(tree, sources),
  };
};
