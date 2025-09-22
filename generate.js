import fs from 'fs';
import { parse as parseGedcom } from 'gedcom';
import ora from 'ora';
import path from 'path';
import { eventTypes } from './src/lib/const.js';
import { defunkifyPlace } from './src/lib/defunkifyPlace.js';
import { findRecord } from './src/lib/findRecord.js';
import { findRecords } from './src/lib/findRecords.js';
import { urlify } from './src/lib/generator/urlify.js';
import { nameAndBirth } from './src/lib/nameAndBirth.js';
import { normalizeEvent } from './src/lib/normalizeEvent.js';
import { normalizeNotes } from './src/lib/normalizeNotes.js';
import { normalizePerson } from './src/lib/normalizePerson.js';
import { findRelationships } from './src/lib/parser/findRelationships.js';
import { privatizeName } from './src/lib/privatizeName.js';
import { sexIcon } from './src/lib/sexIcon.js';

const PAGES_DIR = './pages';
const LINE_BREAK = '   ';

const friendlyEventNames = {
  ANUL: 'Annulment',
  BAPM: 'Baptism',
  BARM: 'Bar Mitzvah',
  BASM: 'Bas Mitzvah',
  BIRT: 'Birth',
  BLES: 'Blessing',
  BURI: 'Burial',
  CENS: 'Census',
  CHR: 'Christening',
  CHRA: 'Christening (Adult)',
  CONF: 'Confirmation',
  DEAT: 'Death',
  DIV: 'Divorce',
  DIVF: 'Divorce Filed',
  EDUC: 'Education',
  EMIG: 'Emigration',
  ENGA: 'Engagement',
  GRAD: 'Graduation',
  IMMI: 'Immigration',
  MARR: 'Marriage',
  NATU: 'Naturalization',
  OCCU: 'Occupation',
  RESI: 'Residence',
  RETI: 'Retirement',
};

const getEventName = (eventType) => friendlyEventNames[eventType] || eventType;

function generateParentLine(tree, person) {
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

  if (mother?.id || father?.id) {
    const parentLinks = [
      father?.id && `[${privatizeName(father)}](${father.url})`,
      mother?.id && `[${privatizeName(mother)}](${mother.url})`,
    ];

    return `${person.sex === 'M' ? 'Son' : 'Daughter'} of ${parentLinks
      .filter(Boolean)
      .join(' and ')}`;
  }

  return undefined;
}

function generateRelationships(tree, person, families) {
  if (!families.length) return [];

  const lines = ['## 👩‍❤️‍👨 Relationships', LINE_BREAK];

  for (const family of families) {
    if (family.spouse) {
      lines.push(`### ${sexIcon(family.spouse)} ${nameAndBirth(family.spouse)}`);
    } else {
      lines.push(`### ⚪ Unknown Person`);
    }

    lines.push(LINE_BREAK);

    const children = family.children
      .filter(({ type }) => type === 'CHIL')
      .map((child) => findRecord(tree, 'INDI', child.data.pointer))
      .map((child) => normalizePerson(tree, child));

    if (
      !person.consideredLiving &&
      (!family.spouse || !family.spouse.consideredLiving) &&
      family.events.length
    ) {
      lines.push('#### Events');
      lines.push('\n');
      lines.push(`Type | Date | Place`);
      lines.push(`------ | ------ | ------`);

      for (const event of family.events) {
        const eventName = event.sources.length
          ? `[${getEventName(event.type)}](#event-${event.id})`
          : getEventName(event.type);

        lines.push(`${eventName} | ${event.date} | ${defunkifyPlace(event.place)}`);
      }
    }

    if (children.length) {
      lines.push(`#### Children With ${privatizeName(family.spouse) ?? 'Unknown Person'}`);

      for (const child of children) {
        lines.push(`* ${sexIcon(child)} ${nameAndBirth(child)}`);
      }
    }
  }

  return lines;
}

