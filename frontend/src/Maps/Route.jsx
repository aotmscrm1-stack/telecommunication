import { useState, useEffect, useRef } from "react";
import {
  Map,
  MapRoute,
  MarkerContent,
  MarkerLabel,
  RouteMarker,
  RouteProgress,
  MapControls,
} from "@/components/ui/map";
import { Car, Play, Pause, RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

const routeCoordinates = [
  [-122.394, 37.7953],
  [-122.3952, 37.7967],
  [-122.397, 37.7986],
  [-122.3975, 37.7992],
  [-122.3976, 37.7993],
  [-122.3981, 37.799],
  [-122.3984, 37.7989],
  [-122.4066, 37.7979],
  [-122.4071, 37.7981],
  [-122.4072, 37.7982],
  [-122.4072, 37.7984],
  [-122.4082, 37.8034],
  [-122.4064, 37.8037],
  [-122.4063, 37.8036],
  [-122.4063, 37.8034],
  [-122.4067, 37.8032],
  [-122.4067, 37.803],
  [-122.4067, 37.8028],
  [-122.4064, 37.8025],
  [-122.4062, 37.802],
  [-122.406, 37.8019],
  [-122.4058, 37.8018],
  [-122.4056, 37.8018],
  [-122.4055, 37.8019],
  [-122.4054, 37.8021],
  [-122.4056, 37.8025],
];

export function RouteProgressExample() {
  const [progress, setProgress] = useState(0.45);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 1) {
            setIsPlaying(false);
            return 1;
          }
          return Math.min(1, prev + 0.01);
        });
      }, 50);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  return (
    <div className="relative h-[460px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md bg-slate-900">
      <Map center={[-122.4008, 37.7996]} zoom={14.2}>
        <MapControls position="top-right" showZoom showCompass showFullscreen />

        <MapRoute
          coordinates={routeCoordinates}
          progress={progress}
          color="#94a3b8"
          width={5}
          opacity={0.7}
          dashArray={[0.5, 1.5]}
        >
          <RouteProgress color="#3b82f6" width={5} opacity={1} />

          {/* Start marker */}
          <RouteMarker at="start">
            <MarkerContent>
              <div className="size-4 rounded-full border-2 border-slate-900 bg-emerald-400 shadow-lg ring-2 ring-emerald-500/50" />
            </MarkerContent>
            <MarkerLabel position="bottom" className="bg-slate-900/90 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
              START
            </MarkerLabel>
          </RouteMarker>

          {/* Dynamic Car Marker along progress */}
          <RouteMarker at="progress">
            <MarkerContent>
              <div className="grid size-7 place-items-center rounded-full bg-blue-600 shadow-xl ring-2 ring-white border border-blue-400 hover:scale-110 transition-transform">
                <Car className="size-3.5 text-white" />
              </div>
            </MarkerContent>
            <MarkerLabel
              position="top"
              className="bg-slate-900/90 text-blue-400 border border-blue-500/40 rounded-md px-2 py-0.5 font-mono text-[11px] font-bold shadow-md"
            >
              {Math.round(progress * 100)}%
            </MarkerLabel>
          </RouteMarker>

          {/* End marker */}
          <RouteMarker at="end">
            <MarkerContent>
              <div className="size-4 rounded-full border-2 border-slate-900 bg-red-500 shadow-lg ring-2 ring-red-500/50" />
            </MarkerContent>
            <MarkerLabel position="bottom" className="bg-slate-900/90 text-red-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
              DESTINATION
            </MarkerLabel>
          </RouteMarker>
        </MapRoute>
      </Map>

      {/* Control panel for route progress simulation */}
      <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 absolute bottom-3 left-3 w-64 rounded-xl p-3 shadow-xl backdrop-blur-md z-10 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-800 dark:text-slate-200">Trip Simulation</span>
          <span className="font-mono text-blue-600 dark:text-blue-400 font-bold tabular-nums">
            {Math.round(progress * 100)}%
          </span>
        </div>

        <Slider
          value={[progress]}
          onValueChange={([val]) => {
            setProgress(val);
            if (isPlaying) setIsPlaying(false);
          }}
          min={0}
          max={1}
          step={0.01}
          aria-label="Route progress"
        />

        <div className="flex items-center justify-between pt-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-2.5 gap-1 border-slate-300 dark:border-slate-700"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? (
              <>
                <Pause className="size-3 text-amber-500 fill-amber-500" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="size-3 text-emerald-500 fill-emerald-500" />
                <span>Animate</span>
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs px-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            onClick={() => {
              setIsPlaying(false);
              setProgress(0);
            }}
          >
            <RotateCcw className="size-3 mr-1" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

export default RouteProgressExample;
