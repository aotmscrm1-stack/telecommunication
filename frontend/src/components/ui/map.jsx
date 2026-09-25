import * as MapLibreGL from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { X, Minus, Plus, Locate, Maximize, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Web Worker setup - self-hosted worker in public/ with fallback to unpkg
if (typeof window !== "undefined" && !MapLibreGL.getWorkerUrl()) {
  try {
    MapLibreGL.setWorkerUrl("/maplibre-gl-worker.mjs");
  } catch (e) {
    MapLibreGL.setWorkerUrl(
      `https://unpkg.com/maplibre-gl@${MapLibreGL.getVersion()}/dist/maplibre-gl-worker.mjs`
    );
  }
}

const defaultStyles = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
};

const blankMapStyle = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "rgba(0, 0, 0, 0)" },
    },
  ],
};

function useStableValue(value) {
  const key = useMemo(() => JSON.stringify(value) ?? "", [value]);
  return useMemo(() => value, [key]);
}

function mergeHoverPaint(paint, hoverPaint) {
  if (!hoverPaint) return paint;
  const merged = { ...paint };
  for (const [key, hoverValue] of Object.entries(hoverPaint)) {
    if (hoverValue === undefined) continue;
    const baseValue = merged[key];
    merged[key] =
      baseValue === undefined
        ? hoverValue
        : [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            hoverValue,
            baseValue,
          ];
  }
  return merged;
}

function getDocumentTheme() {
  if (typeof document === "undefined") return null;
  const root = document.documentElement;
  if (root.classList.contains("dark")) return "dark";
  if (root.classList.contains("light")) return "light";
  const dataTheme = root.dataset.theme;
  if (dataTheme === "dark" || dataTheme === "light") return dataTheme;
  return null;
}