function generateNotes(tree, person) {
  const notes = normalizeNotes(tree, findRecords(person, 'NOTE'));

  if (!notes.length) return [];

  const lines = ['## 📝 Notes'];

  for (const note of notes) {
    lines.push(
      note
        .split('\n')
        .map((line) => `  > ${line}  `)
        .join('\n')
    );
  }

  return lines;
}

const surnameMap = {};
const nameIndex = [];

function processGedcom(inputFile) {
  console.log(`Processing GEDCOM file: ${inputFile}`);

  const spinner = ora('Processing individuals...').start();

  const tree = parseGedcom(fs.readFileSync(inputFile, 'utf-8'));

  const people = tree.children
    .filter(({ type }) => type === 'INDI')
    .map((person) => normalizePerson(tree, person));

  const noteworthy = [];

  for (const person of people) {
    const snapshot = {
      name: person.name.full,
      birth: person.events.birth?.[0]?.date,
      url: person.url,
    };

    if (person.noteworthy) {
      noteworthy.push(snapshot);
    }

    const documentLines = [
      '---',
      'layout: templates/basic.njk',
      `title: ${privatizeName(person)}`,
      '---',
    ];
    documentLines.push(`## ${sexIcon(person)} ${privatizeName(person)}`);
    documentLines.push(LINE_BREAK);

    const parentLine = generateParentLine(tree, person);
    if (parentLine) {
      documentLines.push(parentLine);
      documentLines.push(LINE_BREAK);
    }

    if (person.noteworthy && person.consideredLiving) {
      documentLines.push(
        '> [!note]',
        '> This is a public figure and therefore bypasses some privacy restrictions for living persons.'
      );
      documentLines.push('\n');
    }

    if ((!person.consideredLiving || person.noteworthy) && person.name.surname) {
      if (!(person.name.surname in surnameMap)) {
        surnameMap[person.name.surname] = [];
      }

      surnameMap[person.name.surname].push(snapshot);

      nameIndex.push(snapshot);
    }

    const events = [...person.events.birth];

    const otherEvents = person.children
      .filter(({ type }) => eventTypes.includes(type))
      .map((event, index) => normalizeEvent(tree, event, `event-${index}`));

    events.push(...otherEvents);

    events.push(...person.events.death, ...person.events.burial);

    const availableEvents = events.filter(Boolean);

    if (!person.consideredLiving && availableEvents.length) {
      documentLines.push('### 📆 Events');
      documentLines.push('\n');
      documentLines.push(`Type | Date | Place`);
      documentLines.push(`------ | ------ | ------`);

      for (let eventIndex = 0; eventIndex < availableEvents.length; eventIndex++) {
        const event = availableEvents[eventIndex];

        const eventName = event.sources.length
          ? `[${getEventName(event.type)}](#event-${event.id})`
          : getEventName(event.type);

        documentLines.push(`${eventName} | ${event.date} | ${defunkifyPlace(event.place)}`);
      }

      documentLines.push(LINE_BREAK);
    }

    const families = findRelationships(person, tree);

    documentLines.push(...generateRelationships(tree, person, families));

    if (!person.consideredLiving || person.noteworthy) {
      documentLines.push(...generateNotes(tree, person));
    }

    const familyEvents = person.consideredLiving
      ? []
      : families
          .filter((family) => !family.spouse?.consideredLiving)
          .map((family) => family.events)
          .flat();

    const sourcedEvents = [
      ...availableEvents.filter((event) => event.sources.length),
      ...familyEvents,
    ].sort((a, b) =>
      a.normalizedDate && b.normalizedDate ? a.normalizedDate.localeCompare(b.normalizedDate) : 0
    );

    if (!person.consideredLiving && sourcedEvents.length) {
      documentLines.push('### 📰 Event Sources');
      documentLines.push(LINE_BREAK);

      for (let eventIndex = 0; eventIndex < sourcedEvents.length; eventIndex++) {
        const event = sourcedEvents[eventIndex];

        documentLines.push(
          `#### <a id="event-${event.id}"></a> ${getEventName(event.type)}${
            event.date ? `, ${event.date}` : ''
          }`
        );

        for (const citation of event.sources) {
          documentLines.push(`* ${citation.name} ${citation.page ? ` - ${citation.page}` : ``}`);
          documentLines.push(
            ...citation.notes.map((note) =>
              note
                .split('\n')
                .map((line) => `  > ${line}  `)
                .join('\n')
            )
          );
        }

        if (eventIndex + 1 !== availableEvents.length) {
          documentLines.push(LINE_BREAK);
        }
      }
    }

    const fileName = `${PAGES_DIR}${person.url}.md`;
    fs.mkdirSync(path.dirname(fileName), { recursive: true });

    fs.writeFileSync(
      fileName,
      documentLines
        .filter(Boolean)
        .map((line) => line.trim())
        .join('\n'),
      'utf-8'
    );
  }

  fs.mkdirSync(`${PAGES_DIR}/surnames`, { recursive: true });

  const top10Surnames = Object.entries(surnameMap)
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, 10);

  spinner.succeed('Processed individuals!');
  spinner.text = 'Generating homepage...';

  generateHomepage(top10Surnames, noteworthy);

  spinner.succeed('Generated homepage!');
  spinner.text = 'Generating surname files...';

  generateSurnameFiles(surnameMap);

  spinner.succeed('Generated surname files!');
  spinner.text = 'Generating surname index...';

  generateSurnameIndex(surnameMap, top10Surnames);

  fs.writeFileSync('pages/names.json', JSON.stringify(nameIndex), 'utf-8');

  spinner.succeed('Generated surname index!');
  spinner.succeed('Done!');

  spinner.stop();
}

