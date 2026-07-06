import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { FlightForm, type FlightFormValue } from './components/FlightForm';
import { FlightGlobe } from './components/FlightGlobe';
import { TimeCard } from './components/TimeCard';
import { AIRPORTS, getAirportByCode } from './data/airports';
import {
  createRouteTimeZoneCache,
  getCachedRouteTimeZone,
  interpolateGreatCircle,
} from './lib/route';
import {
  formatLocalTimeParts,
  formatLongitudeLocalTimeParts,
  localIsoToUtcEpochMs,
  progressToUtcEpochMs,
} from './lib/time';

const defaultFlight: FlightFormValue = {
  fromCode: 'HND',
  toCode: 'LAX',
  departureLocalIso: '2026-08-01T18:00',
  durationHours: 10,
  durationMinutes: 0,
  flightLocalTimeMode: 'time-zone',
};

const FLIGHT_STORAGE_KEY = 'flighttime.flight.v1';
const PROGRESS_STORAGE_KEY = 'flighttime.progress.v1';

export function App() {
  const [flight, setFlight] = useState(readStoredFlight);
  const [progress, setProgress] = useState(readStoredProgress);
  const [departureUtcEpochMs, setDepartureUtcEpochMs] = useState<number | null>(null);

  const fromAirport = useMemo(() => getAirportByCode(flight.fromCode), [flight.fromCode]);
  const toAirport = useMemo(() => getAirportByCode(flight.toCode), [flight.toCode]);

  useEffect(() => {
    writeStorage(FLIGHT_STORAGE_KEY, flight);
  }, [flight]);

  useEffect(() => {
    writeStorage(PROGRESS_STORAGE_KEY, progress);
  }, [progress]);

  useEffect(() => {
    let isCurrent = true;

    localIsoToUtcEpochMs(flight.departureLocalIso, fromAirport.timeZone)
      .then((epochMs) => {
        if (isCurrent) {
          setDepartureUtcEpochMs(epochMs);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setDepartureUtcEpochMs(null);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [flight.departureLocalIso, fromAirport.timeZone]);

  const departureUtc = useMemo(() => {
    if (departureUtcEpochMs === null) {
      return 'Invalid';
    }

    return formatLocalTimeParts(departureUtcEpochMs, 'Etc/UTC').isoDateTime.replace('T', ' ');
  }, [departureUtcEpochMs]);

  const durationMs = useMemo(
    () => Math.max(0, flight.durationHours * 60 + flight.durationMinutes) * 60 * 1000,
    [flight.durationHours, flight.durationMinutes],
  );

  const currentUtcEpochMs = useMemo(() => {
    if (departureUtcEpochMs === null) {
      return null;
    }

    return progressToUtcEpochMs({
      departureUtcEpochMs,
      durationMs,
      progress,
    });
  }, [departureUtcEpochMs, durationMs, progress]);

  const routeTimeZoneCache = useMemo(
    () => createRouteTimeZoneCache({ from: fromAirport, to: toAirport }),
    [fromAirport, toAirport],
  );

  const flightTimeZone = useMemo(
    () => getCachedRouteTimeZone(routeTimeZoneCache, progress).timeZone,
    [progress, routeTimeZoneCache],
  );

  const planeCoordinates = useMemo(
    () => interpolateGreatCircle({ from: fromAirport, to: toAirport }, progress),
    [fromAirport, progress, toAirport],
  );

  const flightLocalTimeParts = useMemo(() => {
    if (currentUtcEpochMs === null || flight.flightLocalTimeMode === 'time-zone') {
      return undefined;
    }

    return formatLongitudeLocalTimeParts(currentUtcEpochMs, planeCoordinates);
  }, [currentUtcEpochMs, flight.flightLocalTimeMode, planeCoordinates]);

  const durationText = `${flight.durationHours}h ${flight.durationMinutes}m`;
  const progressText = `${Math.round(progress * 100)}%`;
  const handleProgressInput = (event: FormEvent<HTMLInputElement>) => {
    setProgress(Number(event.currentTarget.value));
  };

  return (
    <main className="app-shell" data-testid="app-shell">
      <aside className="control-panel">
        <header className="app-header">
          <p className="eyebrow">Flight Timezone</p>
          <h1>Flight Time</h1>
        </header>

        <FlightForm airports={AIRPORTS} value={flight} onChange={setFlight} />

        <section className="route-summary" aria-label="Route summary">
          <div>
            <span className="summary-label">From</span>
            <strong>{fromAirport.name}</strong>
            <span>{fromAirport.timeZone}</span>
          </div>
          <div>
            <span className="summary-label">To</span>
            <strong>{toAirport.name}</strong>
            <span>{toAirport.timeZone}</span>
          </div>
          <div className="summary-grid">
            <span>
              <span className="summary-label">UTC</span>
              {departureUtc}
            </span>
            <span>
              <span className="summary-label">Duration</span>
              {durationText}
            </span>
          </div>
        </section>
      </aside>

      <section className="visual-panel">
        <FlightGlobe from={fromAirport} to={toAirport} progress={progress} />

        <div className="flight-overlay">
          <section className="timeline-panel" aria-label="Flight progress">
            <div className="timeline-panel__header">
              <span className="summary-label">Progress</span>
              <strong>{progressText}</strong>
            </div>
            <input
              aria-label="Flight progress"
              className="progress-slider"
              type="range"
              min="0"
              max="1"
              step="0.005"
              value={progress}
              onChange={handleProgressInput}
              onInput={handleProgressInput}
            />
            <div className="timeline-scale">
              <span>Departure</span>
              <span>Arrival</span>
            </div>
          </section>

          <section className="time-card-grid" aria-label="Local times">
            <TimeCard
              title="Departure"
              kind="departure"
              epochMs={currentUtcEpochMs}
              timeZone={fromAirport.timeZone}
              airport={fromAirport}
            />
            <TimeCard
              title="Flight Local"
              kind="flight"
              epochMs={currentUtcEpochMs}
              timeZone={flightTimeZone}
              localTimeParts={flightLocalTimeParts}
              timeZoneLabel={flightLocalTimeParts?.timeZone}
            />
            <TimeCard
              title="Arrival"
              kind="arrival"
              epochMs={currentUtcEpochMs}
              timeZone={toAirport.timeZone}
              airport={toAirport}
            />
          </section>
        </div>
      </section>
    </main>
  );
}

function readStoredFlight(): FlightFormValue {
  const storedValue = readStorage(FLIGHT_STORAGE_KEY);

  if (!isRecord(storedValue)) {
    return defaultFlight;
  }

  return {
    fromCode: isAirportCode(storedValue.fromCode) ? storedValue.fromCode : defaultFlight.fromCode,
    toCode: isAirportCode(storedValue.toCode) ? storedValue.toCode : defaultFlight.toCode,
    departureLocalIso:
      typeof storedValue.departureLocalIso === 'string' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(storedValue.departureLocalIso)
        ? storedValue.departureLocalIso
        : defaultFlight.departureLocalIso,
    durationHours: clampInteger(storedValue.durationHours, 0, 24, defaultFlight.durationHours),
    durationMinutes: clampInteger(
      storedValue.durationMinutes,
      0,
      59,
      defaultFlight.durationMinutes,
    ),
    flightLocalTimeMode:
      storedValue.flightLocalTimeMode === 'longitude' ? 'longitude' : 'time-zone',
  };
}

function readStoredProgress(): number {
  const storedValue = readStorage(PROGRESS_STORAGE_KEY);

  return clampNumber(storedValue, 0, 1, 0);
}

function readStorage(key: string): unknown {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const item = window.localStorage.getItem(key);
    return item === null ? null : JSON.parse(item);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures so the calculator remains usable in private modes.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAirportCode(value: unknown): value is string {
  return typeof value === 'string' && AIRPORTS.some((airport) => airport.code === value);
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const numberValue = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.trunc(numberValue)));
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numberValue = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numberValue));
}