function getSystemTheme() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function useResolvedTheme(themeProp) {
  const [detectedTheme, setDetectedTheme] = useState(
    () => getDocumentTheme() ?? getSystemTheme()
  );

  useEffect(() => {
    if (themeProp) return;

    const observer = new MutationObserver(() => {
      const docTheme = getDocumentTheme();
      if (docTheme) {
        setDetectedTheme(docTheme);
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = (e) => {
      if (!getDocumentTheme()) {
        setDetectedTheme(e.matches ? "dark" : "light");
      }
    };
    mediaQuery.addEventListener("change", handleSystemChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", handleSystemChange);
    };
  }, [themeProp]);

  return themeProp ?? detectedTheme;
}

const MapContext = createContext(null);

export function useMap() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error("useMap must be used within a Map component");
  }
  return context;
}

function DefaultLoader() {
  return (
    <div className="bg-background/50 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-xs">
      <div className="flex gap-1">
        <span className="bg-muted-foreground/60 size-1.5 animate-pulse rounded-full" />
        <span className="bg-muted-foreground/60 size-1.5 animate-pulse rounded-full [animation-delay:150ms]" />
        <span className="bg-muted-foreground/60 size-1.5 animate-pulse rounded-full [animation-delay:300ms]" />
      </div>
    </div>
  );
}

function getViewport(map) {
  const center = map.getCenter();
  return {
    center: [center.lng, center.lat],
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };
}

export const Map = forwardRef(function Map(
  {
    children,
    className,
    theme: themeProp,
    styles,
    blank = false,
    projection,
    viewport,
    onViewportChange,
    loading = false,
    ...props
  },
  ref
) {
  const containerRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const [pendingStyle, setPendingStyle] = useState(null);
  const currentStyleRef = useRef(null);
  const styleSwapInFlightRef = useRef(false);
  const internalUpdateRef = useRef(false);
  const resolvedTheme = useResolvedTheme(themeProp);

  const isControlled = viewport !== undefined && onViewportChange !== undefined;

  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;

  const stableStyles = useStableValue(styles);

  const mapStyles = useMemo(() => {
    if (stableStyles) {
      return {
        dark: stableStyles.dark ?? defaultStyles.dark,
        light: stableStyles.light ?? defaultStyles.light,
      };
    }
    if (blank) {
      return { dark: blankMapStyle, light: blankMapStyle };
    }
    return defaultStyles;
  }, [stableStyles, blank]);

  useImperativeHandle(ref, () => mapInstance, [mapInstance]);

  useEffect(() => {
    if (!containerRef.current) return;

    const initialStyle =
      resolvedTheme === "dark" ? mapStyles.dark : mapStyles.light;
    currentStyleRef.current = initialStyle;

    const map = new MapLibreGL.Map({
      container: containerRef.current,
      style: initialStyle,
      renderWorldCopies: false,
      attributionControl: {
        compact: true,
      },
      ...props,
      ...viewport,
    });

    const styleLoadHandler = () => {
      styleSwapInFlightRef.current = false;
      setIsStyleLoaded(true);
    };
    const loadHandler = () => setIsLoaded(true);

    const handleMove = () => {
      if (internalUpdateRef.current) return;
      onViewportChangeRef.current?.(getViewport(map));
    };

    map.on("load", loadHandler);
    map.on("style.load", styleLoadHandler);
    map.on("move", handleMove);
    setMapInstance(map);

    return () => {
      map.off("load", loadHandler);
      map.off("style.load", styleLoadHandler);
      map.off("move", handleMove);
      map.remove();
      setIsLoaded(false);
      setIsStyleLoaded(false);
      setMapInstance(null);
    };
  }, []);

  useEffect(() => {
    if (!mapInstance || !isControlled || !viewport) return;
    if (mapInstance.isMoving()) return;

    const current = getViewport(mapInstance);
    const next = {
      center: viewport.center ?? current.center,
      zoom: viewport.zoom ?? current.zoom,
      bearing: viewport.bearing ?? current.bearing,
      pitch: viewport.pitch ?? current.pitch,
    };

    if (
      next.center[0] === current.center[0] &&
      next.center[1] === current.center[1] &&
      next.zoom === current.zoom &&
      next.bearing === current.bearing &&
      next.pitch === current.pitch
    ) {
      return;
    }

    internalUpdateRef.current = true;
    mapInstance.jumpTo(next);
    internalUpdateRef.current = false;
  }, [mapInstance, isControlled, viewport]);

  useEffect(() => {
    if (!mapInstance || !resolvedTheme) return;

    const newStyle =
      resolvedTheme === "dark" ? mapStyles.dark : mapStyles.light;

    if (currentStyleRef.current === newStyle) return;

    currentStyleRef.current = newStyle;
    setIsStyleLoaded(false);
    setPendingStyle(newStyle);
  }, [mapInstance, resolvedTheme, mapStyles]);

  useEffect(() => {
    if (!mapInstance || !pendingStyle) return;

    setPendingStyle(null);
    styleSwapInFlightRef.current = true;
    mapInstance.setStyle(pendingStyle, { diff: false });
  }, [mapInstance, pendingStyle]);

  useEffect(() => {
    if (!mapInstance || !isStyleLoaded || !projection) return;
    if (styleSwapInFlightRef.current) return;
    mapInstance.setProjection(projection);
  }, [mapInstance, isStyleLoaded, projection]);

  const contextValue = useMemo(
    () => ({
      map: mapInstance,
      isLoaded: isLoaded && isStyleLoaded,
      resolvedTheme,
    }),
    [mapInstance, isLoaded, isStyleLoaded, resolvedTheme]
  );

  return (
    <MapContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        className={cn("relative h-full w-full overflow-hidden", className)}
      >
        {(!isLoaded || loading) && <DefaultLoader />}
        {mapInstance && children}
      </div>
    </MapContext.Provider>
  );
});

const MarkerContext = createContext(null);

function useMarkerContext() {
  const context = useContext(MarkerContext);
  if (!context) {
    throw new Error("Marker components must be used within MapMarker");
  }
  return context;
}

export function MapMarker({
  longitude,
  latitude,
  children,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onDragStart,
  onDrag,
  onDragEnd,
  draggable = false,
  offset,
  rotation,
  rotationAlignment,
  pitchAlignment,
  ...markerOptions
}) {
  const { map } = useMap();

  const callbacksRef = useRef({
    onClick,
    onMouseEnter,
    onMouseLeave,
    onDragStart,
    onDrag,
    onDragEnd,
  });
  callbacksRef.current = {
    onClick,
    onMouseEnter,
    onMouseLeave,
    onDragStart,
    onDrag,
    onDragEnd,
  };

  const marker = useMemo(() => {
    const markerInstance = new MapLibreGL.Marker({
      ...markerOptions,
      element: document.createElement("div"),
      draggable,
    }).setLngLat([longitude, latitude]);

    const handleClick = (e) => callbacksRef.current.onClick?.(e);
    const handleMouseEnter = (e) => callbacksRef.current.onMouseEnter?.(e);
    const handleMouseLeave = (e) => callbacksRef.current.onMouseLeave?.(e);

    markerInstance.getElement()?.addEventListener("click", handleClick);
    markerInstance.getElement()?.addEventListener("mouseenter", handleMouseEnter);
    markerInstance.getElement()?.addEventListener("mouseleave", handleMouseLeave);

    const handleDragStart = () => {
      const lngLat = markerInstance.getLngLat();
      callbacksRef.current.onDragStart?.({ lng: lngLat.lng, lat: lngLat.lat });
    };
    const handleDrag = () => {
      const lngLat = markerInstance.getLngLat();
      callbacksRef.current.onDrag?.({ lng: lngLat.lng, lat: lngLat.lat });
    };
    const handleDragEnd = () => {
      const lngLat = markerInstance.getLngLat();
      callbacksRef.current.onDragEnd?.({ lng: lngLat.lng, lat: lngLat.lat });
    };

    markerInstance.on("dragstart", handleDragStart);
    markerInstance.on("drag", handleDrag);
    markerInstance.on("dragend", handleDragEnd);

    return markerInstance;
  }, []);

  useEffect(() => {
    if (!map) return;
    marker.addTo(map);
    return () => {
      marker.remove();
    };
  }, [map, marker]);

  useEffect(() => {
    const current = marker.getLngLat();
    if (current.lng !== longitude || current.lat !== latitude) {
      marker.setLngLat([longitude, latitude]);
    }

    if (marker.isDraggable() !== draggable) {
      marker.setDraggable(draggable);
    }

    const currentOffset = marker.getOffset();
    const newOffset = offset ?? [0, 0];
    const [newOffsetX, newOffsetY] = Array.isArray(newOffset)
      ? newOffset
      : [newOffset.x, newOffset.y];
    if (currentOffset.x !== newOffsetX || currentOffset.y !== newOffsetY) {
      marker.setOffset(newOffset);
    }

    if (marker.getRotation() !== (rotation ?? 0)) {
      marker.setRotation(rotation ?? 0);
    }
    if (marker.getRotationAlignment() !== (rotationAlignment ?? "auto")) {
      marker.setRotationAlignment(rotationAlignment ?? "auto");
    }
    if (marker.getPitchAlignment() !== (pitchAlignment ?? "auto")) {
      marker.setPitchAlignment(pitchAlignment ?? "auto");
    }
  }, [marker, longitude, latitude, draggable, offset, rotation, rotationAlignment, pitchAlignment]);

  return (
    <MarkerContext.Provider value={{ marker, map }}>
      {children}
    </MarkerContext.Provider>
  );
}

export function MarkerContent({ children, className }) {
  const { marker } = useMarkerContext();

  return createPortal(
    <div className={cn("relative cursor-pointer", className)}>
      {children || <DefaultMarkerIcon />}
    </div>,
    marker.getElement()
  );
}

function DefaultMarkerIcon() {
  return (
    <div className="relative h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-lg" />
  );
}

function PopupCloseButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close popup"
      className="hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 absolute top-1 right-1 z-10 inline-flex size-5 cursor-pointer items-center justify-center rounded-sm transition-colors"
    >
      <X className="size-3.5" />
    </button>
  );
}

