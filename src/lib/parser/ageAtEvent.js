import { normalizeDate } from './normalizeDate.js';

export function ageAtEvent(person, eventDate) {
  const normalizedEventDate = normalizeDate(eventDate);
  const birthDate = person.events.birth?.[0]?.normalizedDate;

  if (normalizedEventDate && birthDate) {
    // calculate the years, months, days difference between two YYYMMDD dates
    const [eventYear, eventMonth, eventDay] = [
      Number(normalizedEventDate.slice(0, 4)),
      Number(normalizedEventDate.slice(4, 6)),
      Number(normalizedEventDate.slice(6, 8)),
    ];
    const [birthYear, birthMonth, birthDay] = [
      Number(birthDate.slice(0, 4)),
      Number(birthDate.slice(4, 6)),
      Number(birthDate.slice(6, 8)),
    ];

    let years = eventYear - birthYear;
    let months = eventMonth - birthMonth;
    let days = eventDay - birthDay;

    if (days < 0) {
      // Borrow the actual number of days in the month before eventMonth (handles
      // 28/29/30/31-day months and leap years, with year rollover for January).
      const daysInPriorMonth = new Date(eventYear, eventMonth - 1, 0).getDate();
      days += daysInPriorMonth;
      months -= 1;
    }
    if (months < 0) {
      months += 12;
      years -= 1;
    }

    const parts = [years ? years + 'y' : '', months ? months + 'm' : '', days ? days + 'd' : ''];

    return parts.filter(Boolean).join(', ');
  }
}
