import { geoInterpolate } from 'd3-geo';
import { assertValidCoordinates, fromGeoPoint, toGeoPoint, type Coordinates } from './coordinates';

export type GreatCircleRoute = {
  from: Coordinates;
  to: Coordinates;
};

export type RouteSample = {
  progress: number;
  coordinates: Coordinates;
};

export function interpolateGreatCircle(route: GreatCircleRoute, progress: number): Coordinates {
  assertValidCoordinates(route.from, 'route.from');
  assertValidCoordinates(route.to, 'route.to');
  assertValidProgress(progress);

  const interpolate = geoInterpolate(toGeoPoint(route.from), toGeoPoint(route.to));
  return fromGeoPoint(interpolate(progress));
}

export function sampleGreatCircleRoute(
  route: GreatCircleRoute,
  sampleCount: number,
): RouteSample[] {
  assertValidSampleCount(sampleCount);

  const interpolate = geoInterpolate(toGeoPoint(route.from), toGeoPoint(route.to));
  const denominator = sampleCount - 1;

  return Array.from({ length: sampleCount }, (_, index) => {
    const progress = index / denominator;

    return {
      progress,
      coordinates: fromGeoPoint(interpolate(progress)),
    };
  });
}

export function assertValidProgress(progress: number): void {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
    throw new RangeError('progress must be between 0 and 1');
  }
}

function assertValidSampleCount(sampleCount: number): void {
  if (!Number.isInteger(sampleCount) || sampleCount < 2) {
    throw new RangeError('sampleCount must be an integer greater than or equal to 2');
  }
}