export function MarkerPopup({
  children,
  className,
  closeButton = false,
  offset,
  maxWidth,
  ...popupOptions
}) {
  const { marker, map } = useMarkerContext();
  const container = useMemo(() => document.createElement("div"), []);

  const popup = useMemo(() => {
    return new MapLibreGL.Popup({
      offset: 16,
      ...popupOptions,
      closeButton: false,
    })
      .setMaxWidth("none")
      .setDOMContent(container);
  }, []);

  useEffect(() => {
    if (!map) return;
    popup.setDOMContent(container);
    marker.setPopup(popup);
    return () => {
      marker.setPopup(null);
    };
  }, [map, popup, marker, container]);

  useEffect(() => {
    popup.setOffset(offset ?? 16);
    if (maxWidth) {
      popup.setMaxWidth(maxWidth);
    }
  }, [popup, offset, maxWidth]);

  const handleClose = () => popup.remove();

  return createPortal(
    <div
      className={cn(
        "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 relative max-w-xs rounded-lg border border-slate-200 dark:border-slate-800 p-3 shadow-lg",
        className
      )}
    >
      {closeButton && <PopupCloseButton onClick={handleClose} />}
      {children}
    </div>,
    container
  );
}

export function MarkerTooltip({
  children,
  className,
  offset,
  maxWidth,
  ...popupOptions
}) {
  const { marker, map } = useMarkerContext();
  const container = useMemo(() => document.createElement("div"), []);

  const tooltip = useMemo(() => {
    return new MapLibreGL.Popup({
      offset: 16,
      ...popupOptions,
      closeOnClick: true,
      closeButton: false,
    }).setMaxWidth("none");
  }, []);

  useEffect(() => {
    if (!map) return;
    tooltip.setDOMContent(container);

    const handleMouseEnter = () => {
      tooltip.setLngLat(marker.getLngLat()).addTo(map);
    };
    const handleMouseLeave = () => tooltip.remove();

    marker.getElement()?.addEventListener("mouseenter", handleMouseEnter);
    marker.getElement()?.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      marker.getElement()?.removeEventListener("mouseenter", handleMouseEnter);
      marker.getElement()?.removeEventListener("mouseleave", handleMouseLeave);
      tooltip.remove();
    };
  }, [map, marker, tooltip, container]);

  useEffect(() => {
    tooltip.setOffset(offset ?? 16);
    if (maxWidth) {
      tooltip.setMaxWidth(maxWidth);
    }
  }, [tooltip, offset, maxWidth]);

  return createPortal(
    <div
      className={cn(
        "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 pointer-events-none rounded-md px-2 py-1 text-xs shadow-md",
        className
      )}
    >
      {children}
    </div>,
    container
  );
}

