import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
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
const PLAYBACK_DURATION_MS = 12_000;

export function App() {
  const [flight, setFlight] = useState(readInitialFlight);
  const [progress, setProgress] = useState(readInitialProgress);
  const [departureUtcEpochMs, setDepartureUtcEpochMs] = useState<number | null>(null);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'failed' | 'reset'>('idle');
  const [isPlaying, setIsPlaying] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const progressRef = useRef(progress);

  const fromAirport = useMemo(() => getAirportByCode(flight.fromCode), [flight.fromCode]);
  const toAirport = useMemo(() => getAirportByCode(flight.toCode), [flight.toCode]);

  useEffect(() => {
    writeStorage(FLIGHT_STORAGE_KEY, flight);
  }, [flight]);

  useEffect(() => {
    writeStorage(PROGRESS_STORAGE_KEY, progress);
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    if (!isPlaying) {
      lastFrameTimeRef.current = null;

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      return;
    }

    const tick = (timestamp: number) => {
      const lastFrameTime = lastFrameTimeRef.current ?? timestamp;
      lastFrameTimeRef.current = timestamp;
      const deltaProgress = (timestamp - lastFrameTime) / PLAYBACK_DURATION_MS;
      const nextProgress = Math.min(1, progressRef.current + deltaProgress);

      progressRef.current = nextProgress;
      setProgress(nextProgress);

      if (nextProgress >= 1) {
        setIsPlaying(false);
        return;
      }

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying]);

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
    const nextProgress = Number(event.currentTarget.value);
    progressRef.current = nextProgress;
    setProgress(nextProgress);
  };
  const shareUrl = useMemo(() => createShareUrl(flight, progress), [flight, progress]);
  const handleShare = useCallback(async () => {
    setShareStatus('idle');

    try {
      await copyTextToClipboard(shareUrl);
      setShareStatus('copied');
    } catch {
      setShareStatus('failed');
    }
  }, [shareUrl]);
  const handleResetUrl = useCallback(() => {
    window.history.replaceState(window.history.state, '', createCleanCurrentUrl());
    setShareStatus('reset');
  }, []);
  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    if (progress >= 1) {
      progressRef.current = 0;
      setProgress(0);
    }

    setIsPlaying(true);
  };

  return (
    <main className="app-shell" data-testid="app-shell">
      <aside className="control-panel">
        <header className="app-header">
          <p className="eyebrow">Flight Timezone</p>
          <h1>Flight Time</h1>
        </header>

        <FlightForm airports={AIRPORTS} value={flight} onChange={setFlight} />

        <section className="share-panel" aria-label="Share route settings">
          <div className="share-actions">
            <button className="share-button" type="button" onClick={handleShare}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="8" y="8" width="11" height="11" rx="2" />
                <path d="M5 15V7a2 2 0 0 1 2-2h8" />
              </svg>
              <span>Copy URL</span>
            </button>
            <button
              className="share-button share-button--secondary"
              type="button"
              onClick={handleResetUrl}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h11a5 5 0 1 1-3.5 8.5" />
                <path d="M4 7l4-4" />
                <path d="M4 7l4 4" />
              </svg>
              <span>Reset URL</span>
            </button>
          </div>
          <input
            aria-label="Copy URL"
            className="share-url-field"
            type="text"
            value={shareUrl}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
          />
          <p aria-live="polite">
            {shareStatus === 'copied'
              ? 'Copied to clipboard'
              : shareStatus === 'failed'
                ? 'Copy blocked. Select the URL manually.'
                : shareStatus === 'reset'
                  ? 'Address bar URL reset'
                  : 'Copy current route settings'}
          </p>
        </section>

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

          <section className="timeline-panel" aria-label="Flight progress">
            <div className="timeline-panel__header">
              <div className="timeline-title">
                <button
                  className="playback-button"
                  type="button"
                  onClick={togglePlayback}
                  aria-label={isPlaying ? 'Pause flight progress' : 'Play flight progress'}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M8 5v14" />
                      <path d="M16 5v14" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <span className="summary-label">Progress</span>
              </div>
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
        </div>
      </section>
    </main>
  );
}

function readInitialFlight(): FlightFormValue {
  return readFlightFromUrl() ?? readStoredFlight();
}

function readInitialProgress(): number {
  return readProgressFromUrl() ?? readStoredProgress();
}

function readFlightFromUrl(): FlightFormValue | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const hasFlightParams = ['from', 'to', 'dt', 'h', 'm', 'mode'].some((key) => params.has(key));
  const fromCode = params.get('from');
  const toCode = params.get('to');
  const departureLocalIso = params.get('dt');

  if (!hasFlightParams) {
    return null;
  }

  const mode = params.get('mode');

  return {
    fromCode: isAirportCode(fromCode) ? fromCode : defaultFlight.fromCode,
    toCode: isAirportCode(toCode) ? toCode : defaultFlight.toCode,
    departureLocalIso: isDepartureLocalIso(departureLocalIso)
      ? departureLocalIso
      : defaultFlight.departureLocalIso,
    durationHours: clampInteger(params.get('h'), 0, 24, defaultFlight.durationHours),
    durationMinutes: clampInteger(params.get('m'), 0, 59, defaultFlight.durationMinutes),
    flightLocalTimeMode: mode === 'lng' || mode === 'longitude' ? 'longitude' : 'time-zone',
  };
}

function readProgressFromUrl(): number | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const params = new URLSearchParams(window.location.search);

  if (!params.has('p')) {
    return null;
  }

  return clampNumber(params.get('p'), 0, 1, 0);
}

function readStoredFlight(): FlightFormValue {
  const storedValue = readStorage(FLIGHT_STORAGE_KEY);

  if (!isRecord(storedValue)) {
    return defaultFlight;
  }

  return {
    fromCode: isAirportCode(storedValue.fromCode) ? storedValue.fromCode : defaultFlight.fromCode,
    toCode: isAirportCode(storedValue.toCode) ? storedValue.toCode : defaultFlight.toCode,
    departureLocalIso: isDepartureLocalIso(storedValue.departureLocalIso)
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

function createShareUrl(flight: FlightFormValue, progress: number): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('from', flight.fromCode);
  url.searchParams.set('to', flight.toCode);
  url.searchParams.set('dt', flight.departureLocalIso);
  url.searchParams.set('h', String(flight.durationHours));
  url.searchParams.set('m', String(flight.durationMinutes));
  url.searchParams.set('mode', flight.flightLocalTimeMode === 'longitude' ? 'lng' : 'tz');
  url.searchParams.set('p', progress.toFixed(3).replace(/0+$/, '').replace(/\.$/, ''));

  return url.toString();
}

function createCleanCurrentUrl(): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';

  return url.toString();
}

async function copyTextToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '-9999px';
    document.body.append(textarea);
    textarea.select();

    try {
      if (!document.execCommand('copy')) {
        throw new Error('Copy command failed');
      }
    } finally {
      textarea.remove();
    }
  }
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

function isDepartureLocalIso(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);
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
