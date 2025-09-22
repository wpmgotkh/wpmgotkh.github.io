import { findRecord } from './findRecord.js';

export const findSpouse = (tree, family, personId) => {
  const spouseRef = family.children.find(
    ({ type, data }) => (type === 'WIFE' || type === 'HUSB') && data.pointer !== personId
  );

  if (!spouseRef) return undefined;

  return findRecord(tree, 'INDI', spouseRef.data.pointer);
};
