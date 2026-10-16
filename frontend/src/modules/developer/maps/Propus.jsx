import { useState } from "react";
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MarkerTooltip,
  MarkerLabel,
  MapPopup,
  MapControls,
} from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Compass } from "lucide-react";

export function DraggableMarkerExample() {
  const [draggableMarker, setDraggableMarker] = useState({
    lng: -73.98,
    lat: 40.75,
  });
  const [showStandalonePopup, setShowStandalonePopup] = useState(true);

  return (
    <div className="relative h-[460px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md bg-slate-900">
      <Map center={[-73.99, 40.735]} zoom={12.5}>
        <MapControls position="top-right" showZoom showCompass showFullscreen />

        {/* 1. Draggable Marker with MarkerPopup & MarkerTooltip */}
        <MapMarker
          draggable
          longitude={draggableMarker.lng}
          latitude={draggableMarker.lat}
          onDrag={(lngLat) => {
            setDraggableMarker({ lng: lngLat.lng, lat: lngLat.lat });
          }}
        >
          <MarkerContent>
            <div className="cursor-grab active:cursor-grabbing p-1 bg-blue-600 rounded-full shadow-lg border-2 border-white hover:scale-110 transition-transform">
              <MapPin className="text-white size-5 fill-white" />
            </div>
          </MarkerContent>
          <MarkerLabel position="bottom" className="bg-slate-900/80 text-white px-2 py-0.5 rounded-full text-[10px]">
            Drag Me!
          </MarkerLabel>
          <MarkerTooltip>
            Click or drag marker
          </MarkerTooltip>
          <MarkerPopup closeButton>
            <div className="space-y-1.5 p-1">
              <div className="flex items-center gap-1.5 font-bold text-sm text-blue-600 dark:text-blue-400">
                <Navigation className="size-4" />
                <span>Draggable Position</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                Latitude: <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{draggableMarker.lat.toFixed(4)}</span>
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                Longitude: <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{draggableMarker.lng.toFixed(4)}</span>
              </p>
            </div>
          </MarkerPopup>
        </MapMarker>

        {/* 2. Standalone City MapPopup */}
        {showStandalonePopup && (
          <MapPopup
            longitude={-74.006}
            latitude={40.7128}
            onClose={() => setShowStandalonePopup(false)}
            closeButton
            focusAfterOpen={false}
            closeOnClick={false}
          >
            <div className="space-y-2 p-1">
              <div className="flex items-center gap-1.5">
                <Compass className="size-4 text-emerald-500" />
                <h3 className="text-slate-900 dark:text-slate-100 font-bold text-sm">New York City</h3>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                The city that never sleeps. Population: 8.3 million. High-density urban mapping.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs h-7 mt-1 border-slate-300 dark:border-slate-700"
                onClick={() => setShowStandalonePopup(false)}
              >
                Close Popup
              </Button>
            </div>
          </MapPopup>
        )}
      </Map>

      {/* Floating control to re-open standalone popup */}
      {!showStandalonePopup && (
        <Button
          size="sm"
          className="absolute bottom-3 left-3 z-10 bg-slate-900/90 text-white hover:bg-slate-800 text-xs shadow-md backdrop-blur border border-slate-700"
          onClick={() => setShowStandalonePopup(true)}
        >
          Show NYC Popup
        </Button>
      )}

      {/* Live coordinates tracker card */}
      <div className="absolute top-3 left-3 z-10 bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 shadow-lg backdrop-blur text-xs">
        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-0.5">
          <span className="size-2 rounded-full bg-blue-500 animate-ping" />
          Active Marker Coordinates:
        </div>
        <div className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">
          Lat: {draggableMarker.lat.toFixed(5)}, Lng: {draggableMarker.lng.toFixed(5)}
        </div>
      </div>
    </div>
  );
}

export default DraggableMarkerExample;
