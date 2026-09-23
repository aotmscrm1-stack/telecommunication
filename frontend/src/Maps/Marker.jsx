import { useState } from "react";
import { Map, MapMarker, MarkerContent, MarkerPopup, MapControls } from "@/components/ui/map";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MapPin, Navigation, Pause, Radio, Play, RotateCcw, Power } from "lucide-react";

export function DraggableMarkerExample() {
  // Office location default coordinates (Vijayawada / customizable)
  const [draggableMarker, setDraggableMarker] = useState({
    lng: 80.6480,
    lat: 16.5062,
  });

  // Attendance & Live Location Status States: ONLINE, MOVE, STOPPED, OFFLINE
  const [isAttendanceStarted, setIsAttendanceStarted] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState("OFFLINE");
  const [speed, setSpeed] = useState(0);
  const [heading, setHeading] = useState(45);

  // Handle "Start Attendance" click
  const handleToggleAttendance = () => {
    if (!isAttendanceStarted) {
      setIsAttendanceStarted(true);
      setTrackingStatus("ONLINE");
      setSpeed(0);
    } else {
      setIsAttendanceStarted(false);
      setTrackingStatus("OFFLINE");
      setSpeed(0);
    }
  };

  // Immediate status switcher
  const handleStatusChange = (status) => {
    if (!isAttendanceStarted && status !== "OFFLINE") {
      setIsAttendanceStarted(true);
    }
    setTrackingStatus(status);
    if (status === "MOVE") {
      setSpeed(36);
    } else {
      setSpeed(0);
    }
  };

  // Reset to office center
  const resetToOffice = () => {
    setDraggableMarker({ lng: 80.6480, lat: 16.5062 });
  };

  return (
    <div className="w-full space-y-4">
      {/* ── TOP CONTROL HUD: Attendance Actions & Immediate Status Switcher ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        {/* Left: Start Attendance Button (Orange & Blue Gradient) */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleAttendance}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-sm cursor-pointer ${
              isAttendanceStarted
                ? "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-orange-500/20"
                : "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-blue-500/20"
            }`}
          >
            {isAttendanceStarted ? (
              <>
                <Power className="size-4" />
                <span>End Attendance</span>
              </>
            ) : (
              <>
                <Play className="size-4 fill-white" />
                <span>Start Attendance</span>
              </>
            )}
          </button>

          {/* Live Status Indicator Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-slate-50 border-slate-200">
            <span
              className={`size-2 rounded-full ${
                trackingStatus === "ONLINE"
                  ? "bg-sky-500 shadow-[0_0_8px_#0284c7] animate-pulse"
                  : trackingStatus === "MOVE"
                  ? "bg-emerald-500 shadow-[0_0_8px_#10b981] animate-ping"
                  : trackingStatus === "STOPPED"
                  ? "bg-orange-500 shadow-[0_0_8px_#f97316]"
                  : "bg-slate-400"
              }`}
            />
            <span className="text-xs font-semibold text-slate-700">
              {trackingStatus === "ONLINE" && "Online • At Office"}
              {trackingStatus === "MOVE" && `Moving • ${speed} km/h`}
              {trackingStatus === "STOPPED" && "Stopped • Idle"}
              {trackingStatus === "OFFLINE" && "Offline • Punched Out"}
            </span>
          </div>
        </div>

        {/* Right: Quick Status Simulation Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Status:</span>

          <button
            onClick={() => handleStatusChange("ONLINE")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all border cursor-pointer ${
              trackingStatus === "ONLINE"
                ? "bg-sky-50 text-sky-700 border-sky-300 shadow-2xs font-semibold"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Online (Blue)
          </button>

          <button
            onClick={() => handleStatusChange("MOVE")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all border cursor-pointer ${
              trackingStatus === "MOVE"
                ? "bg-sky-500 text-white border-sky-600 shadow-2xs font-semibold"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Move (En Route)
          </button>

          <button
            onClick={() => handleStatusChange("STOPPED")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all border cursor-pointer ${
              trackingStatus === "STOPPED"
                ? "bg-orange-50 text-orange-700 border-orange-300 shadow-2xs font-semibold"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Stopped (Orange)
          </button>

          <button
            onClick={() => handleStatusChange("OFFLINE")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all border cursor-pointer ${
              trackingStatus === "OFFLINE"
                ? "bg-slate-100 text-slate-700 border-slate-300 font-semibold"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Offline
          </button>

          <button
            onClick={resetToOffice}
            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors border border-slate-200 ml-1 cursor-pointer"
            title="Reset Pin to Office"
          >
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      </div>

      {/* ── MAP CANVAS WITH DRAGGABLE MARKER & LIVE HUD ── */}
      <Card className="h-[480px] p-0 overflow-hidden relative border-slate-200 shadow-sm bg-white">
        <Map center={[draggableMarker.lng, draggableMarker.lat]} zoom={14} style="https://tiles.openfreemap.org/styles/bright">
          <MapControls position="top-right" showCompass showZoom />

          <MapMarker
            draggable
            longitude={draggableMarker.lng}
            latitude={draggableMarker.lat}
            onDrag={(lngLat) => {
              setDraggableMarker({ lng: lngLat.lng, lat: lngLat.lat });
            }}
          >
            <MarkerContent>
              <div className="cursor-move group relative flex flex-col items-center select-none">
                {/* 3D Wave Pulse Ring in Cool Blue & Calm Orange */}
                {isAttendanceStarted && (
                  <div
                    className={`absolute -inset-3 rounded-full animate-ping opacity-60 pointer-events-none ${
                      trackingStatus === "MOVE"
                        ? "bg-sky-400"
                        : trackingStatus === "STOPPED"
                        ? "bg-orange-400"
                        : "bg-sky-300"
                    }`}
                  />
                )}

                {/* 3D Marker Badge */}
                <div
                  className={`size-11 rounded-2xl flex items-center justify-center border-2 border-white shadow-lg transition-transform group-hover:scale-110 ${
                    trackingStatus === "ONLINE"
                      ? "bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-sky-500/30"
                      : trackingStatus === "MOVE"
                      ? "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-blue-600/40"
                      : trackingStatus === "STOPPED"
                      ? "bg-gradient-to-tr from-orange-500 to-amber-600 text-white shadow-orange-500/30"
                      : "bg-gradient-to-tr from-slate-600 to-slate-700 text-slate-200 shadow-slate-500/20"
                  }`}
                >
                  {trackingStatus === "MOVE" ? (
                    <Navigation
                      className="size-5 transition-transform"
                      style={{ transform: `rotate(${heading}deg)` }}
                    />
                  ) : trackingStatus === "STOPPED" ? (
                    <Pause className="size-5" />
                  ) : trackingStatus === "ONLINE" ? (
                    <Radio className="size-5" />
                  ) : (
                    <MapPin className="size-5" />
                  )}
                </div>

                {/* Floating Micro Tag */}
                <div className="mt-1 px-2 py-0.5 rounded-full bg-white/95 border border-slate-200 shadow-xs flex items-center gap-1.5 whitespace-nowrap text-[10px] font-semibold text-slate-800">
                  <span
                    className={`size-1.5 rounded-full ${
                      trackingStatus === "ONLINE"
                        ? "bg-sky-500"
                        : trackingStatus === "MOVE"
                        ? "bg-emerald-500"
                        : trackingStatus === "STOPPED"
                        ? "bg-orange-500"
                        : "bg-slate-400"
                    }`}
                  />
                  <span>
                    {trackingStatus === "ONLINE" && "Office HQ"}
                    {trackingStatus === "MOVE" && `${speed} km/h`}
                    {trackingStatus === "STOPPED" && "Paused"}
                    {trackingStatus === "OFFLINE" && "Offline"}
                  </span>
                </div>
              </div>
            </MarkerContent>

            <MarkerPopup>
              <div className="space-y-2 p-1 min-w-[190px]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div className="font-semibold text-xs text-slate-900">Agent Telemetry</div>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                      trackingStatus === "ONLINE"
                        ? "bg-sky-50 text-sky-700 border border-sky-200"
                        : trackingStatus === "MOVE"
                        ? "bg-sky-50 text-sky-700 border border-sky-200"
                        : trackingStatus === "STOPPED"
                        ? "bg-orange-50 text-orange-700 border border-orange-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {trackingStatus}
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Attendance:</span>
                    <strong className={isAttendanceStarted ? "text-sky-600" : "text-slate-500"}>
                      {isAttendanceStarted ? "Punched In" : "Punched Out"}
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Coordinates:</span>
                    <span className="font-mono text-[11px] text-slate-800 font-semibold">
                      {draggableMarker.lat.toFixed(4)}, {draggableMarker.lng.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Speed:</span>
                    <span className="font-mono text-emerald-600 font-bold">{speed} km/h</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 italic pt-1">
                  Drag pin to simulate real-time GPS relocation.
                </p>
              </div>
            </MarkerPopup>
          </MapMarker>
        </Map>

        {/* Floating Bottom Telemetry Badge (Calm Orange & Cool Blue) */}
        <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm text-xs font-mono flex items-center gap-3">
            <span className="text-sky-700 font-semibold">
              LAT: {draggableMarker.lat.toFixed(5)}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-orange-600 font-semibold">
              LNG: {draggableMarker.lng.toFixed(5)}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-700 font-bold">
              {isAttendanceStarted ? "LIVE TRACKING" : "IDLE"}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default DraggableMarkerExample;
