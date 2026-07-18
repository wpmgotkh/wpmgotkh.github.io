export const eventTypes = [
  'BAPM',
  'BARM',
  'BASM',
  'BLES',
  'CENS',
  'CHR',
  'CHRA',
  'CONF',
  'EDUC',
  'EMIG',
  'GRAD',
  'IMMI',
  'NATU',
  'OCCU',
  'RESI',
  'RETI',
];

export const familyEventTypes = ['ANUL', 'ENGA', 'MARR', 'DIV', 'DIVF'];

// All event types that can appear on a person's own event timeline (birth/death/burial
// plus the generic eventTypes). Used to derive a single, shared index base for `event-N`
// anchor IDs so they don't collide across the two places that assign them.
export const personalEventTypes = ['BIRT', 'DEAT', 'BURI', ...eventTypes];
