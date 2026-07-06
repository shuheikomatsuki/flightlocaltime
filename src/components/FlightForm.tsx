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
          <label htmlFor="from">出発地</label>
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
          aria-label="出発地と到着地を入れ替え"
          title="出発地と到着地を入れ替え"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 7h11l-3-3" />
            <path d="M18 7l-3 3" />
            <path d="M17 17H6l3 3" />
            <path d="M6 17l3-3" />
          </svg>
        </button>

        <div className="field">
          <label htmlFor="to">到着地</label>
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
        <label htmlFor="departure">出発日時</label>
        <input
          id="departure"
          type="datetime-local"
          value={value.departureLocalIso}
          onChange={(event) => onChange({ ...value, departureLocalIso: event.target.value })}
        />
      </div>

      <div className="duration-row">
        <div className="field">
          <label htmlFor="duration-hours">飛行時間</label>
          <input
            id="duration-hours"
            type="number"
            min="0"
            max="24"
            value={value.durationHours}
            onChange={(event) =>
              onChange({ ...value, durationHours: Number(event.target.value) || 0 })
            }
          />
        </div>

        <div className="field">
          <label htmlFor="duration-minutes">分</label>
          <input
            id="duration-minutes"
            type="number"
            min="0"
            max="59"
            value={value.durationMinutes}
            onChange={(event) =>
              onChange({ ...value, durationMinutes: Number(event.target.value) || 0 })
            }
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
