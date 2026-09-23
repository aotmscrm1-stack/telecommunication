import { useState } from "react";
import { Map, MapControls } from "@/components/ui/map";

export function MapControlsExample() {
  const [position, setPosition] = useState("top-right");

  return (
    <div className="relative h-[460px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md bg-slate-900">
      <Map center={[2.3522, 48.8566]} zoom={11}>
        <MapControls
          position={position}
          showZoom
          showCompass
          showLocate
          showFullscreen
        />
      </Map>

      {/* Floating control position switcher */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 p-2 shadow-lg backdrop-blur-md flex items-center gap-2 text-xs">
        <span className="text-slate-500 font-medium pl-1">Controls Position:</span>
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className="bg-slate-100 dark:bg-slate-800 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="top-right">Top Right</option>
          <option value="top-left">Top Left</option>
          <option value="bottom-right">Bottom Right</option>
          <option value="bottom-left">Bottom Left</option>
        </select>
      </div>
    </div>
  );
}

export default MapControlsExample;
