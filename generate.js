import fs from 'fs';
import {
  findFamily,
  findNotes,
  findPerson,
  findSpouse,
  getSex,
  normalizeEvent,
  normalizeNotes,
  personName,
  sexIcon,
} from './lib.js';

const eventTypes = ['EDUC', 'OCCU', 'RESI'];

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
    findPerson(tree, birthFamily.children.find(({ type }) => type === 'WIFE')?.data.pointer);
  const father =
    birthFamily &&
    findPerson(tree, birthFamily.children.find(({ type }) => type === 'HUSB')?.data.pointer);
  const motherId = mother && mother.data.xref_id.replaceAll('@', '');
  const fatherId = father && father.data.xref_id.replaceAll('@', '');
  const motherName = mother && personName(mother);
  const fatherName = father && personName(father);

  if (motherId || fatherId) {
    const parentLinks = [
      fatherId && `[${Object.values(fatherName).join(' ')}](/${fatherId})`,
      motherId && `[${Object.values(motherName).join(' ')}](/${motherId})`,
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
    const spouse = findSpouse(tree, family, person.data.xref_id);

    if (!spouse) continue;

    const events = family.children
      .filter(({ type }) => ['MARR'].includes(type))
      .map((event) => normalizeEvent(tree, event));

    const name = personName(spouse);

    lines.push(
      `### ${sexIcon(spouse)} [${name.given} ${name.surname}](/${spouse.data.xref_id.replaceAll(
        '@',
        ''
      )})`
    );

    const children = family.children
      .filter(({ type }) => type === 'CHIL')
      .map((child) => findPerson(tree, child.data.pointer));

    if (events.length) {
      lines.push('#### Events');
      lines.push('\n');
      lines.push(`Type | Date | Place`);
      lines.push(`------ | ------ | ------`);

      for (const event of events) {
        lines.push(`${getEventName(event.type)} | ${event.date} | ${event.place}`);
      }
    }

    lines.push(`#### Children With ${name.given} ${name.surname}`);

    for (const child of children) {
      const childName = personName(child);
      if (!childName) continue;

      lines.push(
        `* ${sexIcon(child)} [${Object.values(childName).join(
          ' '
        )}](/${child.data.xref_id.replaceAll('@', '')})`
      );
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

function processGedcom() {
  const tree = JSON.parse(fs.readFileSync('./output.json', 'utf-8'));

  for (const person of tree.children.filter(({ type }) => type === 'INDI')) {
    const id = person.data.xref_id.replaceAll('@', '');
    const name = person.children.find(({ type }) => type === 'NAME');
    const given = name?.children.find(({ type }) => type === 'GIVN')?.data.value;
    const surname = name?.children.find(({ type }) => type === 'SURN')?.data.value;
    const sex = getSex(person);

    const documentLines = ['---', 'layout: index.njk', `title: ${given} ${surname}`, '---'];
    documentLines.push(`# ${sexIcon(person)} ${given} ${surname}`);
    documentLines.push('\n');

    documentLines.push(generateParentLine(tree, person));

    const birth = normalizeEvent(
      tree,
      person.children.find(({ type }) => type === 'BIRT')
    );
    const death = normalizeEvent(
      tree,
      person.children.find(({ type }) => type === 'DEAT')
    );
    const burial = normalizeEvent(
      tree,
      person.children.find(({ type }) => type === 'BURI')
    );

    const events = [birth];

    const otherEvents = person.children
      .filter(({ type }) => eventTypes.includes(type))
      .map((event) => normalizeEvent(tree, event));

    events.push(...otherEvents);

    events.push(death, burial);

    const availableEvents = events.filter(Boolean);

    if (availableEvents.length) {
      documentLines.push('## 📆 Events');
      documentLines.push('\n');
      documentLines.push(`Type | Date | Place`);
      documentLines.push(`------ | ------ | ------`);

      for (const event of availableEvents) {
        documentLines.push(`${getEventName(event.type)} | ${event.date} | ${event.place}`);
      }

      // const sourcedEvents = availableEvents.filter(
      //   (event) => event.sources.length
      // );

      // for (const event of availableEvents) {
      //   documentLines.push(`### ${getEventName(event.type)}`);

      //   event.date && documentLines.push(`**Date**: ${event.date}  `);
      //   event.place && documentLines.push(`**Place**: ${event.place}   `);

      //   if (event.sources.length) {
      //     documentLines.push("#### Sources");
      //   }

      //   for (const citation of event.sources) {
      //     documentLines.push(
      //       `* ${citation.name} ${citation.page ? ` - ${citation.page}` : ``}`
      //     );
      //     documentLines.push(
      //       ...citation.notes.map((note) =>
      //         note
      //           .split("\n")
      //           .map((line) => `  > ${line}  `)
      //           .join("\n")
      //       )
      //     );
      //   }
      // }
    }

    documentLines.push(...generateRelationships(tree, person));

    documentLines.push(...generateNotes(tree, person));

    const fileName = `./output/${id}.md`;
    fs.writeFileSync(fileName, documentLines.filter(Boolean).join('\n'), 'utf-8');
  }
}

processGedcom();
