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
import { Play, Pause, RotateCcw, Building2, User, Navigation2, CheckCircle2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

// Real-world route between AOTMS Office HQ (Pothuri Towers) and Field Agent (Benz Circle corridor)
const officeToEmployeeRoute = [
  [80.6480, 16.5062], // 1. Office HQ - Pothuri Towers
  [80.6486, 16.5058],
  [80.6495, 16.5049],
  [80.6508, 16.5037],
  [80.6515, 16.5029],
  [80.6521, 16.5020],
  [80.6528, 16.5012],
  [80.6534, 16.5002],
  [80.6540, 16.4990],
  [80.6545, 16.4975], // 10. Employee Destination - Benz Circle
];

export function RouteProgressExample() {
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [attendanceStarted, setAttendanceStarted] = useState(false);
  const [cameraFocus, setCameraFocus] = useState("route"); // 'office', 'employee', 'route'
  const timerRef = useRef(null);

  // Playback timer for animated route progress
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 1) {
            setIsPlaying(false);
            return 1;
          }
          return Math.min(1, prev + 0.012);
        });
      }, 50);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  // Handle "Start Attendance" action
  const handleStartAttendance = () => {
    setAttendanceStarted(true);
    setProgress(0);
    setIsPlaying(true);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setProgress(0);
    setAttendanceStarted(false);
  };

  const centerCoords =
    cameraFocus === "office"
      ? [80.6480, 16.5062]
      : cameraFocus === "employee"
      ? [80.6545, 16.4975]
      : [80.6512, 16.5018];

  const centerZoom = cameraFocus === "route" ? 14.2 : 16.0;

  return (
    <div className="w-full space-y-4 font-sans select-none">
      {/* ── TOP ACTION BAR: Start Attendance & Route Camera Shift ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        {/* Left: Start Attendance & Route Controls */}
        <div className="flex items-center gap-2.5">
          <Button
            onClick={handleStartAttendance}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-sm ${
              attendanceStarted
                ? "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 text-white shadow-orange-500/20"
                : "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 text-white shadow-blue-500/20"
            }`}
          >
            <Play className="size-3.5 fill-white" />
            <span>{attendanceStarted ? "Replay Route" : "Start Attendance Route"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 text-xs text-slate-700 border-slate-200 hover:bg-slate-50 rounded-xl"
          >
            {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            <span>{isPlaying ? "Pause" : "Play"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="p-2 text-slate-500 hover:text-slate-800 border-slate-200 rounded-xl"
            title="Reset Route"
          >
            <RotateCcw className="size-3.5" />
          </Button>
        </div>

        {/* Center: Shift Camera (Office to Employee / Employee to Office) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            onClick={() => setCameraFocus("office")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              cameraFocus === "office"
                ? "bg-white text-sky-700 shadow-xs border border-sky-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 className="size-3.5 text-sky-600" />
            <span>Office HQ</span>
          </button>

          <button
            onClick={() => setCameraFocus("route")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              cameraFocus === "route"
                ? "bg-white text-slate-800 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Full Route</span>
          </button>

          <button
            onClick={() => setCameraFocus("employee")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              cameraFocus === "employee"
                ? "bg-white text-orange-600 shadow-xs border border-orange-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <User className="size-3.5 text-orange-600" />
            <span>Employee</span>
          </button>
        </div>

        {/* Right: Progress Slider & Distance Metric */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-36">
            <Slider
              value={[progress]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={(val) => setProgress(val[0])}
            />
          </div>
          <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
            {Math.round(progress * 100)}%
          </span>
        </div>
      </div>

      {/* ── MAP CONTAINER WITH CLEAN MAP ICON PINS (No Blurry Waves) ── */}
      <div className="relative h-[480px] w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
        <Map center={centerCoords} zoom={centerZoom} style="https://tiles.openfreemap.org/styles/bright">
          <MapControls position="top-right" showZoom showCompass />

          {/* Office to Employee Animated Route */}
          <MapRoute
            coordinates={officeToEmployeeRoute}
            progress={progress}
            color="#cbd5e1"
            width={6}
            opacity={0.8}
            dashArray={[1, 1.5]}
          >
            {/* Active Neon Route Progress Line */}
            <RouteProgress color="#0284c7" width={6} opacity={0.95} />

            {/* ── 1. START POINT: Office HQ (Map Icon Style Pin - Cool Blue) ── */}
            <RouteMarker at="start">
              <MarkerContent>
                <div className="relative flex flex-col items-center group cursor-pointer select-none">
                  {/* Map Pin Teardrop Body */}
                  <div className="relative size-10 rounded-full bg-sky-600 border-2 border-white shadow-lg flex items-center justify-center transition-transform group-hover:scale-110">
                    <Building2 className="size-5 text-white stroke-[2.2]" />
                  </div>
                  {/* Pin Point Tip */}
                  <div className="-mt-1.5 size-3 bg-sky-600 rotate-45 border-r-2 border-b-2 border-white shadow-xs" />
                </div>
              </MarkerContent>
              <MarkerLabel position="bottom" className="mt-1 bg-white text-sky-800 border border-sky-200 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs">
                OFFICE HQ
              </MarkerLabel>
            </RouteMarker>

            {/* ── 2. MOVING VEHICLE / COMMUTE (Navigation Map Icon) ── */}
            <RouteMarker at="progress">
              <MarkerContent>
                <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 shadow-xl border-2 border-white transition-transform hover:scale-110">
                  <Navigation2 className="size-4 text-white rotate-45" />
                </div>
              </MarkerContent>
              <MarkerLabel position="top" className="mb-1 bg-white text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full text-[9.5px] font-bold shadow-xs">
                {Math.round(progress * 100)}% Transit
              </MarkerLabel>
            </RouteMarker>

            {/* ── 3. DESTINATION: Employee Location (Map Icon Style Pin - Calm Orange) ── */}
            <RouteMarker at="end">
              <MarkerContent>
                <div className="relative flex flex-col items-center group cursor-pointer select-none">
                  {/* Map Pin Teardrop Body */}
                  <div className="relative size-10 rounded-full bg-orange-500 border-2 border-white shadow-lg flex items-center justify-center transition-transform group-hover:scale-110">
                    <User className="size-5 text-white stroke-[2.2]" />
                  </div>
                  {/* Pin Point Tip */}
                  <div className="-mt-1.5 size-3 bg-orange-500 rotate-45 border-r-2 border-b-2 border-white shadow-xs" />
                </div>
              </MarkerContent>
              <MarkerLabel position="bottom" className="mt-1 bg-white text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs">
                EMPLOYEE
              </MarkerLabel>
            </RouteMarker>
          </MapRoute>
        </Map>

        {/* Bottom Floating Telemetry Overlay */}
        <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono shadow-sm flex items-center gap-3">
            <span className="text-sky-700 font-semibold">FROM: AOTMS HQ (Pothuri Towers)</span>
            <span className="text-slate-300">➔</span>
            <span className="text-orange-600 font-semibold">TO: Field Employee</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-700 font-bold">1.4 km Route</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RouteProgressExample;
