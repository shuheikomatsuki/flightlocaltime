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

  return (
    <article className={`time-card time-card--${kind} time-card--${period}`}>
      <div className="time-card__header">
        <div>
          <span className="summary-label">{title}</span>
          <h2>{airport ? airport.city : 'Current position'}</h2>
        </div>
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

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
