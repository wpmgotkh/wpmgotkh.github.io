const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const fullMonths = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

export function normalizeDate(dateString) {
  let cleaned = dateString.replaceAll(/(bef|before|aft|after|abt|about) /gi, '');

  const between = /^BET (.*) AND (.*)$/i;

  if (between.test(cleaned)) {
    cleaned = cleaned.replace(between, '$1');
  }

  if (/^\w+ \d{4}$/.test(cleaned)) {
    const [month, year] = cleaned.split(' ');
    const monthIndex = fullMonths.indexOf(month.toLowerCase());
    if (monthIndex > -1) {
      return `${year}${String(monthIndex + 1).padStart(2, '0')}00`;
    }
  }

  if (/^\d{4}$/.test(cleaned)) return `${cleaned}0000`;

  if (/^\d{1,2} \w{3} \d{4}$/.test(cleaned)) {
    const [day, month, year] = cleaned.split(' ');
    const monthIndex = months.indexOf(month.toLowerCase());
    if (monthIndex > -1) {
      return `${year}${String(monthIndex + 1).padStart(2, '0')}${String(day).padStart(2, '0')}`;
    }
  }

  if (/^\w{3} \d{4}$/.test(cleaned)) {
    const [month, year] = cleaned.split(' ');
    const monthIndex = months.indexOf(month.toLowerCase());
    if (monthIndex > -1) {
      return `${year}${String(monthIndex + 1).padStart(2, '0')}00`;
    }
  }

  // console.info(`Failed to parse dateString: ${dateString}`);
}