function generateHomepage(top10Surnames, noteworthy) {
  const lines = [
    `---`,
    `layout: templates/homepage.njk`,
    `title: Wilson Family Project`,
    `---`,
    ...(noteworthy.length
      ? [
          '## Noteworthy People',
          'These are people somewhere in the tree who are famous or otherwise noteworthy.',
          ...noteworthy.map((person) => {
            return ` - [${person.name}](${person.url})${person.birth ? `, ${person.birth}` : ''}`;
          }),
        ]
      : []),
    '## Top 10 Surnames',
    ...top10Surnames.map(([surname, entries]) => {
      return ` - [${surname}](/surnames/${urlify(surname)}) (${entries.length})`;
    }),
    '\n',
    '[View All](/surnames)',
  ];

  fs.writeFileSync(`${PAGES_DIR}/index.md`, lines.join('\n'), 'utf-8');
}

function generateSurnameIndex(surnameMap, top10Surnames) {
  const allSurnames = Object.keys(surnameMap).sort((a, b) => a.localeCompare(b));

  const lines = [
    `---`,
    `layout: templates/basic.njk`,
    `title: Surnames`,
    `---`,
    `## Surnames`,
    '### Top 10 Surnames',
    ...top10Surnames.map(([surname, entries]) => {
      return `- [${surname}](/surnames/${urlify(surname)}) (${entries.length})`;
    }),
    '### All Surnames',
    ...allSurnames.map((surname) => {
      return `- [${surname}](/surnames/${urlify(surname)}) (${surnameMap[surname].length})`;
    }),
  ];

  fs.writeFileSync(`${PAGES_DIR}/surnames/index.md`, lines.join('\n'), 'utf-8');
}

function generateSurnameFiles(surnameMap) {
  for (const [surname, entries] of Object.entries(surnameMap)) {
    entries.sort((a, b) => a.name.localeCompare(b.name));

    const lines = [
      `---`,
      `layout: templates/basic.njk`,
      `title: ${surname} Names`,
      `---`,
      `## ${surname} Names`,
      ...entries.map(({ name, birth, url }) => {
        return `- [${name}](${url})${birth ? `, ${birth}` : ''}`;
      }),
    ];

    fs.writeFileSync(`${PAGES_DIR}/surnames/${urlify(surname)}.md`, lines.join('\n'), 'utf-8');
  }
}

const inputFile = process.argv[2];

if (!inputFile || !fs.existsSync(inputFile)) {
  console.error('Please provide a valid input file.');
  process.exit(1);
}

processGedcom(inputFile);
