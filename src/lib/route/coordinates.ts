export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type GeoPoint = [longitude: number, latitude: number];

export function assertValidCoordinates(coordinates: Coordinates, name = 'coordinates'): void {
  assertFiniteNumber(coordinates.latitude, `${name}.latitude`);
  assertFiniteNumber(coordinates.longitude, `${name}.longitude`);

  if (coordinates.latitude < -90 || coordinates.latitude > 90) {
    throw new RangeError(`${name}.latitude must be between -90 and 90`);
  }

  if (coordinates.longitude < -180 || coordinates.longitude > 180) {
    throw new RangeError(`${name}.longitude must be between -180 and 180`);
  }
}

export function toGeoPoint({ latitude, longitude }: Coordinates): GeoPoint {
  return [longitude, latitude];
}

export function fromGeoPoint([longitude, latitude]: GeoPoint): Coordinates {
  return {
    latitude: normalizeLatitude(latitude),
    longitude: normalizeLongitude(longitude),
  };
}

export function normalizeLongitude(longitude: number): number {
  const normalized = ((((longitude + 180) % 360) + 360) % 360) - 180;
  return Object.is(normalized, -0) ? 0 : normalized;
}

function normalizeLatitude(latitude: number): number {
  return Object.is(latitude, -0) ? 0 : latitude;
}

function assertFiniteNumber(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number`);
  }
}
