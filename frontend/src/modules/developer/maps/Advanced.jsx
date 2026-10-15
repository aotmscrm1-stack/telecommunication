import { useEffect, useState } from "react";
import { Map, useMap, MapControls } from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { RotateCcw, Mountain, Compass, Eye, MapPin } from "lucide-react";

function MapController() {
  const { map, isLoaded } = useMap();
  const [pitch, setPitch] = useState(0);
  const [bearing, setBearing] = useState(0);
  const [zoom, setZoom] = useState(15);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const handleMove = () => {
      setPitch(Math.round(map.getPitch()));
      setBearing(Math.round(map.getBearing()));
      setZoom(Number(map.getZoom().toFixed(2)));
    };

    map.on("move", handleMove);
    return () => {
      map.off("move", handleMove);
    };
  }, [map, isLoaded]);

  const handle3DView = () => {
    map?.easeTo({
      pitch: 60,
      bearing: -25,
      zoom: 16.5,
      duration: 1200,
    });
  };

  const handleBirdsEye = () => {
    map?.easeTo({
      pitch: 0,
      bearing: 0,
      zoom: 15,
      duration: 1000,
    });
  };

  const handleFlyover = () => {
    map?.flyTo({
      center: [-73.9857, 40.7484],
      zoom: 17,
      pitch: 70,
      bearing: 45,
      duration: 2000,
    });
  };

  if (!isLoaded) return null;

  return (
    <div className="absolute top-3 left-3 z-10 flex flex-col gap-2.5 max-w-xs">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={handle3DView}
          className="bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-md backdrop-blur border border-slate-200 dark:border-slate-700 text-xs font-semibold"
        >
          <Mountain className="mr-1.5 size-3.5 text-blue-500" />
          3D Angle
        </Button>

        <Button
          size="sm"
          variant="secondary"
          onClick={handleFlyover}
          className="bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-md backdrop-blur border border-slate-200 dark:border-slate-700 text-xs font-semibold"
        >
          <Eye className="mr-1.5 size-3.5 text-emerald-500" />
          Flyover
        </Button>

        <Button
          size="sm"
          variant="secondary"
          onClick={handleBirdsEye}
          className="bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-md backdrop-blur border border-slate-200 dark:border-slate-700 text-xs font-semibold"
        >
          <RotateCcw className="mr-1.5 size-3.5 text-slate-400" />
          Reset
        </Button>
      </div>

      <div className="bg-white/95 dark:bg-slate-900/95 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 shadow-lg backdrop-blur text-xs space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Camera Pitch:</span>
          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{pitch}°</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Bearing (Heading):</span>
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{bearing}°</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Zoom Level:</span>
          <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{zoom}</span>
        </div>
      </div>
    </div>
  );
}

export function AdvancedUsageExample() {
  return (
    <div className="relative h-[460px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md bg-slate-900">
      <Map
        center={[-73.9857, 40.7484]}
        zoom={15}
        styles={{
          light: "https://tiles.openfreemap.org/styles/liberty",
          dark: "https://tiles.openfreemap.org/styles/liberty",
        }}
      >
        <MapControls position="top-right" showZoom showCompass showLocate showFullscreen />
        <MapController />
      </Map>
    </div>
  );
}

export default AdvancedUsageExample;
