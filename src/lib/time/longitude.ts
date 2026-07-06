import type { Coordinates } from '../route';
import type { LocalTimeParts } from './format';

export function formatLongitudeLocalTimeParts(
  epochMs: number,
  coordinates: Coordinates,
): LocalTimeParts {
  if (!Number.isFinite(epochMs)) {
    throw new RangeError('epochMs must be a finite number');
  }

  if (!Number.isFinite(coordinates.longitude)) {
    throw new RangeError('coordinates.longitude must be a finite number');
  }

  const offsetMinutes = Math.round(coordinates.longitude * 4);
  const shiftedDate = new Date(epochMs + offsetMinutes * 60 * 1000);

  const year = shiftedDate.getUTCFullYear();
  const month = shiftedDate.getUTCMonth() + 1;
  const day = shiftedDate.getUTCDate();
  const hour = shiftedDate.getUTCHours();
  const minute = shiftedDate.getUTCMinutes();
  const second = shiftedDate.getUTCSeconds();

  return {
    epochMs,
    timeZone: formatLongitudeOffsetLabel(offsetMinutes),
    year,
    month,
    day,
    hour,
    minute,
    second,
    offsetMinutes,
    isoDateTime: `${pad(year, 4)}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(
      second,
    )}`,
  };
}

export function formatLongitudeOffsetLabel(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? '-' : '+';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  return `Longitude UTC${sign}${pad(hours)}:${pad(minutes)}`;
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}
