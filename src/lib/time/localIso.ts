import type { DateTime } from 'luxon';

type LuxonModule = typeof import('luxon');

export type LocalIsoToUtcEpochOptions = {
  disambiguation?: 'compatible' | 'reject';
};

export async function localIsoToUtcEpochMs(
  localIso: string,
  timeZone: string,
  options: LocalIsoToUtcEpochOptions = {},
): Promise<number> {
  const { DateTime } = await importLuxon();
  const localDateTime = DateTime.fromISO(localIso, {
    zone: timeZone,
    setZone: true,
  });

  if (!localDateTime.isValid) {
    throw new RangeError(localDateTime.invalidExplanation ?? 'Invalid local ISO date time');
  }

  if (options.disambiguation === 'reject') {
    assertWallClockWasPreserved(localIso, localDateTime);
  }

  return localDateTime.toUTC().toMillis();
}

let luxonImport: Promise<LuxonModule> | undefined;

function importLuxon(): Promise<LuxonModule> {
  luxonImport ??= import('luxon');
  return luxonImport;
}

function assertWallClockWasPreserved(localIso: string, localDateTime: DateTime): void {
  const parsed = parseLocalIsoMinuteParts(localIso);

  if (parsed === undefined) {
    return;
  }

  if (
    localDateTime.year !== parsed.year ||
    localDateTime.month !== parsed.month ||
    localDateTime.day !== parsed.day ||
    localDateTime.hour !== parsed.hour ||
    localDateTime.minute !== parsed.minute
  ) {
    throw new RangeError(`Local time does not exist in ${localDateTime.zoneName}: ${localIso}`);
  }
}

function parseLocalIsoMinuteParts(localIso: string):
  | {
      year: number;
      month: number;
      day: number;
      hour: number;
      minute: number;
    }
  | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(localIso);

  if (!match) {
    return undefined;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
}
