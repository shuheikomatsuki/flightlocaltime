import { useState } from 'react';
import type { Airport } from '../data/airports';

export type FlightLocalTimeMode = 'time-zone' | 'longitude';

export type FlightFormValue = {
  fromCode: string;
  toCode: string;
  departureLocalIso: string;
  durationHours: number;
  durationMinutes: number;
  flightLocalTimeMode: FlightLocalTimeMode;
};

type FlightFormProps = {
  airports: Airport[];
  value: FlightFormValue;
  onChange: (value: FlightFormValue) => void;
};

export function FlightForm({ airports, value, onChange }: FlightFormProps) {
  const [durationHoursText, setDurationHoursText] = useState(String(value.durationHours));
  const [durationMinutesText, setDurationMinutesText] = useState(String(value.durationMinutes));

  const swapAirports = () => {
    onChange({
      ...value,
      fromCode: value.toCode,
      toCode: value.fromCode,
    });
  };

  return (
    <form className="flight-form">
      <div className="route-fields">
        <div className="field">
          <label htmlFor="from">From</label>
          <select
            id="from"
            value={value.fromCode}
            onChange={(event) => onChange({ ...value, fromCode: event.target.value })}
          >
            {airports.map((airport) => (
              <option key={airport.code} value={airport.code}>
                {airport.code} - {airport.city}
              </option>
            ))}
          </select>
        </div>

        <button
          className="swap-route-button"
          type="button"
          onClick={swapAirports}
          aria-label="Swap origin and destination"
          title="Swap origin and destination"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 7h11l-3-3" />
            <path d="M18 7l-3 3" />
            <path d="M17 17H6l3 3" />
            <path d="M6 17l3-3" />
          </svg>
        </button>

        <div className="field">
          <label htmlFor="to">To</label>
          <select
            id="to"
            value={value.toCode}
            onChange={(event) => onChange({ ...value, toCode: event.target.value })}
          >
            {airports.map((airport) => (
              <option key={airport.code} value={airport.code}>
                {airport.code} - {airport.city}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="departure">Departure time</label>
        <input
          id="departure"
          type="datetime-local"
          value={value.departureLocalIso}
          onChange={(event) => onChange({ ...value, departureLocalIso: event.target.value })}
        />
      </div>

      <div className="duration-row">
        <div className="field">
          <label htmlFor="duration-hours">Hours</label>
          <input
            id="duration-hours"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={durationHoursText}
            onBlur={() => setDurationHoursText(String(value.durationHours))}
            onChange={(event) => {
              const nextValue = normalizeDurationInput(event.target.value, 24);
              setDurationHoursText(nextValue.text);
              onChange({ ...value, durationHours: nextValue.value });
            }}
          />
        </div>

        <div className="field">
          <label htmlFor="duration-minutes">Minutes</label>
          <input
            id="duration-minutes"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={durationMinutesText}
            onBlur={() => setDurationMinutesText(String(value.durationMinutes))}
            onChange={(event) => {
              const nextValue = normalizeDurationInput(event.target.value, 59);
              setDurationMinutesText(nextValue.text);
              onChange({ ...value, durationMinutes: nextValue.value });
            }}
          />
        </div>
      </div>

      <fieldset className="mode-field">
        <legend>Flight location time</legend>
        <div className="segmented-control">
          <label>
            <input
              type="radio"
              name="flight-local-time-mode"
              value="time-zone"
              checked={value.flightLocalTimeMode === 'time-zone'}
              onChange={() => onChange({ ...value, flightLocalTimeMode: 'time-zone' })}
            />
            <span>Time zone</span>
          </label>
          <label>
            <input
              type="radio"
              name="flight-local-time-mode"
              value="longitude"
              checked={value.flightLocalTimeMode === 'longitude'}
              onChange={() => onChange({ ...value, flightLocalTimeMode: 'longitude' })}
            />
            <span>Longitude</span>
          </label>
        </div>
      </fieldset>
    </form>
  );
}

function normalizeDurationInput(rawValue: string, max: number): { text: string; value: number } {
  const digits = rawValue.replace(/\D/g, '');

  if (digits === '') {
    return { text: '', value: 0 };
  }

  const value = Math.min(max, Number(digits));

  return {
    text: String(value),
    value,
  };
}
