import { expect, test } from 'vitest';
import { createTree } from '../test/createTree.js';
import { findRecord } from './findRecord.js';
import { normalizePerson } from './normalizePerson.js';
import { shouldConsiderPersonLiving } from './shouldConsiderPersonLiving.js';

test('consider everyone alive by default', () => {
  const tree = {
    children: [],
  };
  const person = {
    events: {},
    children: [],
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

test('if born > 120 years ago, consider them dead', () => {
  const tree = {
    children: [],
  };
  const person = {
    children: [],
    events: {
      birth: [
        {
          normalizedDate: `${new Date().getFullYear() - 121}0601`,
        },
      ],
    },
  };

  expect(shouldConsiderPersonLiving(tree, person)).toBe(false);
});

test('if children born > 100 years ago, consider them no longer living', () => {
  const myTree = createTree()
    .addIndividual('@DAD@', { fams: ['@F1@'] })
    .addIndividual('@CHILD1@', {
      events: [{ type: 'BIRT', date: `5 JUN ${new Date().getFullYear() - 110}` }],
    })
    .addIndividual('@CHILD2@', {
      events: [{ type: 'BIRT', date: `11 OCT ${new Date().getFullYear() - 90}` }],
    })
    .addFamily('@F1@', { children: ['@CHILD1@', '@CHILD2@'] })
    .get();

  const record = findRecord(myTree, 'INDI', '@DAD@');
  const rootPerson = normalizePerson(myTree, record);

  expect(shouldConsiderPersonLiving(myTree, rootPerson)).toBe(false);
});

test('if children are born < 100 years ago, consider them living', () => {
  const myTree = createTree()
    .addIndividual('@DAD@', { fams: ['@F1@'] })
    .addIndividual('@CHILD1@', {
      events: [{ type: 'BIRT', date: `5 JUN ${new Date().getFullYear() - 35}` }],
    })
    .addIndividual('@CHILD2@', {
      events: [{ type: 'BIRT', date: `11 OCT ${new Date().getFullYear() - 58}` }],
    })
    .addFamily('@F1@', { children: ['@CHILD1@', '@CHILD2@'] })
    .get();

  const record = findRecord(myTree, 'INDI', '@DAD@');
  const rootPerson = normalizePerson(myTree, record);

  expect(shouldConsiderPersonLiving(myTree, rootPerson)).toBe(true);
});
