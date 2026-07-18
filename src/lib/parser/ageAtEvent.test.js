import { expect, test } from 'vitest';
import { ageAtEvent } from './ageAtEvent.js';

function person(normalizedDate) {
  return { events: { birth: [{ normalizedDate }] } };
}

test('returns undefined when there is no birth date', () => {
  expect(ageAtEvent({ events: { birth: [] } }, '1 MAR 2020')).toBeUndefined();
});

test('computes years/months/days with no borrowing needed', () => {
  expect(ageAtEvent(person('20000110'), '15 MAR 2005')).toBe('5y, 2m, 5d');
});

test('borrows a full 31-day month (Jan) across a year boundary', () => {
  // birth Dec 20, 2019 -> event Jan 5, 2020: 16 days (31 - 20 + 5)
  expect(ageAtEvent(person('20191220'), '5 JAN 2020')).toBe('16d');
});

test('borrows a 29-day February in a leap year', () => {
  // birth Feb 15, 2020 -> event Mar 1, 2020: 15 days (29 - 15 + 1)
  expect(ageAtEvent(person('20200215'), '1 MAR 2020')).toBe('15d');
});

test('borrows a 28-day February in a non-leap year', () => {
  // birth Feb 15, 2021 -> event Mar 1, 2021: 14 days (28 - 15 + 1)
  expect(ageAtEvent(person('20210215'), '1 MAR 2021')).toBe('14d');
});

test('borrows a 30-day month (Apr) correctly', () => {
  // birth Apr 25, 2020 -> event May 10, 2020: 15 days (30 - 25 + 10)
  expect(ageAtEvent(person('20200425'), '10 MAY 2020')).toBe('15d');
});

test('omits zero-valued parts', () => {
  expect(ageAtEvent(person('20200101'), '1 JAN 2021')).toBe('1y');
});
