import { useState, useEffect, useRef } from "react";
import { Map, MapControls } from "@/components/ui/map";

const styles = {
  default: undefined,
  openstreetmap: "https://tiles.openfreemap.org/styles/bright",
  openstreetmap3d: "https://tiles.openfreemap.org/styles/liberty",
};

export function CustomStyleExample() {
  const mapRef = useRef(null);
  const [style, setStyle] = useState("openstreetmap3d");
  const selectedStyle = styles[style];
  const is3D = style === "openstreetmap3d";

  useEffect(() => {
    mapRef.current?.easeTo({ pitch: is3D ? 60 : 0, duration: 600 });
  }, [is3D]);

  return (
    <div className="relative h-[460px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md bg-slate-900">
      <Map
        ref={mapRef}
        center={[-0.1276, 51.5074]}
        zoom={15}
        pitch={is3D ? 60 : 0}
        styles={
          selectedStyle
            ? { light: selectedStyle, dark: selectedStyle }
            : undefined
        }
      >
        <MapControls position="top-left" showZoom showCompass showFullscreen />
      </Map>

      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <div className="bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 p-1.5 shadow-lg backdrop-blur-md flex items-center gap-2 text-xs font-medium">
          <span className="text-slate-500 dark:text-slate-400 pl-2">Style:</span>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg border-0 px-2.5 py-1 text-xs font-semibold shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="default">Default (Carto)</option>
            <option value="openstreetmap">OpenStreetMap</option>
            <option value="openstreetmap3d">OpenStreetMap 3D</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default CustomStyleExample;
