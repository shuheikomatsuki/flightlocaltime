export type DayPeriod = 'morning' | 'daytime' | 'evening' | 'night';

export function getDayPeriod(hour: number): DayPeriod {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new RangeError('hour must be an integer from 0 to 23');
  }

  if (hour >= 5 && hour <= 8) {
    return 'morning';
  }

  if (hour >= 9 && hour <= 15) {
    return 'daytime';
  }

  if (hour >= 16 && hour <= 18) {
    return 'evening';
  }

  return 'night';
}
