export type LocalTimeParts = {
  epochMs: number;
  timeZone: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  offsetMinutes: number;
  isoDateTime: string;
};

const partFormatterCache = new Map<string, Intl.DateTimeFormat>();

export function formatLocalTimeParts(epochMs: number, timeZone: string): LocalTimeParts {
  if (!Number.isFinite(epochMs)) {
    throw new RangeError('epochMs must be a finite number');
  }

  const formatter = getPartFormatter(timeZone);
  const parts = formatter.formatToParts(new Date(epochMs));
  const values = new Map(parts.map((part) => [part.type, part.value]));

  const year = readNumericPart(values, 'year');
  const month = readNumericPart(values, 'month');
  const day = readNumericPart(values, 'day');
  const hour = readNumericPart(values, 'hour');
  const minute = readNumericPart(values, 'minute');
  const second = readNumericPart(values, 'second');
  const offsetMinutes = parseOffsetMinutes(values.get('timeZoneName'));

  return {
    epochMs,
    timeZone,
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

function getPartFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = partFormatterCache.get(timeZone);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    calendar: 'iso8601',
    numberingSystem: 'latn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'longOffset',
  });

  partFormatterCache.set(timeZone, formatter);
  return formatter;
}

function readNumericPart(values: Map<string, string>, name: string): number {
  const value = values.get(name);

  if (value === undefined) {
    throw new Error(`Intl.DateTimeFormat did not return a ${name} part`);
  }

  return Number(value);
}

function parseOffsetMinutes(value: string | undefined): number {
  if (value === undefined || value === 'GMT') {
    return 0;
  }

  const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    throw new Error(`Unsupported time zone offset format: ${value}`);
  }

  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}
