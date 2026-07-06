import tzLookup from '@photostructure/tz-lookup';
import { assertValidCoordinates, type Coordinates } from './coordinates';
import {
  assertValidProgress,
  sampleGreatCircleRoute,
  type GreatCircleRoute,
  type RouteSample,
} from './greatCircle';

export type TimeZoneLookup = (coordinates: Coordinates) => string;

export type RouteTimeZoneSample = RouteSample & {
  timeZone: string;
};

export type RouteTimeZoneCache = {
  route: GreatCircleRoute;
  samples: RouteTimeZoneSample[];
};

export function lookupTimeZone(coordinates: Coordinates): string {
  assertValidCoordinates(coordinates);
  return tzLookup(coordinates.latitude, coordinates.longitude);
}

export function createRouteTimeZoneCache(
  route: GreatCircleRoute,
  options: {
    sampleCount?: number;
    lookup?: TimeZoneLookup;
  } = {},
): RouteTimeZoneCache {
  const sampleCount = options.sampleCount ?? 101;
  const lookup = options.lookup ?? lookupTimeZone;

  return {
    route,
    samples: sampleGreatCircleRoute(route, sampleCount).map((sample) => ({
      ...sample,
      timeZone: lookup(sample.coordinates),
    })),
  };
}

export function getCachedRouteTimeZone(
  cache: RouteTimeZoneCache,
  progress: number,
): RouteTimeZoneSample {
  assertValidProgress(progress);

  if (cache.samples.length < 2) {
    throw new RangeError('cache.samples must contain at least 2 samples');
  }

  const nearestIndex = Math.round(progress * (cache.samples.length - 1));
  return cache.samples[nearestIndex];
}