export function MarkerLabel({ children, className, position = "top" }) {
  const positionClasses = {
    top: "bottom-full mb-1",
    bottom: "top-full mt-1",
  };

  return (
    <div
      className={cn(
        "absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-slate-800 dark:text-slate-200 text-[10px] font-medium pointer-events-none",
        positionClasses[position],
        className
      )}
    >
      {children}
    </div>
  );
}

const positionClasses = {
  "top-left": "top-2 left-2",
  "top-right": "top-2 right-2",
  "bottom-left": "bottom-2 left-2",
  "bottom-right": "bottom-10 right-2",
};

function ControlGroup({ children }) {
  return (
    <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden rounded-md shadow-sm [&>button:not(:last-child)]:border-b [&>button:not(:last-child)]:border-slate-200 dark:[&>button:not(:last-child)]:border-slate-800">
      {children}
    </div>
  );
}

function ControlButton({ onClick, label, children, disabled = false }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      type="button"
      className={cn(
        "flex size-8 items-center justify-center transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-50 text-slate-700 dark:text-slate-200 cursor-pointer"
      )}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function MapControls({
  position = "bottom-right",
  showZoom = true,
  showCompass = false,
  showLocate = false,
  showFullscreen = false,
  className,
  onLocate,
}) {
  const { map } = useMap();
  const [waitingForLocation, setWaitingForLocation] = useState(false);

  const handleZoomIn = useCallback(() => {
    map?.zoomTo(map.getZoom() + 1, { duration: 300 });
  }, [map]);

  const handleZoomOut = useCallback(() => {
    map?.zoomTo(map.getZoom() - 1, { duration: 300 });
  }, [map]);

  const handleResetBearing = useCallback(() => {
    map?.resetNorthPitch({ duration: 300 });
  }, [map]);

  const handleLocate = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    setWaitingForLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          longitude: pos.coords.longitude,
          latitude: pos.coords.latitude,
        };
        map?.flyTo({
          center: [coords.longitude, coords.latitude],
          zoom: 14,
          duration: 1500,
        });
        onLocate?.(coords);
        setWaitingForLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        setWaitingForLocation(false);
      },
      { timeout: 10000 }
    );
  }, [map, onLocate]);

  const handleFullscreen = useCallback(() => {
    const container = map?.getContainer();
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  }, [map]);

  return (
    <div className={cn("absolute z-10 flex flex-col gap-1.5", positionClasses[position], className)}>
      {showZoom && (
        <ControlGroup>
          <ControlButton onClick={handleZoomIn} label="Zoom in">
            <Plus className="size-4" />
          </ControlButton>
          <ControlButton onClick={handleZoomOut} label="Zoom out">
            <Minus className="size-4" />
          </ControlButton>
        </ControlGroup>
      )}
      {showCompass && (
        <ControlGroup>
          <CompassButton onClick={handleResetBearing} />
        </ControlGroup>
      )}
      {showLocate && (
        <ControlGroup>
          <ControlButton onClick={handleLocate} label="Find my location" disabled={waitingForLocation}>
            {waitingForLocation ? <Loader2 className="size-4 animate-spin" /> : <Locate className="size-4" />}
          </ControlButton>
        </ControlGroup>
      )}
      {showFullscreen && (
        <ControlGroup>
          <ControlButton onClick={handleFullscreen} label="Toggle fullscreen">
            <Maximize className="size-4" />
          </ControlButton>
        </ControlGroup>
      )}
    </div>
  );
}

