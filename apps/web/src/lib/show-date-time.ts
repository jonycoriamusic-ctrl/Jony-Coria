import { DateTime } from "luxon";

export function showLocalDateTime(input: string | Date, timeZone: string) {
  const value = DateTime.fromJSDate(new Date(input), { zone: timeZone });
  return { day: value.toFormat("yyyy-MM-dd"), time: value.toFormat("HH:mm") };
}

export function showStartInstant(day: string, time: string, timeZone: string): string | null {
  const value = DateTime.fromISO(`${day}T${time}`, { zone: timeZone });
  if (!value.isValid || value.toFormat("yyyy-MM-dd'T'HH:mm") !== `${day}T${time}`) {
    return null;
  }
  return value.toUTC().toISO();
}
