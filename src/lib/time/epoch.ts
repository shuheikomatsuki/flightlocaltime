export type ProgressToUtcEpochInput = {
  departureUtcEpochMs: number;
  durationMs: number;
  progress: number;
};

export function progressToUtcEpochMs({
  departureUtcEpochMs,
  durationMs,
  progress,
}: ProgressToUtcEpochInput): number {
  assertFiniteNumber(departureUtcEpochMs, 'departureUtcEpochMs');
  assertFiniteNumber(durationMs, 'durationMs');
  assertFiniteNumber(progress, 'progress');

  if (durationMs < 0) {
    throw new RangeError('durationMs must be greater than or equal to 0');
  }

  if (progress < 0 || progress > 1) {
    throw new RangeError('progress must be between 0 and 1');
  }

  return Math.round(departureUtcEpochMs + durationMs * progress);
}

function assertFiniteNumber(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number`);
  }
}
