import React, { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cloud,
  CloudDrizzle,
  CloudLightning,
  CloudRain,
  CloudSun,
  Compass,
  Droplets,
  Eye,
  Info,
  LocateFixed,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  Sun,
  Thermometer,
  Wind,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  liveWeatherService,
  type WeatherData,
  type WeatherConditionKey,
} from "../services/weather-service";
import { WeatherAtmosphere } from "./WeatherAtmosphere";
import { useCropCare } from "../context";
import { toast } from "sonner";

export function LiveWeatherCard() {
  const { settings, updateSettings, t } = useCropCare();
  const [data, setData] = useState<WeatherData | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Default coordinate fallback: Andhra Pradesh & Telangana districts
  const defaultCoords: Record<string, { lat: number; lon: number }> = {
    Guntur: { lat: 16.3067, lon: 80.4365 },
    Krishna: { lat: 16.1809, lon: 81.1303 },
    Kurnool: { lat: 15.8281, lon: 78.0373 },
    Warangal: { lat: 17.9689, lon: 79.5941 },
    Khammam: { lat: 17.2473, lon: 80.1514 },
    Nalgonda: { lat: 17.0577, lon: 79.2684 },
  };

  const loadWeather = async (forceRefresh = false) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Check if browser geolocation is permitted
      if ("geolocation" in navigator && forceRefresh) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              const fresh = await liveWeatherService.fetchLiveWeather(
                pos.coords.latitude,
                pos.coords.longitude,
                settings.district || "Current Location",
                settings.district,
                settings.state
              );
              setData(fresh);
              setLoading(false);
            } catch {
              loadFallback();
            }
          },
          () => {
            loadFallback();
          },
          { timeout: 6000 }
        );
        return;
      }
      await loadFallback();
    } catch (e) {
      console.warn("Weather fetch error:", e);
      setErrorMsg("Unable to retrieve live forecast. Showing cached data.");
      setLoading(false);
    }
  };

  const loadFallback = async () => {
    const coords = defaultCoords[settings.district] || { lat: 16.3067, lon: 80.4365 }; // Guntur default
    const fresh = await liveWeatherService.fetchLiveWeather(
      coords.lat,
      coords.lon,
      settings.district || "Guntur",
      settings.district,
      settings.state
    );
    setData(fresh);
    setLoading(false);
  };

  useEffect(() => {
    setMounted(true);
    const cached = liveWeatherService.getCachedWeather();
    if (cached) {
      setData(cached);
    }
    loadWeather(false);
  }, [settings.district]);

  const handleUseCurrentLocation = async () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setErrorMsg("Geolocation is not supported by your browser or device.");
      toast.error("Geolocation not supported");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;

          let detectedDistrict = "Current Location";
          let detectedState = settings.state || "India";

          try {
            const geoRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
              { headers: { "User-Agent": "KisanAI-CropCare/1.0" } }
            );
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              const addr = geoData.address || {};
              detectedDistrict =
                addr.state_district ||
                addr.county ||
                addr.city ||
                addr.town ||
                addr.village ||
                "Current Location";
              detectedState = addr.state || detectedState;
            }
          } catch {
            detectedDistrict = `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`;
          }

          const fresh = await liveWeatherService.fetchLiveWeather(
            lat,
            lon,
            detectedDistrict,
            detectedDistrict,
            detectedState
          );

          setData(fresh);
          updateSettings({ district: detectedDistrict, state: detectedState });
          setShowSearchModal(false);
          toast.success(`Location set to ${detectedDistrict}, ${detectedState}`);
        } catch (err) {
          console.error("GPS location weather error:", err);
          setErrorMsg("Could not fetch forecast for GPS location.");
          toast.error("GPS location fetch failed");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        const msg =
          err.code === 1
            ? "Location permission was denied. Please allow location access in your browser."
            : "Could not determine GPS position. Try searching manually.";
        setErrorMsg(msg);
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const geo = await liveWeatherService.searchLocation(searchQuery.trim());
      if (geo) {
        const fresh = await liveWeatherService.fetchLiveWeather(
          geo.lat,
          geo.lon,
          geo.name,
          geo.name,
          geo.admin1
        );
        setData(fresh);
        setShowSearchModal(false);
        setSearchQuery("");
      } else {
        setErrorMsg(`Location "${searchQuery}" not found. Try another district.`);
      }
    } catch {
      setErrorMsg("Geocoding failed. Check connection.");
    } finally {
      setSearchLoading(false);
    }
  };

  const renderWeatherIcon = (cond: WeatherConditionKey, className = "size-6") => {
    switch (cond) {
      case "sunny":
        return <Sun className={cn(className, "text-amber-500")} />;
      case "clear-night":
        return <Sun className={cn(className, "text-indigo-300")} />;
      case "partly-cloudy":
        return <CloudSun className={cn(className, "text-sky-500")} />;
      case "cloudy":
        return <Cloud className={cn(className, "text-slate-400")} />;
      case "rain":
      case "drizzle":
        return <CloudRain className={cn(className, "text-sky-400")} />;
      case "heavy-rain":
      case "thunderstorm":
        return <CloudLightning className={cn(className, "text-indigo-400")} />;
      default:
        return <CloudSun className={cn(className, "text-sky-500")} />;
    }
  };

  if (!data && loading) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-line bg-card p-6 shadow-sm animate-pulse">
        <div className="flex items-center justify-between pb-4 border-b border-line">
          <div className="h-4 w-32 rounded-md bg-muted" />
          <div className="h-4 w-16 rounded-md bg-muted" />
        </div>
        <div className="my-6 flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-10 w-24 rounded-lg bg-muted" />
            <div className="h-4 w-36 rounded-md bg-muted" />
          </div>
          <div className="size-16 rounded-2xl bg-muted" />
        </div>
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-line">
          <div className="h-10 rounded-xl bg-muted" />
          <div className="h-10 rounded-xl bg-muted" />
          <div className="h-10 rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  const current = data?.current;
  const condition = current?.condition || "partly-cloudy";
  const isDay = current?.isDay ?? true;
  const primaryInsight = data?.insights?.[0];

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-line/80 bg-card p-5 sm:p-6 shadow-sm transition-all duration-300"
      suppressHydrationWarning
    >
      {/* 1. Cinematic Weather Environment Atmosphere */}
      <WeatherAtmosphere condition={condition} isDay={isDay} />

      {/* 2. Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between gap-3 border-b border-line/50 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setShowSearchModal(true)}
            className="group flex items-center gap-1.5 truncate text-left hover:opacity-80 transition-opacity"
            title="Change farm weather location"
          >
            <MapPin className="size-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-bold text-foreground">
              {data?.locationName || settings.district || "Farm Location"}
            </span>
            <Search className="size-3 text-muted-foreground group-hover:text-foreground transition-colors ml-0.5" />
          </button>

          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={loading}
            className="rounded-xl border border-line bg-surface/80 p-1.5 text-muted-foreground hover:bg-surface hover:text-primary active:scale-95 transition-all cursor-pointer"
            title="Detect & Use Current GPS Location"
          >
            <LocateFixed className="size-3.5" />
          </button>

          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
              data?.isLive
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
            )}
          >
            <span className={cn("size-1.5 rounded-full", data?.isLive ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
            {data?.isLive ? "Live" : "Cached"}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-muted-foreground hidden sm:inline" suppressHydrationWarning>
            Updated {mounted && data?.lastUpdated ? data.lastUpdated : "recently"}
          </span>
          <button
            type="button"
            onClick={() => loadWeather(true)}
            disabled={loading}
            className="rounded-xl border border-line bg-surface/80 p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground active:scale-95 transition-all cursor-pointer"
            title="Refresh weather"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin text-primary")} />
          </button>
        </div>
      </div>

      {/* 3. Main Weather Metric Display */}
      <div className="relative z-10 my-4 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
              {current?.temperature ?? 28}°
            </span>
            <span className="text-sm font-semibold text-muted-foreground">C</span>
            <span className="text-xs font-medium text-muted-foreground ml-1">
              (Feels like {current?.feelsLike ?? 29}°)
            </span>
          </div>

          <p className="mt-1 text-sm font-semibold text-foreground/90 capitalize flex items-center gap-1.5">
            {current?.conditionLabel || "Clear Sky"}
          </p>

          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span>H: {data?.daily?.[0]?.maxTemp ?? 33}°</span>
            <span>•</span>
            <span>L: {data?.daily?.[0]?.minTemp ?? 22}°</span>
            <span>•</span>
            <span className="text-primary font-medium">UV: {current?.uvIndex.toFixed(0) ?? 4}</span>
          </div>
        </div>

        <div className="relative shrink-0">
          <div className="grid size-16 sm:size-20 place-items-center rounded-3xl bg-surface/80 backdrop-blur-xs border border-line/60 shadow-xs">
            {renderWeatherIcon(condition, "size-9 sm:size-11")}
          </div>
        </div>
      </div>

      {/* 4. Core Micro-Indicators Bar */}
      <div className="relative z-10 grid grid-cols-3 gap-2 pt-3 border-t border-line/50">
        <div className="flex flex-col items-center justify-center rounded-2xl bg-surface/60 backdrop-blur-2xs p-2 text-center border border-line/40">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <CloudRain className="size-3 text-sky-500" /> Rain
          </span>
          <span className="mt-0.5 text-xs font-bold text-foreground">
            {data?.daily?.[0]?.precipitationProb ?? 10}%
          </span>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl bg-surface/60 backdrop-blur-2xs p-2 text-center border border-line/40">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Droplets className="size-3 text-teal-500" /> Humidity
          </span>
          <span className="mt-0.5 text-xs font-bold text-foreground">
            {current?.humidity ?? 65}%
          </span>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl bg-surface/60 backdrop-blur-2xs p-2 text-center border border-line/40">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Wind className="size-3 text-indigo-500" /> Wind
          </span>
          <span className="mt-0.5 text-xs font-bold text-foreground">
            {current?.windSpeed ?? 12} km/h
          </span>
        </div>
      </div>

      {/* 5. Smart Agricultural Insight Pill */}
      {primaryInsight && (
        <div
          className={cn(
            "relative z-10 mt-3 flex items-start gap-2.5 rounded-2xl p-3 text-xs leading-relaxed transition-all",
            primaryInsight.level === "warning"
              ? "border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
              : primaryInsight.level === "optimal"
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
              : "border border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-200"
          )}
        >
          <span className="shrink-0 mt-0.5">
            {primaryInsight.level === "warning" ? (
              <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
            ) : primaryInsight.level === "optimal" ? (
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Info className="size-4 text-sky-600 dark:text-sky-400" />
            )}
          </span>
          <div className="min-w-0">
            <p className="font-bold">{primaryInsight.title}</p>
            <p className="mt-0.5 text-[11.5px] opacity-90">{primaryInsight.message}</p>
          </div>
        </div>
      )}

      {/* 6. Expand / Collapse Trigger */}
      <div className="relative z-10 mt-3 flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
        >
          {expanded ? "Show Less" : "Hourly & 7-Day Forecast"}
          {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </button>

        <Link
          to="/weather"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          Full Spray Planner <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {/* 7. Smoothly Expanded Detailed Hourly & 7-Day View */}
      {expanded && (
        <div className="relative z-10 mt-4 space-y-4 pt-4 border-t border-line/60 animate-in fade-in duration-300">
          {/* Hourly Forecast Timeline (Scrollable) */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Next 24 Hours Forecast
            </h4>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {data?.hourly?.map((h, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center justify-between rounded-2xl border border-line/40 bg-surface/70 backdrop-blur-2xs p-2.5 min-w-[4.2rem] text-center shrink-0 shadow-2xs"
                >
                  <span className="text-[11px] font-medium text-muted-foreground">{h.time}</span>
                  <div className="my-1.5">{renderWeatherIcon(h.condition, "size-5")}</div>
                  <span className="text-xs font-bold text-foreground">{h.temperature}°</span>
                  <span className="mt-1 text-[10px] font-semibold text-sky-500">
                    {h.precipitationProb > 0 ? `${h.precipitationProb}%` : "0%"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 7-Day Weather Outlook */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              7-Day Agricultural Outlook
            </h4>
            <div className="space-y-1.5 rounded-2xl border border-line/40 bg-surface/40 p-2">
              {data?.daily?.map((d, dIdx) => (
                <div
                  key={dIdx}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-surface/60 transition-colors text-xs"
                >
                  <span className="w-24 font-semibold text-foreground truncate">{d.date}</span>
                  <div className="flex items-center gap-1.5 w-32">
                    {renderWeatherIcon(d.condition, "size-4 shrink-0")}
                    <span className="truncate text-[11px] text-muted-foreground">{d.conditionLabel}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-right w-20 justify-end">
                    <span className="font-bold text-foreground">{d.maxTemp}°</span>
                    <span className="text-muted-foreground/80">{d.minTemp}°</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 8. Manual Location Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-line bg-card p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Select Farm Location</h3>
              <button
                type="button"
                onClick={() => setShowSearchModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-surface"
              >
                <X className="size-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary/15 border border-primary/30 p-2.5 text-xs font-bold text-primary hover:bg-primary/25 active:scale-95 transition-all cursor-pointer"
            >
              <LocateFixed className="size-4" />
              <span>Use Current GPS Location</span>
            </button>

            <form onSubmit={handleManualSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search district (e.g. Guntur, Warangal)..."
                className="w-full rounded-2xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={searchLoading}
                className="absolute right-2 top-2 rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground"
              >
                {searchLoading ? "..." : "Search"}
              </button>
            </form>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Quick Andhra & Telangana Districts:
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {Object.keys(defaultCoords).map((dist) => (
                  <button
                    key={dist}
                    type="button"
                    onClick={async () => {
                      const c = defaultCoords[dist];
                      if (!c) return;
                      setLoading(true);
                      setShowSearchModal(false);
                      const fresh = await liveWeatherService.fetchLiveWeather(
                        c.lat,
                        c.lon,
                        dist,
                        dist,
                        "AP / Telangana"
                      );
                      setData(fresh);
                      setLoading(false);
                    }}
                    className="rounded-xl border border-line/60 bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:bg-primary/10 hover:border-primary/40 transition-colors"
                  >
                    {dist}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

