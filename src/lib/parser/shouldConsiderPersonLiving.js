import { findRecord } from './findRecord.js';
import { findRecords } from './findRecords.js';
import { findValue } from './findValue.js';
import { normalizeDate } from './normalizeDate.js';

export function shouldConsiderPersonLiving(tree, person) {
  const now = new Date().getFullYear();

  // we already know they've died
  if (person.events.death?.[0]?.date) return false;

  // if they were born >= 120 years ago
  if (person.events.birth?.[0]?.normalizedDate) {
    const birthDate = Number(person.events.birth[0].normalizedDate.substring(0, 4));
    if (!Number.isNaN(birthDate) && now - birthDate >= 120) return false;
  }

  // if any of their children were born >= 100 years ago
  const maxChildBirthYear = findMinChildBirthYear(tree, person);
  if (maxChildBirthYear && now - maxChildBirthYear >= 100) return false;

  // if either of their parents were born >= 160 years ago

  // if any of their siblings were burn >= 140 years ago

  // otherwise we assume they are living
  return true;
}

function findMinChildBirthYear(tree, person) {
  const birthYears = person.children
    .filter(({ type }) => type === 'FAMS')
    .map((record) => {
      const family = findRecord(tree, 'FAM', record.data.pointer);

      if (!family) return undefined;

      return findRecords(family, 'CHIL').map((child) => {
        const childPerson = findRecord(tree, 'INDI', child.data.pointer);
        if (!childPerson) return undefined;

        const birth = findRecords(childPerson, 'BIRT')?.[0];
        const date = birth && findValue(birth, 'DATE');

        const normalizedDate = date ? normalizeDate(date)?.substring(0, 4) : undefined;
        const dateAsNumber = normalizedDate ? Number(normalizedDate) : undefined;

        return dateAsNumber;
      });
    })
    .flat()
    .filter(Boolean);

  return Math.min(...birthYears);
}
