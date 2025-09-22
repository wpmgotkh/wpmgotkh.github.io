import { expect, test } from 'vitest';
import { shouldConsiderPersonLiving } from './shouldConsiderPersonLiving';

test('consider everyone alive by default', () => {
  const tree = {
    children: [],
  };
  const person = {
    events: {},
  };

  expect(shouldConsiderPersonLiving(tree, person)).toBe(true);
});

test('if death date, then they are dead', () => {
  const tree = {
    children: [],
  };
  const person = {
    events: {
      death: [
        {
          date: '2020-01-01',
        },
      ],
    },
  };

  expect(shouldConsiderPersonLiving(tree, person)).toBe(false);
});

test('if born > 120 years ago, consider them dead', () => {
  const tree = {
    children: [],
  };
  const person = {
    events: {
      birth: [
        {
          normalizedDate: `${new Date().getFullYear() - 130}1125`,
        },
      ],
    },
  };

  expect(shouldConsiderPersonLiving(tree, person)).toBe(false);
});

test('if born < 120 years ago, consider them alive', () => {
  const tree = {
    children: [],
  };
  const person = {
    events: {
      birth: [
        {
          normalizedDate: `${new Date().getFullYear() - 100}0601`,
        },
      ],
    },
  };

  expect(shouldConsiderPersonLiving(tree, person)).toBe(true);
});
