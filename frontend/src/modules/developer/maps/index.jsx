import { useState } from "react";
import CustomStyleExample from "./Map";
import MapControlsExample from "./controls";
import DraggableMarkerExample from "./Propus";
import LiveAttendanceMarkerExample from "./Marker";
import RouteProgressExample from "./Route";
import ArcExample from "./Arcs";
import AdvancedUsageExample from "./Advanced";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Compass,
  MapPin,
  Route as RouteIcon,
  Globe,
  Sliders,
  Layers,
  Sparkles,
  Maximize2,
  Radio,
} from "lucide-react";

const MODULES = [
  {
    id: "attendance-marker",
    title: "Attendance Marker",
    subtitle: "Marker.jsx",
    icon: Radio,
    description: "Start Attendance click with immediate live location status (Online, Offline, Move, Stopped) and Orange & Blue Draggable Marker.",
    component: LiveAttendanceMarkerExample,
  },
  {
    id: "3d",
    title: "3D & Styles",
    subtitle: "Map.jsx",
    icon: Layers,
    description: "Switch between Default Carto, OpenStreetMap, and OpenStreetMap 3D with pitch tilt animation.",
    component: CustomStyleExample,
  },
  {
    id: "controls",
    title: "Map Controls",
    subtitle: "controls.jsx",
    icon: Compass,
    description: "Integrated map controls: zoom, 3D compass orientation, geolocate, and fullscreen.",
    component: MapControlsExample,
  },
  {
    id: "markers",
    title: "Markers & Popups",
    subtitle: "Propus.jsx",
    icon: MapPin,
    description: "Draggable markers with live coordinate feedback, tooltips, and standalone interactive popups.",
    component: DraggableMarkerExample,
  },
  {
    id: "route",
    title: "Route & Progress",
    subtitle: "Route.jsx",
    icon: RouteIcon,
    description: "Multi-segment route plotting with animated vehicle tracker, progress slider, and endpoints.",
    component: RouteProgressExample,
  },
  {
    id: "arcs",
    title: "Globe & Arcs",
    subtitle: "Arcs.jsx",
    icon: Globe,
    description: "3D Globe projection with curved great-circle flight arcs, interactive hover states, and hub routes.",
    component: ArcExample,
  },
  {
    id: "advanced",
    title: "Advanced useMap",
    subtitle: "Advanced.jsx",
    icon: Sliders,
    description: "Low-level MapLibre control via useMap hook, live pitch/bearing telemetry, and camera presets.",
    component: AdvancedUsageExample,
  },
];

export function MapsDashboard() {
  const [activeTab, setActiveTab] = useState("3d");

  const currentModule = MODULES.find((m) => m.id === activeTab) || MODULES[0];
  const ActiveComponent = currentModule.component;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 border border-blue-500/20 p-6 sm:p-8 shadow-2xl text-white">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-400/30 px-3 py-1 text-xs font-semibold text-blue-300 backdrop-blur-md">
            <Sparkles className="size-3.5 text-blue-400" />
            <span>MapLibre GL & mapcn Engine</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Next-Gen Interactive Maps
          </h1>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
            High-performance vector tiles, zero-dependency OpenStreetMap & Carto styles, 3D building extrusions, globe projection, and route simulation.
          </p>
        </div>

        {/* Decorative background blurs */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 size-72 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-10 size-48 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />
      </div>

      {/* Module Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          const isActive = activeTab === mod.id;
          return (
            <button
              key={mod.id}
              onClick={() => setActiveTab(mod.id)}
              className={`flex flex-col items-start gap-1 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/25 scale-[1.02]"
                  : "bg-white dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <Icon className={`size-4.5 ${isActive ? "text-white" : "text-blue-500"}`} />
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isActive ? "bg-blue-700 text-blue-100" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                  {mod.subtitle}
                </span>
              </div>
              <span className="font-bold text-xs mt-1">{mod.title}</span>
            </button>
          );
        })}
      </div>

      {/* Active Module Container */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-950">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <span>{currentModule.title}</span>
                <span className="text-xs font-mono font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  {currentModule.subtitle}
                </span>
              </CardTitle>
              <CardDescription className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {currentModule.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <ActiveComponent />
        </CardContent>
      </Card>
    </div>
  );
}

export default MapsDashboard;
