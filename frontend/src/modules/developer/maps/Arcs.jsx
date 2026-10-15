import { useState } from "react";
import {
  Map,
  MapArc,
  MapMarker,
  MarkerContent,
  MarkerLabel,
  MapControls,
} from "@/components/ui/map";
import { Globe, Plane } from "lucide-react";

const hub = { name: "London", lng: -0.1276, lat: 51.5074 };

const destinations = [
  { name: "New York", lng: -74.006, lat: 40.7128 },
  { name: "São Paulo", lng: -46.6333, lat: -23.5505 },
  { name: "Cape Town", lng: 18.4241, lat: -33.9249 },
  { name: "Dubai", lng: 55.2708, lat: 25.2048 },
  { name: "Mumbai", lng: 72.8777, lat: 19.076 },
  { name: "Singapore", lng: 103.8198, lat: 1.3521 },
  { name: "Tokyo", lng: 139.6917, lat: 35.6895 },
  { name: "Sydney", lng: 151.2093, lat: -33.8688 },
];

const arcs = destinations.map((dest) => ({
  id: dest.name,
  from: [hub.lng, hub.lat],
  to: [dest.lng, dest.lat],
}));

export function ArcExample() {
  const [selectedDest, setSelectedDest] = useState(null);
  const [isGlobe, setIsGlobe] = useState(true);

  return (
    <div className="relative h-[460px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md bg-slate-950">
      <Map
        center={[hub.lng, hub.lat]}
        zoom={1.5}
        projection={isGlobe ? { type: "globe" } : undefined}
      >
        <MapControls position="top-right" showZoom showCompass showFullscreen />

        <MapArc
          data={arcs}
          paint={{
            "line-color": "#38bdf8",
            "line-width": 2.5,
            "line-opacity": 0.85,
            "line-dasharray": [2, 2],
          }}
          hoverPaint={{
            "line-color": "#f59e0b",
            "line-width": 4,
            "line-opacity": 1,
          }}
          interactive={true}
          onHover={(e) => {
            setSelectedDest(e ? e.arc.id : null);
          }}
        />

        {/* London Hub Marker */}
        <MapMarker longitude={hub.lng} latitude={hub.lat}>
          <MarkerContent>
            <div className="size-4 rounded-full border-2 border-white bg-blue-500 shadow-xl ring-4 ring-blue-500/30 animate-pulse" />
          </MarkerContent>
          <MarkerLabel
            position="top"
            className="bg-slate-900/90 text-blue-400 border border-blue-500/30 rounded-md px-2 py-0.5 text-[11px] font-bold backdrop-blur"
          >
            {hub.name} (Hub)
          </MarkerLabel>
        </MapMarker>

        {/* Destination Markers */}
        {destinations.map((dest) => {
          const isSelected = selectedDest === dest.name;
          return (
            <MapMarker key={dest.name} longitude={dest.lng} latitude={dest.lat}>
              <MarkerContent>
                <div
                  className={`size-3 rounded-full border-2 border-white transition-all shadow-md ${
                    isSelected ? "bg-amber-400 scale-125 ring-4 ring-amber-400/40" : "bg-cyan-400"
                  }`}
                />
              </MarkerContent>
              <MarkerLabel
                position="top"
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold backdrop-blur transition-all ${
                  isSelected
                    ? "bg-amber-500 text-slate-950 font-bold scale-110 shadow-lg"
                    : "bg-slate-900/80 text-white"
                }`}
              >
                {dest.name}
              </MarkerLabel>
            </MapMarker>
          );
        })}
      </Map>

      {/* Projection switcher and active route display */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
        <button
          onClick={() => setIsGlobe(!isGlobe)}
          className="flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Globe className="size-3.5 text-blue-500" />
          <span>{isGlobe ? "3D Globe View" : "Flat Mercator View"}</span>
        </button>

        {selectedDest && (
          <div className="bg-slate-900/95 border border-amber-500/40 text-amber-300 rounded-xl px-3 py-1.5 shadow-lg backdrop-blur text-xs flex items-center gap-2">
            <Plane className="size-3.5 text-amber-400 animate-pulse" />
            <span>Route: <strong>{hub.name}</strong> → <strong>{selectedDest}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ArcExample;