function CompassButton({ onClick }) {
  const { map } = useMap();
  const compassRef = useRef(null);

  useEffect(() => {
    if (!map || !compassRef.current) return;
    const compass = compassRef.current;

    const updateRotation = () => {
      const bearing = map.getBearing();
      const pitch = map.getPitch();
      compass.style.transform = `rotateX(${pitch}deg) rotateZ(${-bearing}deg)`;
    };

    map.on("rotate", updateRotation);
    map.on("pitch", updateRotation);
    updateRotation();

    return () => {
      map.off("rotate", updateRotation);
      map.off("pitch", updateRotation);
    };
  }, [map]);

  return (
    <ControlButton onClick={onClick} label="Reset bearing to north">
      <svg ref={compassRef} viewBox="0 0 24 24" className="size-5" style={{ transformStyle: "preserve-3d" }}>
        <path d="M12 2L16 12H12V2Z" className="fill-red-500" />
        <path d="M12 2L8 12H12V2Z" className="fill-red-300" />
        <path d="M12 22L16 12H12V22Z" className="fill-slate-400" />
        <path d="M12 22L8 12H12V22Z" className="fill-slate-300" />
      </svg>
    </ControlButton>
  );
}

export function MapPopup({
  longitude,
  latitude,
  onClose,
  children,
  className,
  closeButton = false,
  offset,
  maxWidth,
  ...popupOptions
}) {
  const { map } = useMap();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const container = useMemo(() => document.createElement("div"), []);

  const popup = useMemo(() => {
    return new MapLibreGL.Popup({
      offset: 16,
      ...popupOptions,
      closeButton: false,
    })
      .setMaxWidth("none")
      .setLngLat([longitude, latitude]);
  }, []);

  useEffect(() => {
    if (!map) return;
    const onCloseProp = () => onCloseRef.current?.();
    popup.on("close", onCloseProp);
    popup.setDOMContent(container);
    popup.addTo(map);

    return () => {
      popup.off("close", onCloseProp);
      if (popup.isOpen()) {
        popup.remove();
      }
    };
  }, [map, popup, container]);

  useEffect(() => {
    const current = popup.getLngLat();
    if (!current || current.lng !== longitude || current.lat !== latitude) {
      popup.setLngLat([longitude, latitude]);
    }
    popup.setOffset(offset ?? 16);
    if (maxWidth) {
      popup.setMaxWidth(maxWidth);
    }
  }, [popup, longitude, latitude, offset, maxWidth]);

  const handleClose = () => {
    popup.remove();
  };

  return createPortal(
    <div
      className={cn(
        "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 relative max-w-xs rounded-lg border border-slate-200 dark:border-slate-800 p-3 shadow-lg",
        className
      )}
    >
      {closeButton && <PopupCloseButton onClick={handleClose} />}
      {children}
    </div>,
    container
  );
}

const EMPTY_ROUTE_MEASURE = { cumulative: [], total: 0 };
const EMPTY_COORDINATES = [];

function resolveBeforeId(map, beforeId) {
  return beforeId && map.getLayer(beforeId) ? beforeId : undefined;
}

