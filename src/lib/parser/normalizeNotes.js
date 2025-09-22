import { findRecord } from './findRecord.js';

export const normalizeNotes = (tree, notes) => {
  return notes
    .map(({ data }) => findRecord(tree, 'NOTE', data.pointer)?.data.value)
    .filter(Boolean);
};
