import { findRecord } from './findRecord.js';
import { normalizePerson } from './normalizePerson.js';

export function findParents(tree, person) {
  const birthFamilyId = person.children.find(({ type }) => type === 'FAMC');
  const birthFamily = findRecord(tree, 'FAM', birthFamilyId?.data.pointer);
  const mother =
    birthFamily &&
    normalizePerson(
      tree,
      findRecord(
        tree,
        'INDI',
        birthFamily.children.find(({ type }) => type === 'WIFE')?.data.pointer
      )
    );
  const father =
    birthFamily &&
    normalizePerson(
      tree,
      findRecord(
        tree,
        'INDI',
        birthFamily.children.find(({ type }) => type === 'HUSB')?.data.pointer
      )
    );

  return { mother, father };
}