function clampFraction(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function measureRoute(coordinates) {
  if (coordinates.length < 2) return EMPTY_ROUTE_MEASURE;

  const cumulative = [0];
  let total = 0;

  for (let i = 1; i < coordinates.length; i += 1) {
    const [lng1, lat1] = coordinates[i - 1];
    const [lng2, lat2] = coordinates[i];
    const midLat = ((lat1 + lat2) / 2) * (Math.PI / 180);
    total += Math.hypot((lng2 - lng1) * Math.cos(midLat), lat2 - lat1);
    cumulative.push(total);
  }

  return { cumulative, total };
}

function findSegmentIndex(cumulative, distance) {
  let low = 0;
  let high = cumulative.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (cumulative[mid] < distance) low = mid + 1;
    else high = mid;
  }

  return Math.min(low === 0 ? 0 : low - 1, cumulative.length - 2);
}

function pointAtFraction(coordinates, measure, fraction) {
  if (coordinates.length === 0) return null;
  if (coordinates.length === 1 || measure.total === 0) return coordinates[0];

  const target = measure.total * clampFraction(fraction);
  const index = findSegmentIndex(measure.cumulative, target);
  const [lng1, lat1] = coordinates[index];
  const [lng2, lat2] = coordinates[index + 1];
  const segment = measure.cumulative[index + 1] - measure.cumulative[index];
  const ratio = segment === 0 ? 0 : (target - measure.cumulative[index]) / segment;

  return [lng1 + (lng2 - lng1) * ratio, lat1 + (lat2 - lat1) * ratio];
}

function sliceAtFraction(coordinates, measure, fraction) {
  if (coordinates.length < 2) return [];

  const t = clampFraction(fraction);
  if (t <= 0 || measure.total === 0) return [];
  if (t >= 1) return coordinates;

  const target = measure.total * t;
  const index = findSegmentIndex(measure.cumulative, target);
  const point = pointAtFraction(coordinates, measure, t);
  const traveled = coordinates.slice(0, index + 1);
  if (point) traveled.push(point);

  return traveled;
}

const RouteContext = createContext(null);

export function useMapRoute() {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error("Route components must be used within MapRoute");
  }
  return context;
}

export function MapRoute({
  id: propId,
  coordinates: coordinatesProp = [],
  color = "#4285F4",
  width = 3,
  opacity = 0.8,
  dashArray,
  progress,
  active = false,
  activeColor,
  activeWidth,
  activeOpacity,
  activeDashArray,
  beforeId,
  onClick,
  onMouseEnter,
  onMouseLeave,
  interactive = true,
  children,
}) {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId ?? autoId;
  const sourceId = `route-source-${id}`;
  const layerId = `route-layer-${id}`;
  const [ready, setReady] = useState(false);

  const coordinates = coordinatesProp.length > 0 ? coordinatesProp : EMPTY_COORDINATES;

  const resolvedColor = active ? (activeColor ?? color) : color;
  const resolvedWidth = active ? (activeWidth ?? width) : width;
  const resolvedOpacity = active ? (activeOpacity ?? opacity) : opacity;
  const resolvedDashArray = active ? (activeDashArray ?? dashArray) : dashArray;

  const measure = useMemo(() => measureRoute(coordinates), [coordinates]);
  const traveled = useMemo(
    () => (progress === undefined ? [] : sliceAtFraction(coordinates, measure, progress)),
    [coordinates, measure, progress]
  );

  const pointAt = useCallback(
    (at) => {
      if (coordinates.length === 0) return null;
      if (at === "start") return coordinates[0];
      if (at === "end") return coordinates[coordinates.length - 1];
      if (at === "progress") {
        if (progress === undefined) return null;
        return pointAtFraction(coordinates, measure, progress);
      }
      return pointAtFraction(coordinates, measure, at);
    },
    [coordinates, measure, progress]
  );

  const childLayersRef = useRef([]);
  const registerLayer = useCallback((childLayerId) => {
    childLayersRef.current = [...childLayersRef.current, childLayerId];
    return () => {
      childLayersRef.current = childLayersRef.current.filter((entry) => entry !== childLayerId);
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !map) return;

    map.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [] },
      },
    });

    map.addLayer(
      {
        id: layerId,
        type: "line",
        source: sourceId,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": resolvedColor,
          "line-width": resolvedWidth,
          "line-opacity": resolvedOpacity,
          ...(resolvedDashArray && { "line-dasharray": resolvedDashArray }),
        },
      },
      resolveBeforeId(map, beforeId)
    );

    setReady(true);

    return () => {
      setReady(false);
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch (e) {}
    };
  }, [isLoaded, map]);

  useEffect(() => {
    if (!isLoaded || !map) return;
    const source = map.getSource(sourceId);
    if (source) {
      source.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: coordinates.length < 2 ? [] : coordinates,
        },
      });
    }
  }, [isLoaded, map, coordinates, sourceId]);

  useEffect(() => {
    if (!isLoaded || !map || !map.getLayer(layerId)) return;
    map.setPaintProperty(layerId, "line-color", resolvedColor);
    map.setPaintProperty(layerId, "line-width", resolvedWidth);
    map.setPaintProperty(layerId, "line-opacity", resolvedOpacity);
    map.setPaintProperty(layerId, "line-dasharray", resolvedDashArray);
  }, [isLoaded, map, layerId, resolvedColor, resolvedWidth, resolvedOpacity, resolvedDashArray]);

  const contextValue = useMemo(
    () => ({
      id,
      ready,
      coordinates,
      traveled,
      progress,
      color: resolvedColor,
      width: resolvedWidth,
      opacity: resolvedOpacity,
      dashArray: resolvedDashArray,
      beforeId,
      pointAt,
      registerLayer,
    }),
    [id, ready, coordinates, traveled, progress, resolvedColor, resolvedWidth, resolvedOpacity, resolvedDashArray, beforeId, pointAt, registerLayer]
  );

  return (
    <RouteContext.Provider value={contextValue}>
      {children}
    </RouteContext.Provider>
  );
}

