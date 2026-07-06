import type { Coordinates } from '../lib/route';

export type Airport = Coordinates & {
  code: string;
  name: string;
  city: string;
  country: string;
  timeZone: string;
};

export const AIRPORTS: Airport[] = [
  {
    code: 'HND',
    name: 'Tokyo Haneda',
    city: 'Tokyo',
    country: 'Japan',
    latitude: 35.5494,
    longitude: 139.7798,
    timeZone: 'Asia/Tokyo',
  },
  {
    code: 'NRT',
    name: 'Narita International',
    city: 'Tokyo',
    country: 'Japan',
    latitude: 35.7719,
    longitude: 140.3929,
    timeZone: 'Asia/Tokyo',
  },
  {
    code: 'LAX',
    name: 'Los Angeles International',
    city: 'Los Angeles',
    country: 'United States',
    latitude: 33.9416,
    longitude: -118.4085,
    timeZone: 'America/Los_Angeles',
  },
  {
    code: 'JFK',
    name: 'John F. Kennedy International',
    city: 'New York',
    country: 'United States',
    latitude: 40.6413,
    longitude: -73.7781,
    timeZone: 'America/New_York',
  },
  {
    code: 'LHR',
    name: 'Heathrow',
    city: 'London',
    country: 'United Kingdom',
    latitude: 51.47,
    longitude: -0.4543,
    timeZone: 'Europe/London',
  },
  {
    code: 'CDG',
    name: 'Charles de Gaulle',
    city: 'Paris',
    country: 'France',
    latitude: 49.0097,
    longitude: 2.5479,
    timeZone: 'Europe/Paris',
  },
  {
    code: 'SIN',
    name: 'Singapore Changi',
    city: 'Singapore',
    country: 'Singapore',
    latitude: 1.3644,
    longitude: 103.9915,
    timeZone: 'Asia/Singapore',
  },
  {
    code: 'SYD',
    name: 'Sydney Kingsford Smith',
    city: 'Sydney',
    country: 'Australia',
    latitude: -33.9399,
    longitude: 151.1753,
    timeZone: 'Australia/Sydney',
  },
  {
    code: 'DXB',
    name: 'Dubai International',
    city: 'Dubai',
    country: 'United Arab Emirates',
    latitude: 25.2532,
    longitude: 55.3657,
    timeZone: 'Asia/Dubai',
  },
];

export function getAirportByCode(code: string): Airport {
  const airport = AIRPORTS.find((candidate) => candidate.code === code);

  if (!airport) {
    throw new Error(`Unknown airport code: ${code}`);
  }

  return airport;
}
