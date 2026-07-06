import { assertValidCoordinates, type Coordinates } from './coordinates';

export type RouteDirection = 'eastbound' | 'westbound';

export function getInitialRouteDirection(from: Coordinates, to: Coordinates): RouteDirection {
  assertValidCoordinates(from, 'from');
  assertValidCoordinates(to, 'to');

  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const eastWestComponent = Math.sin(deltaLongitude) * Math.cos(toLatitude);

  return eastWestComponent >= 0 || Math.abs(fromLatitude) === Math.PI / 2
    ? 'eastbound'
    : 'westbound';
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