export function RouteProgress({ color, width, opacity, dashArray }) {
  const { map, isLoaded } = useMap();
  const route = useMapRoute();
  const { ready, traveled, registerLayer, beforeId } = route;

  const sourceId = `route-progress-source-${route.id}`;
  const layerId = `route-progress-layer-${route.id}`;

  const resolvedColor = color ?? route.color;
  const resolvedWidth = width ?? route.width;
  const resolvedOpacity = opacity ?? route.opacity;

  useEffect(() => {
    if (!ready || !map) return;

    map.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [] },
      },
    });

    map.addLayer(
      {
        id: layerId,
        type: "line",
        source: sourceId,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": resolvedColor,
          "line-width": resolvedWidth,
          "line-opacity": resolvedOpacity,
          ...(dashArray && { "line-dasharray": dashArray }),
        },
      },
      resolveBeforeId(map, beforeId)
    );

    const unregister = registerLayer(layerId);

    return () => {
      unregister();
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch (e) {}
    };
  }, [ready, map]);

  useEffect(() => {
    if (!ready || !map) return;
    const source = map.getSource(sourceId);
    if (source) {
      source.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: traveled.length < 2 ? [] : traveled,
        },
      });
    }
  }, [ready, map, traveled, sourceId]);

  useEffect(() => {
    if (!isLoaded || !map || !map.getLayer(layerId)) return;
    map.setPaintProperty(layerId, "line-color", resolvedColor);
    map.setPaintProperty(layerId, "line-width", resolvedWidth);
    map.setPaintProperty(layerId, "line-opacity", resolvedOpacity);
    map.setPaintProperty(layerId, "line-dasharray", dashArray);
  }, [isLoaded, map, layerId, resolvedColor, resolvedWidth, resolvedOpacity, dashArray]);

  return null;
}

export function RouteMarker({ at, children, ...markerProps }) {
  const { pointAt } = useMapRoute();
  const position = pointAt(at);

  if (!position) return null;

  return (
    <MapMarker longitude={position[0]} latitude={position[1]} {...markerProps}>
      {children}
    </MapMarker>
  );
}

const DEFAULT_ARC_CURVATURE = 0.2;
const DEFAULT_ARC_SAMPLES = 64;
const DEFAULT_ARC_PAINT = {
  "line-color": "#4285F4",
  "line-width": 2,
  "line-opacity": 0.85,
};
const DEFAULT_ARC_LAYOUT = {
  "line-join": "round",
  "line-cap": "round",
};

