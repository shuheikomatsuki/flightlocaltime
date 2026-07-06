import { describe, expect, it } from 'vitest';
import {
  createRouteTimeZoneCache,
  getCachedRouteTimeZone,
  getInitialRouteDirection,
  interpolateGreatCircle,
  lookupTimeZone,
  sampleGreatCircleRoute,
  type Coordinates,
} from '.';

const hnd: Coordinates = {
  latitude: 35.5494,
  longitude: 139.7798,
};

const lax: Coordinates = {
  latitude: 33.9416,
  longitude: -118.4085,
};

const lhr: Coordinates = {
  latitude: 51.47,
  longitude: -0.4543,
};

const jfk: Coordinates = {
  latitude: 40.6413,
  longitude: -73.7781,
};

describe('interpolateGreatCircle', () => {
  it('returns the endpoints at progress 0 and 1', () => {
    expectCoordinatesToBeClose(interpolateGreatCircle({ from: hnd, to: lax }, 0), hnd);
    expectCoordinatesToBeClose(interpolateGreatCircle({ from: hnd, to: lax }, 1), lax);
  });

  it('follows a great-circle route across the date line instead of linear longitude', () => {
    const midpoint = interpolateGreatCircle({ from: hnd, to: lax }, 0.5);

    expect(midpoint.latitude).toBeCloseTo(47.7223, 4);
    expect(midpoint.longitude).toBeCloseTo(-168.6281, 4);
  });

  it('rejects progress outside the slider range', () => {
    expect(() => interpolateGreatCircle({ from: hnd, to: lax }, -0.01)).toThrow(RangeError);
  });
});

describe('sampleGreatCircleRoute', () => {
  it('samples a route at evenly spaced progress values including both endpoints', () => {
    const samples = sampleGreatCircleRoute({ from: hnd, to: lax }, 5);

    expect(samples.map((sample) => sample.progress)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expectCoordinatesToBeClose(samples[0].coordinates, hnd);
    expectCoordinatesToBeClose(samples[4].coordinates, lax);
  });
});

function expectCoordinatesToBeClose(actual: Coordinates, expected: Coordinates): void {
  expect(actual.latitude).toBeCloseTo(expected.latitude, 10);
  expect(actual.longitude).toBeCloseTo(expected.longitude, 10);
}

describe('lookupTimeZone', () => {
  it('looks up IANA time zones from latitude and longitude', () => {
    expect(lookupTimeZone(hnd)).toBe('Asia/Tokyo');
    expect(lookupTimeZone(lax)).toBe('America/Los_Angeles');
    expect(lookupTimeZone(lhr)).toBe('Europe/London');
    expect(lookupTimeZone(jfk)).toBe('America/New_York');
  });
});

describe('createRouteTimeZoneCache', () => {
  it('precomputes timezone samples and reads the nearest sample during slider movement', () => {
    const cache = createRouteTimeZoneCache(
      { from: hnd, to: lax },
      {
        sampleCount: 5,
        lookup: ({ longitude }) => (longitude >= 0 ? 'Eastern/Test' : 'Western/Test'),
      },
    );

    expect(cache.samples).toHaveLength(5);
    expect(getCachedRouteTimeZone(cache, 0).timeZone).toBe('Eastern/Test');
    expect(getCachedRouteTimeZone(cache, 0.5).timeZone).toBe('Western/Test');
    expect(getCachedRouteTimeZone(cache, 1).timeZone).toBe('Western/Test');
  });
});

describe('getInitialRouteDirection', () => {
  it('fixes eastbound direction for Tokyo to Los Angeles across the Pacific', () => {
    expect(getInitialRouteDirection(hnd, lax)).toBe('eastbound');
  });

  it('fixes westbound direction for Los Angeles to Tokyo', () => {
    expect(getInitialRouteDirection(lax, hnd)).toBe('westbound');
  });

  it('fixes westbound direction for London to New York', () => {
    expect(getInitialRouteDirection(lhr, jfk)).toBe('westbound');
  });
});
