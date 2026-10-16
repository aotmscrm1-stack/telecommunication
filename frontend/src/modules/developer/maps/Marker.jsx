import { useState, useMemo } from "react";
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapRoute,
  MapControls,
} from "@/components/ui/map";
import { Card } from "@/components/ui/card";
import {
  Building2,
  User,
  Navigation2,
  Pause,
  Radio,
  Play,
  RotateCcw,
  Power,
  ArrowLeftRight,
} from "lucide-react";

// Office HQ Coordinates (Pothuri Towers, Vijayawada)
const OFFICE_COORDS = { lng: 80.6480, lat: 16.5062 };

// Calculate accurate geographical distance in meters (Haversine formula)
function calculateMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function DraggableMarkerExample() {
  // Employee draggable coordinates (initially near Benz Circle)
  const [employeeMarker, setEmployeeMarker] = useState({
    lng: 80.6385,
    lat: 16.5120,
  });

  // Attendance & Live Location Status: ONLINE, MOVE, STOPPED, OFFLINE
  const [isAttendanceStarted, setIsAttendanceStarted] = useState(true);
  const [trackingStatus, setTrackingStatus] = useState("MOVE"); // Default active simulation
  const [speed, setSpeed] = useState(32);
  const [cameraCenter, setCameraCenter] = useState([80.6432, 16.5091]);
  const [cameraZoom, setCameraZoom] = useState(13.8);

  // Generate multi-point curved route between Office and Employee
  const routeCoordinates = useMemo(() => {
    const p1 = [OFFICE_COORDS.lng, OFFICE_COORDS.lat];
    const p2 = [employeeMarker.lng, employeeMarker.lat];
    const mid1 = [
      p1[0] + (p2[0] - p1[0]) * 0.35 + 0.0018,
      p1[1] + (p2[1] - p1[1]) * 0.35 - 0.0008,
    ];
    const mid2 = [
      p1[0] + (p2[0] - p1[0]) * 0.7 - 0.0012,
      p1[1] + (p2[1] - p1[1]) * 0.7 + 0.0015,
    ];
    return [p1, mid1, mid2, p2];
  }, [employeeMarker]);

  // Route Midpoint for Distance Badge
  const routeMidPoint = useMemo(() => {
    if (!routeCoordinates || routeCoordinates.length < 2) return null;
    return routeCoordinates[1];
  }, [routeCoordinates]);

  // Calculate live cumulative meter distance along the route
  const distanceInMeters = useMemo(() => {
    let total = 0;
    for (let i = 1; i < routeCoordinates.length; i++) {
      const [lon1, lat1] = routeCoordinates[i - 1];
      const [lon2, lat2] = routeCoordinates[i];
      total += calculateMeters(lat1, lon1, lat2, lon2);
    }
    return total;
  }, [routeCoordinates]);

  // VISIBILITY RULE: Route is visible when Attendance is started AND status is ONLINE, MOVE, or STOPPED.
  // When OFFLINE: Route is NOT visible.
  const isRouteVisible = isAttendanceStarted && trackingStatus !== "OFFLINE";

  // Handle "Start Attendance" toggle
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

  // Immediate Status Change (Online, Move, Stopped, Offline)
  const handleStatusChange = (status) => {
    if (!isAttendanceStarted && status !== "OFFLINE") {
      setIsAttendanceStarted(true);
    }
    setTrackingStatus(status);
    if (status === "MOVE") {
      setSpeed(34);
    } else {
      setSpeed(0);
    }
  };

  // Shift camera: Employee to Office / Office to Employee
  const shiftCameraToOffice = () => {
    setCameraCenter([OFFICE_COORDS.lng, OFFICE_COORDS.lat]);
    setCameraZoom(15.5);
  };

  const shiftCameraToEmployee = () => {
    setCameraCenter([employeeMarker.lng, employeeMarker.lat]);
    setCameraZoom(15.5);
  };

  const resetBoth = () => {
    setEmployeeMarker({ lng: 80.6385, lat: 16.5120 });
    setCameraCenter([80.6432, 16.5091]);
    setCameraZoom(13.8);
    setTrackingStatus("MOVE");
    setIsAttendanceStarted(true);
  };

  return (
    <div className="w-full space-y-4 font-sans select-none">
      {/* ── TOP ACTION BAR: Start Attendance, Status & Easy Camera Shift ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        {/* Left: Start Attendance Button (Orange & Blue Theme) */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleAttendance}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-sm cursor-pointer ${
              isAttendanceStarted
                ? "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 text-white shadow-orange-500/20"
                : "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 text-white shadow-blue-500/20"
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

          {/* Easy Camera Shift: Office to Employee, Employee to Office */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={shiftCameraToOffice}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-white hover:text-sky-700 transition-all cursor-pointer"
              title="Center Camera on Office HQ"
            >
              <Building2 className="size-3.5 text-sky-600" />
              <span>Shift Office</span>
            </button>

            <span className="text-slate-300 px-1">
              <ArrowLeftRight className="size-3" />
            </span>

            <button
              onClick={shiftCameraToEmployee}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-white hover:text-orange-600 transition-all cursor-pointer"
              title="Center Camera on Employee"
            >
              <User className="size-3.5 text-orange-600" />
              <span>Shift Employee</span>
            </button>
          </div>
        </div>

        {/* Right: Status Switcher (Online, Move, Stopped, Offline) */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Status:</span>

          {/* Online (Blue) */}
          <button
            onClick={() => handleStatusChange("ONLINE")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all border cursor-pointer ${
              trackingStatus === "ONLINE"
                ? "bg-sky-50 text-sky-700 border-sky-400 font-bold shadow-2xs"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Online (Route Visible)
          </button>

          {/* Move (Transit) */}
          <button
            onClick={() => handleStatusChange("MOVE")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all border cursor-pointer ${
              trackingStatus === "MOVE"
                ? "bg-sky-500 text-white border-sky-600 font-bold shadow-2xs"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Move (Route Visible)
          </button>

          {/* Stopped (Calm Orange) */}
          <button
            onClick={() => handleStatusChange("STOPPED")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all border cursor-pointer ${
              trackingStatus === "STOPPED"
                ? "bg-orange-50 text-orange-700 border-orange-400 font-bold shadow-2xs"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Stopped (Route Visible)
          </button>

          {/* Offline (Route Hidden) */}
          <button
            onClick={() => handleStatusChange("OFFLINE")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all border cursor-pointer ${
              trackingStatus === "OFFLINE"
                ? "bg-slate-800 text-white border-slate-900 font-bold shadow-2xs"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Offline (Route Hidden)
          </button>

          <button
            onClick={resetBoth}
            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors border border-slate-200 ml-1 cursor-pointer"
            title="Reset Coordinates"
          >
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      </div>

      {/* ── MAP CONTAINER ── */}
      <Card className="h-[500px] p-0 overflow-hidden relative border-slate-200 shadow-sm bg-white">
        <Map center={cameraCenter} zoom={cameraZoom} style="https://tiles.openfreemap.org/styles/bright">
          <MapControls position="top-right" showZoom showCompass />

          {/* ── VIBRANT BLUE ROUTE (Office to Employee): Visible Online, Hidden Offline ── */}
          {isRouteVisible && (
            <>
              {/* Outer Cyan Halo Glow for Route Line */}
              <MapRoute
                id="route-halo"
                coordinates={routeCoordinates}
                color="#38bdf8"
                width={10}
                opacity={0.35}
              />

              {/* Bold Vibrant Blue Route Line */}
              <MapRoute
                id="route-main"
                coordinates={routeCoordinates}
                color="#0284c7"
                width={5}
                opacity={0.98}
              />
            </>
          )}

          {/* ── ROUTE DISTANCE BADGE IN METERS (Visible when route is active) ── */}
          {isRouteVisible && routeMidPoint && (
            <MapMarker longitude={routeMidPoint[0]} latitude={routeMidPoint[1]}>
              <MarkerContent>
                <div className="bg-white/95 backdrop-blur-md border-2 border-sky-500 text-sky-900 px-3 py-1 rounded-full shadow-lg text-[11px] font-bold font-mono flex items-center gap-1.5 pointer-events-none select-none -translate-y-2 whitespace-nowrap">
                  <span className="size-2 rounded-full bg-sky-500 animate-pulse shrink-0" />
                  <span>
                    {distanceInMeters.toLocaleString()} METERS
                    {distanceInMeters >= 1000 ? ` (${(distanceInMeters / 1000).toFixed(2)} km)` : ""}
                  </span>
                </div>
              </MarkerContent>
            </MapMarker>
          )}

          {/* ── 1. OFFICE HQ MARKER: Clean Teardrop Map Pin (Cool Blue) ── */}
          <MapMarker longitude={OFFICE_COORDS.lng} latitude={OFFICE_COORDS.lat}>
            <MarkerContent>
              <div
                onClick={shiftCameraToOffice}
                className="relative flex flex-col items-center group cursor-pointer select-none"
              >
                {/* Teardrop Pin Body */}
                <div className="size-9 rounded-full bg-sky-600 border-2 border-white shadow-md flex items-center justify-center transition-transform group-hover:scale-110">
                  <Building2 className="size-4 text-white stroke-[2.2]" />
                </div>
                {/* Pin Tip */}
                <div className="-mt-1 size-2.5 bg-sky-600 rotate-45 border-r border-b border-white" />
                {/* Label */}
                <div className="mt-1 px-2 py-0.5 rounded-full bg-white border border-sky-200 text-sky-800 text-[10px] font-bold shadow-xs">
                  OFFICE HQ
                </div>
              </div>
            </MarkerContent>
            <MarkerPopup>
              <div className="p-1 min-w-[170px] space-y-1">
                <div className="font-semibold text-xs text-sky-800">AOTMS Headquarters</div>
                <div className="text-[11px] text-slate-500">Pothuri Towers, Vijayawada</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {OFFICE_COORDS.lat.toFixed(4)}, {OFFICE_COORDS.lng.toFixed(4)}
                </div>
              </div>
            </MarkerPopup>
          </MapMarker>

          {/* ── 2. EMPLOYEE DRAGGABLE MARKER: Clean Map Pin Style (Online/Move/Stopped/Offline) ── */}
          <MapMarker
            draggable
            longitude={employeeMarker.lng}
            latitude={employeeMarker.lat}
            onDrag={(lngLat) => {
              setEmployeeMarker({ lng: lngLat.lng, lat: lngLat.lat });
            }}
          >
            <MarkerContent>
              <div className="cursor-move group relative flex flex-col items-center select-none">
                {/* Clean Teardrop Map Icon Pin */}
                <div
                  className={`size-10 rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-transform group-hover:scale-110 ${
                    trackingStatus === "ONLINE"
                      ? "bg-sky-600 text-white shadow-sky-600/30"
                      : trackingStatus === "MOVE"
                      ? "bg-sky-500 text-white shadow-sky-500/30"
                      : trackingStatus === "STOPPED"
                      ? "bg-orange-500 text-white shadow-orange-500/30"
                      : "bg-slate-600 text-slate-200"
                  }`}
                >
                  {trackingStatus === "MOVE" ? (
                    <Navigation2 className="size-5 rotate-45 stroke-[2.2]" />
                  ) : trackingStatus === "STOPPED" ? (
                    <Pause className="size-4.5 stroke-[2.5]" />
                  ) : trackingStatus === "ONLINE" ? (
                    <Radio className="size-4.5 stroke-[2.2]" />
                  ) : (
                    <User className="size-4.5 stroke-[2.2]" />
                  )}
                </div>

                {/* Pointed Pin Tip */}
                <div
                  className={`-mt-1.5 size-3 rotate-45 border-r-2 border-b-2 border-white shadow-2xs ${
                    trackingStatus === "ONLINE"
                      ? "bg-sky-600"
                      : trackingStatus === "MOVE"
                      ? "bg-sky-500"
                      : trackingStatus === "STOPPED"
                      ? "bg-orange-500"
                      : "bg-slate-600"
                  }`}
                />

                {/* Micro Label Tag with Live Status & Meter Distance */}
                <div className="mt-1 px-2.5 py-0.5 rounded-full bg-white border border-slate-200 shadow-xs flex items-center gap-1.5 whitespace-nowrap text-[10px] font-semibold text-slate-800">
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
                    {trackingStatus === "ONLINE" && `Online • ${distanceInMeters}m to HQ`}
                    {trackingStatus === "MOVE" && `${speed} km/h • ${distanceInMeters}m`}
                    {trackingStatus === "STOPPED" && `Stopped • ${distanceInMeters}m`}
                    {trackingStatus === "OFFLINE" && "Offline (Route Hidden)"}
                  </span>
                </div>
              </div>
            </MarkerContent>

            <MarkerPopup>
              <div className="space-y-2 p-1 min-w-[200px]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div className="font-semibold text-xs text-slate-900">Field Employee</div>
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
                    <span>Distance to Office:</span>
                    <strong className="text-sky-700 font-mono">
                      {isRouteVisible ? `${distanceInMeters.toLocaleString()} meters` : "Hidden (Offline)"}
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Coordinates:</span>
                    <span className="font-mono text-[11px] text-slate-800 font-semibold">
                      {employeeMarker.lat.toFixed(4)}, {employeeMarker.lng.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Speed:</span>
                    <span className="font-mono text-emerald-600 font-bold">{speed} km/h</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 italic pt-1">
                  Drag pin to move employee and watch live blue route and meters update.
                </p>
              </div>
            </MarkerPopup>
          </MapMarker>
        </Map>

        {/* Bottom Floating Telemetry Overlay */}
        <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl px-3.5 py-1.5 shadow-sm text-xs font-mono flex items-center gap-3">
            <span className="text-sky-700 font-semibold">
              OFFICE: [{OFFICE_COORDS.lat.toFixed(3)}, {OFFICE_COORDS.lng.toFixed(3)}]
            </span>
            <span className="text-slate-300">➔</span>
            <span className="text-orange-600 font-semibold">
              EMPLOYEE: [{employeeMarker.lat.toFixed(3)}, {employeeMarker.lng.toFixed(3)}]
            </span>
            <span className="text-slate-300">|</span>
            <span className={isRouteVisible ? "text-sky-600 font-bold" : "text-slate-400 font-bold"}>
              {isRouteVisible ? `BLUE ROUTE ACTIVE (${distanceInMeters.toLocaleString()} METERS)` : "ROUTE HIDDEN (OFFLINE)"}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default DraggableMarkerExample;
