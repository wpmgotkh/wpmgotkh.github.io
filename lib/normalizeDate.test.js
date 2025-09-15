import { expect, test } from 'vitest';
import { normalizeDate } from './normalizeDate';

test('handles abt aft bef', () => {
  expect(normalizeDate('abt 1930')).toEqual('19300000');
  expect(normalizeDate('aft 1863')).toEqual('18630000');
  expect(normalizeDate('BEF 2012')).toEqual('20120000');
});

test.each([
  ['14 Nov 1940', '19401114'],
  ['1 JUL 1733', '17330701'],
  ['30 apr 1329', '13290430'],
])('standard date format: %s => %s', (input, expected) => {
  expect(normalizeDate(input)).toEqual(expected);
});

test.each([
  ['Jan 1940', '19400100'],
  ['JUL 2022', '20220700'],
  ['apr 1654', '16540400'],
])('month and year only: %s => %s', (input, expected) => {
  expect(normalizeDate(input)).toEqual(expected);
});

test.each([
  ['bet 14 nov 1940 and 20 jun 1941', '19401114'],
  ['BET NOV 1675 AND 13 DEC 1675', '16751100'],
])('between uses the first date', (input, expected) => {
  expect(normalizeDate(input)).toEqual(expected);
});
