import { findRecord } from './findRecord.js';
import { findValue } from './findValue.js';
import { normalizeNotes } from './normalizeNotes.js';

export const normalizeCitations = (tree, citations) => {
  return citations.map((citation) => {
    const source = findRecord(tree, 'SOUR', citation.data.pointer);
    const name = findValue(source, 'TITL') ?? findValue(source, 'PERI') ?? '';

    return {
      id: citation.data.pointer.replaceAll('@', ''),
      name: name,
      page: findValue(citation, 'PAGE'),
      notes: normalizeNotes(
        tree,
        citation.children.filter(({ type }) => type === 'NOTE')
      ),
    };
  });
};
