import { describe, expect, it } from 'vitest';
import { formatLocalTimeParts, getDayPeriod, localIsoToUtcEpochMs, progressToUtcEpochMs } from '.';

describe('progressToUtcEpochMs', () => {
  it('converts progress from 0 to 1 into a UTC epoch inside the flight duration', () => {
    const departureUtcEpochMs = Date.UTC(2026, 7, 1, 9, 0, 0);
    const durationMs = 10 * 60 * 60 * 1000;

    expect(progressToUtcEpochMs({ departureUtcEpochMs, durationMs, progress: 0 })).toBe(
      departureUtcEpochMs,
    );
    expect(progressToUtcEpochMs({ departureUtcEpochMs, durationMs, progress: 0.5 })).toBe(
      Date.UTC(2026, 7, 1, 14, 0, 0),
    );
    expect(progressToUtcEpochMs({ departureUtcEpochMs, durationMs, progress: 1 })).toBe(
      Date.UTC(2026, 7, 1, 19, 0, 0),
    );
  });

  it('rejects progress outside the slider range', () => {
    expect(() =>
      progressToUtcEpochMs({
        departureUtcEpochMs: Date.UTC(2026, 0, 1),
        durationMs: 60_000,
        progress: 1.1,
      }),
    ).toThrow(RangeError);
  });
});

describe('formatLocalTimeParts', () => {
  it('formats the same epoch in departure and arrival time zones across the date line', () => {
    const epochMs = Date.UTC(2026, 7, 1, 9, 0, 0);

    expect(formatLocalTimeParts(epochMs, 'Asia/Tokyo')).toMatchObject({
      isoDateTime: '2026-08-01T18:00:00',
      offsetMinutes: 540,
    });
    expect(formatLocalTimeParts(epochMs, 'America/Los_Angeles')).toMatchObject({
      isoDateTime: '2026-08-01T02:00:00',
      offsetMinutes: -420,
    });
  });

  it('handles half-hour and 45-minute time zones without rounding offsets', () => {
    const epochMs = Date.UTC(2026, 0, 1, 0, 0, 0);

    expect(formatLocalTimeParts(epochMs, 'Asia/Kolkata')).toMatchObject({
      isoDateTime: '2026-01-01T05:30:00',
      offsetMinutes: 330,
    });
    expect(formatLocalTimeParts(epochMs, 'Asia/Kathmandu')).toMatchObject({
      isoDateTime: '2026-01-01T05:45:00',
      offsetMinutes: 345,
    });
  });

  it('uses the target IANA time zone DST rules for spring-forward and fall-back boundaries', () => {
    expect(
      formatLocalTimeParts(Date.UTC(2026, 2, 8, 9, 59, 0), 'America/Los_Angeles'),
    ).toMatchObject({
      isoDateTime: '2026-03-08T01:59:00',
      offsetMinutes: -480,
    });
    expect(
      formatLocalTimeParts(Date.UTC(2026, 2, 8, 10, 0, 0), 'America/Los_Angeles'),
    ).toMatchObject({
      isoDateTime: '2026-03-08T03:00:00',
      offsetMinutes: -420,
    });
    expect(
      formatLocalTimeParts(Date.UTC(2026, 10, 1, 8, 59, 0), 'America/Los_Angeles'),
    ).toMatchObject({
      isoDateTime: '2026-11-01T01:59:00',
      offsetMinutes: -420,
    });
    expect(
      formatLocalTimeParts(Date.UTC(2026, 10, 1, 9, 0, 0), 'America/Los_Angeles'),
    ).toMatchObject({
      isoDateTime: '2026-11-01T01:00:00',
      offsetMinutes: -480,
    });
  });
});

describe('localIsoToUtcEpochMs', () => {
  it('converts a departure local wall-clock time into UTC epoch milliseconds', async () => {
    await expect(localIsoToUtcEpochMs('2026-08-01T18:00', 'Asia/Tokyo')).resolves.toBe(
      Date.UTC(2026, 7, 1, 9, 0, 0),
    );
  });

  it('converts local times with non-integer-hour offsets', async () => {
    await expect(localIsoToUtcEpochMs('2026-01-01T05:45', 'Asia/Kathmandu')).resolves.toBe(
      Date.UTC(2026, 0, 1, 0, 0, 0),
    );
  });

  it('rejects a wall-clock time that does not exist during a DST spring-forward gap', async () => {
    await expect(
      localIsoToUtcEpochMs('2026-03-08T02:30', 'America/Los_Angeles', {
        disambiguation: 'reject',
      }),
    ).rejects.toThrow(RangeError);
  });
});

describe('getDayPeriod', () => {
  it.each([
    [5, 'morning'],
    [12, 'daytime'],
    [18, 'evening'],
    [23, 'night'],
    [4, 'night'],
  ] as const)('classifies %i:00 as %s', (hour, expected) => {
    expect(getDayPeriod(hour)).toBe(expected);
  });
});