function buildArcCoordinates(from, to, curvature, samples) {
  const [x0, y0] = from;
  const [xTo, y2] = to;
  const rawDx = xTo - x0;
  const x2 = rawDx > 180 ? xTo - 360 : rawDx < -180 ? xTo + 360 : xTo;
  const dx = x2 - x0;
  const dy = y2 - y0;
  const distance = Math.hypot(dx, dy);

  if (distance === 0 || curvature === 0) return [from, [x2, y2]];

  const mx = (x0 + x2) / 2;
  const my = (y0 + y2) / 2;
  const nx = -dy / distance;
  const ny = dx / distance;
  const offset = distance * curvature;
  const cx = mx + nx * offset;
  const cy = my + ny * offset;

  const points = [];
  const segments = Math.max(2, Math.floor(samples));
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const inv = 1 - t;
    const x = inv * inv * x0 + 2 * inv * t * cx + t * t * x2;
    const y = inv * inv * y0 + 2 * inv * t * cy + t * t * y2;
    points.push([x, y]);
  }
  return points;
}

export function MapArc({
  data = [],
  id: propId,
  curvature = DEFAULT_ARC_CURVATURE,
  samples = DEFAULT_ARC_SAMPLES,
  paint,
  layout,
  hoverPaint,
  onClick,
  onHover,
  interactive = true,
  beforeId,
}) {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId ?? autoId;
  const sourceId = `arc-source-${id}`;
  const layerId = `arc-layer-${id}`;
  const hitLayerId = `arc-hit-layer-${id}`;

  const mergedPaint = useMemo(
    () => mergeHoverPaint({ ...DEFAULT_ARC_PAINT, ...paint }, hoverPaint),
    [paint, hoverPaint]
  );
  const mergedLayout = useMemo(
    () => ({ ...DEFAULT_ARC_LAYOUT, ...layout }),
    [layout]
  );

  const hitWidth = useMemo(() => {
    const w = paint?.["line-width"] ?? DEFAULT_ARC_PAINT["line-width"];
    const base = typeof w === "number" ? w : 12;
    return Math.max(base + 6, 12);
  }, [paint]);

  const geoJSON = useMemo(
    () => ({
      type: "FeatureCollection",
      features: data.map((arc) => {
        const { from, to, ...properties } = arc;
        return {
          type: "Feature",
          properties,
          geometry: {
            type: "LineString",
            coordinates: buildArcCoordinates(from, to, curvature, samples),
          },
        };
      }),
    }),
    [data, curvature, samples]
  );

  useEffect(() => {
    if (!isLoaded || !map) return;

    map.addSource(sourceId, {
      type: "geojson",
      data: geoJSON,
      promoteId: "id",
    });

    map.addLayer(
      {
        id: hitLayerId,
        type: "line",
        source: sourceId,
        layout: DEFAULT_ARC_LAYOUT,
        paint: {
          "line-color": "rgba(0, 0, 0, 0)",
          "line-width": hitWidth,
          "line-opacity": 1,
        },
      },
      beforeId
    );

    map.addLayer(
      {
        id: layerId,
        type: "line",
        source: sourceId,
        layout: mergedLayout,
        paint: mergedPaint,
      },
      beforeId
    );

    return () => {
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getLayer(hitLayerId)) map.removeLayer(hitLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch (e) {}
    };
  }, [isLoaded, map]);

  useEffect(() => {
    if (!isLoaded || !map) return;
    const source = map.getSource(sourceId);
    source?.setData(geoJSON);
  }, [isLoaded, map, geoJSON, sourceId]);

  useEffect(() => {
    if (!isLoaded || !map || !map.getLayer(layerId)) return;
    for (const [key, value] of Object.entries(mergedPaint)) {
      map.setPaintProperty(layerId, key, value);
    }
    for (const [key, value] of Object.entries(mergedLayout)) {
      map.setLayoutProperty(layerId, key, value);
    }
    if (map.getLayer(hitLayerId)) {
      map.setPaintProperty(hitLayerId, "line-width", hitWidth);
    }
  }, [isLoaded, map, layerId, hitLayerId, mergedPaint, mergedLayout, hitWidth]);

  return null;
}
