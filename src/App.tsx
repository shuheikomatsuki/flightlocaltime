import { useEffect, useMemo, useState } from 'react';
import { FlightForm, type FlightFormValue } from './components/FlightForm';
import { FlightGlobe } from './components/FlightGlobe';
import { AIRPORTS, getAirportByCode } from './data/airports';
import { formatLocalTimeParts, localIsoToUtcEpochMs } from './lib/time';

const defaultFlight: FlightFormValue = {
  fromCode: 'HND',
  toCode: 'LAX',
  departureLocalIso: '2026-08-01T18:00',
  durationHours: 10,
  durationMinutes: 0,
};

export function App() {
  const [flight, setFlight] = useState(defaultFlight);
  const [departureUtcEpochMs, setDepartureUtcEpochMs] = useState<number | null>(null);

  const fromAirport = useMemo(() => getAirportByCode(flight.fromCode), [flight.fromCode]);
  const toAirport = useMemo(() => getAirportByCode(flight.toCode), [flight.toCode]);

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

  const durationText = `${flight.durationHours}h ${flight.durationMinutes}m`;

  return (
    <main className="app-shell" data-testid="app-shell">
      <aside className="control-panel">
        <header className="app-header">
          <p className="eyebrow">Flight Timezone</p>
          <h1>Flighttime</h1>
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
        <FlightGlobe from={fromAirport} to={toAirport} />
      </section>
    </main>
  );
}
