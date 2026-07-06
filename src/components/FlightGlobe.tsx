import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { GlobeMethods } from 'react-globe.gl';
import { MeshPhongMaterial } from 'three';
import type { Airport } from '../data/airports';
import {
  getInitialRouteDirection,
  interpolateGreatCircle,
  sampleGreatCircleRoute,
  type Coordinates,
  type RouteDirection,
} from '../lib/route';

const Globe = lazy(() => import('react-globe.gl'));

type FlightGlobeProps = {
  from: Airport;
  to: Airport;
  progress: number;
};

type AirportPoint = {
  code: string;
  label: string;
  lat: number;
  lng: number;
  color: string;
};

type PathPoint = {
  lat: number;
  lng: number;
  altitude: number;
};

type FlightPath = {
  points: PathPoint[];
};

type PlaneMarker = {
  lat: number;
  lng: number;
  direction: RouteDirection;
};

const globeMaterial = new MeshPhongMaterial({
  color: '#1f6f7a',
  emissive: '#082c36',
  shininess: 7,
});

export function FlightGlobe({ from, to, progress }: FlightGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeMethods>(undefined);
  const [isGlobeReady, setIsGlobeReady] = useState(false);
  const size = useElementSize(containerRef);

  const airportPoints = useMemo<AirportPoint[]>(
    () => [toAirportPoint(from, '出発地', '#f2c14e'), toAirportPoint(to, '到着地', '#f78154')],
    [from, to],
  );

  const routePath = useMemo<FlightPath[]>(
    () => [
      {
        points: sampleGreatCircleRoute({ from, to }, 96).map(({ coordinates }) => ({
          lat: coordinates.latitude,
          lng: coordinates.longitude,
          altitude: 0.02,
        })),
      },
    ],
    [from, to],
  );

  const midpoint = useMemo(() => interpolateGreatCircle({ from, to }, 0.5), [from, to]);
  const direction = useMemo(() => getInitialRouteDirection(from, to), [from, to]);
  const planeCoordinates = useMemo(
    () => interpolateGreatCircle({ from, to }, progress),
    [from, progress, to],
  );
  const planeMarker = useMemo<PlaneMarker[]>(
    () => [
      {
        lat: planeCoordinates.latitude,
        lng: planeCoordinates.longitude,
        direction,
      },
    ],
    [direction, planeCoordinates],
  );

  const focusRoute = useCallback(() => {
    globeRef.current?.pointOfView(
      {
        lat: midpoint.latitude,
        lng: midpoint.longitude,
        altitude: 2.15,
      },
      900,
    );
  }, [midpoint]);

  useEffect(() => {
    if (isGlobeReady) {
      focusRoute();
    }
  }, [focusRoute, isGlobeReady]);

  return (
    <section className="globe-stage" aria-label="Flight route globe">
      <div className="globe-canvas" ref={containerRef}>
        <Suspense fallback={<div className="globe-loading">Loading globe</div>}>
          {size.width > 0 && size.height > 0 ? (
            <Globe
              ref={globeRef}
              width={size.width}
              height={size.height}
              globeOffset={[0, -56]}
              backgroundColor="rgba(0,0,0,0)"
              globeMaterial={globeMaterial}
              onGlobeReady={() => {
                setIsGlobeReady(true);
                focusRoute();
              }}
              showAtmosphere
              atmosphereColor="#8fd0d6"
              atmosphereAltitude={0.14}
              showGraticules
              pointsData={airportPoints}
              pointLat="lat"
              pointLng="lng"
              pointColor="color"
              pointAltitude={0.05}
              pointRadius={0.46}
              pointResolution={24}
              pointLabel="label"
              pathsData={routePath}
              pathPoints="points"
              pathPointLat="lat"
              pathPointLng="lng"
              pathPointAlt="altitude"
              pathColor={() => '#fff2a8'}
              pathStroke={2.2}
              pathResolution={2}
              htmlElementsData={planeMarker}
              htmlLat="lat"
              htmlLng="lng"
              htmlAltitude={0.08}
              htmlElement={(datum) => createPlaneElement(datum as PlaneMarker)}
              htmlTransitionDuration={80}
              enablePointerInteraction
            />
          ) : null}
        </Suspense>
      </div>
      <RouteBadge
        from={from}
        to={to}
        direction={direction}
        progress={progress}
        coordinates={planeCoordinates}
      />
    </section>
  );
}

function RouteBadge({
  from,
  to,
  direction,
  progress,
  coordinates,
}: {
  from: Airport;
  to: Airport;
  direction: RouteDirection;
  progress: number;
  coordinates: Coordinates;
}) {
  return (
    <div className="route-badge">
      <span>
        {from.code} to {to.code}
      </span>
      <span>{direction === 'eastbound' ? 'Eastbound' : 'Westbound'}</span>
      <span>{Math.round(progress * 100)}%</span>
      <span>
        {coordinates.latitude.toFixed(1)}, {coordinates.longitude.toFixed(1)}
      </span>
    </div>
  );
}

function createPlaneElement(marker: PlaneMarker): HTMLElement {
  const element = document.createElement('div');
  element.className = 'plane-marker';

  const plane = document.createElement('span');
  plane.className = `plane-shape plane-shape--${marker.direction}`;
  plane.append(document.createElement('span'));
  element.append(plane);

  return element;
}

function toAirportPoint(airport: Airport, kind: string, color: string): AirportPoint {
  return {
    code: airport.code,
    label: `${kind}: ${airport.code} ${airport.city}`,
    lat: airport.latitude,
    lng: airport.longitude,
    color,
  };
}

function useElementSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({
        width: Math.round(width),
        height: Math.round(height),
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
