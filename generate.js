import fs from 'fs';
import ora from 'ora';
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
      father?.id && `[${privatizeName(father)}](/${father.prettyId})`,
      mother?.id && `[${privatizeName(mother)}](/${mother.prettyId})`,
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

  const lines = ['## 👩‍❤️‍👨 Relationships'];

  for (const family of families) {
    const sp = findSpouse(tree, family, person.id);
    const spouse = normalizePerson(tree, sp);

    const events = family.children
      .filter(({ type }) => ['MARR'].includes(type))
      .map((event) => normalizeEvent(tree, event));

    if (spouse) {
      lines.push(`### ${sexIcon(spouse)} [${privatizeName(spouse)}](/${spouse.prettyId})`);
    } else {
      lines.push(`### ⚪ Unknown Person`);
    }

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
      lines.push(`* ${sexIcon(child)} [${privatizeName(child)}](/${child.prettyId})`);
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

function processGedcom() {
  const spinner = ora('Processing individuals...').start();

  const tree = JSON.parse(fs.readFileSync('./output.json', 'utf-8'));

  const people = tree.children
    .filter(({ type }) => type === 'INDI')
    .map((person) => normalizePerson(tree, person));

  for (const person of people) {
    const documentLines = [
      '---',
      'layout: templates/basic.njk',
      `title: ${privatizeName(person)}`,
      '---',
    ];
    documentLines.push(`## ${sexIcon(person)} ${privatizeName(person)}`);
    documentLines.push('\n');

    documentLines.push(generateParentLine(tree, person));

    if (person.name.surname) {
      if (!(person.name.surname in surnameMap)) {
        surnameMap[person.name.surname] = [];
      }

      surnameMap[person.name.surname].push({
        id: person.prettyId,
        name: person.name.full,
        birth: person.events.birth?.[0]?.date,
      });
    }

    nameIndex.push({
      id: person.prettyId,
      name: person.name.full,
      birth: person.events.birth?.[0]?.date,
    });

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
    }

    documentLines.push(...generateRelationships(tree, person));

    if (!person.consideredLiving) {
      documentLines.push(...generateNotes(tree, person));
    }

    if (!person.consideredLiving && availableEvents.length) {
      for (let eventIndex = 0; eventIndex < availableEvents.length; eventIndex++) {
        const event = availableEvents[eventIndex];

        if (!event.sources.length) continue;

        documentLines.push(
          `### <a id="event-${eventIndex}"></a> ${getEventName(event.type)}${
            event.date ? `, ${event.date}` : ''
          }`
        );
        documentLines.push('#### Sources');

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
      }
    }

    const fileName = `./output/${person.prettyId}.md`;
    fs.writeFileSync(fileName, documentLines.filter(Boolean).join('\n'), 'utf-8');
  }

  fs.mkdirSync('./output/surnames', { recursive: true });

  const top10Surnames = Object.entries(surnameMap)
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, 10);

  spinner.succeed('Processed individuals!');
  spinner.text = 'Generating homepage...';

  generateHomepage(top10Surnames);

  spinner.succeed('Generated homepage!');
  spinner.text = 'Generating surname files...';

  generateSurnameFiles(surnameMap);

  spinner.succeed('Generated surname files!');
  spinner.text = 'Generating surname index...';

  generateSurnameIndex(surnameMap, top10Surnames);

  fs.writeFileSync('src/names.json', JSON.stringify(nameIndex), 'utf-8');

  spinner.succeed('Generated surname index!');
  spinner.succeed('Done!');

  spinner.stop();
}

function generateHomepage(top10Surnames) {
  const lines = [
    `---`,
    `layout: templates/homepage.njk`,
    `title: Wilson Family Project`,
    `---`,
    '## Top 10 Surnames',
    ...top10Surnames.map(([surname, entries]) => {
      return `- [${surname}](/surnames/${urlify(surname)}) (${entries.length})`;
    }),
  ];

  fs.writeFileSync(`./output/index.md`, lines.join('\n'), 'utf-8');
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

  fs.writeFileSync(`./output/surnames/index.md`, lines.join('\n'), 'utf-8');
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
      ...entries.map(({ id, name, birth }) => {
        return `- [${name}](/${id})${birth ? `, ${birth}` : ''}`;
      }),
    ];

    fs.writeFileSync(`./output/surnames/${urlify(surname)}.md`, lines.join('\n'), 'utf-8');
  }
}

processGedcom();
