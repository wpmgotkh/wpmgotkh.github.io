import fs from 'fs';
import { parse as parseGedcom } from 'gedcom';
import ora from 'ora';
import path from 'path';
import {
  findFamily,
  findNotes,
  findPerson,
  findSpouse,
  getSex,
  normalizeEvent,
  normalizeNotes,
  normalizePerson,
  sexIcon,
} from './lib.js';
import { defunkifyPlace } from './lib/defunkifyPlace.js';
import { privatizeName } from './lib/privatizeName.js';

const PAGES_DIR = './pages';
const LINE_BREAK = '   ';

const eventTypes = ['EDUC', 'OCCU', 'RESI'];

const urlify = (text) => text.toLowerCase().replace(/\s+/g, '-');

const friendlyEventNames = {
  BIRT: 'Birth',
  BURI: 'Burial',
  DEAT: 'Death',
  EDUC: 'Education',
  OCCU: 'Occupation',
  RESI: 'Residence',
};

const getEventName = (eventType) => friendlyEventNames[eventType] || eventType;

function generateParentLine(tree, person) {
  const sex = getSex(person);

  const birthFamilyId = person.children.find(({ type }) => type === 'FAMC');
  const birthFamily = findFamily(tree, birthFamilyId?.data.pointer);
  const mother =
    birthFamily &&
    normalizePerson(
      tree,
      findPerson(tree, birthFamily.children.find(({ type }) => type === 'WIFE')?.data.pointer)
    );
  const father =
    birthFamily &&
    normalizePerson(
      tree,
      findPerson(tree, birthFamily.children.find(({ type }) => type === 'HUSB')?.data.pointer)
    );

  if (mother?.id || father?.id) {
    const parentLinks = [
      father?.id && `[${privatizeName(father)}](${father.url})`,
      mother?.id && `[${privatizeName(mother)}](${mother.url})`,
    ];

    return `${sex === 'M' ? 'Son' : 'Daughter'} of ${parentLinks.filter(Boolean).join(' and ')}`;
  }

  return undefined;
}

function generateRelationships(tree, person) {
  const families = person.children
    .filter(({ type }) => type === 'FAMS')
    .map((family) => findFamily(tree, family.data.pointer))
    .filter(Boolean);

  if (!families.length) return [];

  const lines = ['## 👩‍❤️‍👨 Relationships', LINE_BREAK];

  for (const family of families) {
    const sp = findSpouse(tree, family, person.id);
    const spouse = normalizePerson(tree, sp);

    const events = family.children
      .filter(({ type }) => ['MARR'].includes(type))
      .map((event) => normalizeEvent(tree, event));

    if (spouse) {
      lines.push(`### ${sexIcon(spouse)} [${privatizeName(spouse)}](${spouse.url})`);
    } else {
      lines.push(`### ⚪ Unknown Person`);
    }

    lines.push(LINE_BREAK);

    const children = family.children
      .filter(({ type }) => type === 'CHIL')
      .map((child) => findPerson(tree, child.data.pointer))
      .map((child) => normalizePerson(tree, child));

    if (!person.consideredLiving && (!spouse || !spouse.consideredLiving) && events.length) {
      lines.push('#### Events');
      lines.push('\n');
      lines.push(`Type | Date | Place`);
      lines.push(`------ | ------ | ------`);

      for (const event of events) {
        lines.push(`${getEventName(event.type)} | ${event.date} | ${defunkifyPlace(event.place)}`);
      }
    }

    lines.push(`#### Children With ${privatizeName(spouse) ?? 'Unknown Person'}`);

    for (const child of children) {
      lines.push(`* ${sexIcon(child)} [${privatizeName(child)}](${child.url})`);
    }
  }

  return lines;
}

function generateNotes(tree, person) {
  const notes = normalizeNotes(tree, findNotes(person));

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
      .map((event) => normalizeEvent(tree, event));

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
          ? `[${getEventName(event.type)}](#event-${eventIndex})`
          : getEventName(event.type);

        documentLines.push(`${eventName} | ${event.date} | ${defunkifyPlace(event.place)}`);
      }

      documentLines.push(LINE_BREAK);
    }

    documentLines.push(...generateRelationships(tree, person));

    if (!person.consideredLiving || person.noteworthy) {
      documentLines.push(...generateNotes(tree, person));
    }

    if (!person.consideredLiving && availableEvents.length) {
      documentLines.push('### 📰 Event Sources');
      documentLines.push(LINE_BREAK);

      for (let eventIndex = 0; eventIndex < availableEvents.length; eventIndex++) {
        const event = availableEvents[eventIndex];

        if (!event.sources.length) continue;

        documentLines.push(
          `#### <a id="event-${eventIndex}"></a> ${getEventName(event.type)}${
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

  fs.writeFileSync('tmp/names.json', JSON.stringify(nameIndex), 'utf-8');

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
