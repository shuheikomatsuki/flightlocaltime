import type { CSSProperties } from 'react';
import type { Airport } from '../data/airports';
import { formatLocalTimeParts, getDayPeriod, type LocalTimeParts } from '../lib/time';

export type TimeCardKind = 'departure' | 'flight' | 'arrival';

type TimeCardProps = {
  title: string;
  kind: TimeCardKind;
  epochMs: number | null;
  timeZone: string;
  airport?: Airport;
  localTimeParts?: LocalTimeParts | null;
  timeZoneLabel?: string;
};

export function TimeCard({
  title,
  kind,
  epochMs,
  timeZone,
  airport,
  localTimeParts,
  timeZoneLabel,
}: TimeCardProps) {
  const localTime =
    localTimeParts === undefined
      ? epochMs === null
        ? null
        : formatLocalTimeParts(epochMs, timeZone)
      : localTimeParts;
  const period = localTime === null ? 'night' : getDayPeriod(localTime.hour);
  const celestialPosition =
    localTime === null ? { x: 50, y: 50 } : getCelestialPosition(localTime.hour, localTime.minute);

  return (
    <article className={`time-card time-card--${kind} time-card--${period}`}>
      <div className="time-card__header">
        <div>
          <span className="summary-label">{title}</span>
          <h2>{airport ? airport.city : 'Current position'}</h2>
        </div>
        <span
          className={`celestial celestial--${period}`}
          style={
            {
              '--celestial-x': `${celestialPosition.x}%`,
              '--celestial-y': `${celestialPosition.y}%`,
            } as CSSProperties
          }
          aria-hidden="true"
        >
          <span />
        </span>
      </div>

      <div className="time-card__body">
        <time>{localTime ? `${pad(localTime.hour)}:${pad(localTime.minute)}` : '--:--'}</time>
        <span>
          {localTime
            ? `${localTime.year}-${pad(localTime.month)}-${pad(localTime.day)}`
            : 'Invalid'}
        </span>
      </div>

      <footer className="time-card__footer">
        <span className="time-card__zone">{timeZoneLabel ?? timeZone}</span>
      </footer>
    </article>
  );
}

function getCelestialPosition(hour: number, minute: number): { x: number; y: number } {
  const decimalHour = hour + minute / 60;

  if (hour >= 5 && hour <= 18) {
    const daylightProgress = Math.max(0, Math.min(1, (decimalHour - 5) / 14));
    return {
      x: 82 - daylightProgress * 64,
      y: 76 - Math.sin(daylightProgress * Math.PI) * 58,
    };
  }

  const nightHour = decimalHour >= 19 ? decimalHour - 19 : decimalHour + 5;
  const nightProgress = Math.max(0, Math.min(1, nightHour / 10));
  return {
    x: 82 - nightProgress * 64,
    y: 72 - Math.sin(nightProgress * Math.PI) * 46,
  };
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
