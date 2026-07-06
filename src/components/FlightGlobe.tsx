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
import type { Airport } from '../data/airports';
import {
  getInitialRouteDirection,
  interpolateGreatCircle,
  sampleGreatCircleRoute,
  type RouteDirection,
} from '../lib/route';

const Globe = lazy(() => import('react-globe.gl'));
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

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
        altitude: 3.5,
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
              globeImageUrl="/textures/2k_earth_daymap.jpg"
              bumpImageUrl="/textures/earth-topology.png"
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
    </section>
  );
}

function createPlaneElement(marker: PlaneMarker): HTMLElement {
  const element = document.createElement('div');
  element.className = 'plane-marker';

  const plane = document.createElement('span');
  plane.className = `plane-shape plane-shape--${marker.direction}`;

  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  svg.setAttribute('class', 'plane-icon');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('aria-hidden', 'true');

  const body = document.createElementNS(SVG_NAMESPACE, 'path');
  body.setAttribute('class', 'plane-icon__body');
  body.setAttribute(
    'd',
    [
      'M58 32',
      'c0-2.3-1.7-3.6-4.6-4',
      'l-16.1-2.3',
      'L30.2 7.8',
      'C29.8 6.7 28.8 6 27.6 6',
      'h-4',
      'c-0.9 0-1.5 0.9-1.2 1.8',
      'L27.6 24.4',
      'l-13.5-1.9',
      'l-5.7-7.8',
      'C7.9 14 7.1 13.6 6.3 13.6',
      'H4.1',
      'c-0.9 0-1.5 0.9-1.1 1.7',
      'L8.7 32',
      'L3 48.7',
      'c-0.3 0.8 0.3 1.7 1.1 1.7',
      'h2.2',
      'c0.8 0 1.6-0.4 2.1-1.1',
      'l5.7-7.8',
      'l13.5-1.9',
      'l-5.2 16.6',
      'c-0.3 0.9 0.3 1.8 1.2 1.8',
      'h4',
      'c1.2 0 2.2-0.7 2.6-1.8',
      'l7.1-17.9',
      'L53.4 36',
      'c2.9-0.4 4.6-1.7 4.6-4',
      'Z',
    ].join(' '),
  );

  const cockpit = document.createElementNS(SVG_NAMESPACE, 'path');
  cockpit.setAttribute('class', 'plane-icon__cockpit');
  cockpit.setAttribute(
    'd',
    'M48 30.2c2.2 0.3 3.4 0.9 3.4 1.8s-1.2 1.5-3.4 1.8l-6.5 0.9v-5.4l6.5 0.9Z',
  );

  svg.append(body, cockpit);
  plane.append(svg);
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
