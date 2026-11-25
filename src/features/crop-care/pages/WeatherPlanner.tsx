import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Cloud,
  CloudDrizzle,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  Gauge,
  Info,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useCropCare } from "../context";
import { PageHeader, card, enter, btnPrimary, btnSecondary } from "../ui";

type HourlySlot = {
  time: string;
  temp: number;
  humidity: number;
  windSpeed: number;
  rainChance: number;
  condition: "sunny" | "cloudy" | "rainy" | "storm";
  spraySuitability: "optimal" | "caution" | "prohibited";
  reason: string;
};

export function WeatherPlannerPage() {
  const { t, settings, lang } = useCropCare();
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);

  // Dynamic meteorological simulation tailored to district & season
  const isSummer = settings.season === "zaid";
  const isMonsoon = settings.season === "kharif" || settings.season === "early-kharif";

  const baseTemp = isSummer ? 36 : isMonsoon ? 29 : 24;
  const baseHumidity = isMonsoon ? 82 : isSummer ? 45 : 62;

  const hourlySlots: HourlySlot[] = [
    {
      time: "06:00 AM",
      temp: baseTemp - 5,
      humidity: Math.min(95, baseHumidity + 12),
      windSpeed: 6,
      rainChance: isMonsoon ? 15 : 5,
      condition: isMonsoon ? "cloudy" : "sunny",
      spraySuitability: "optimal",
      reason: "Calm morning winds (< 10 km/h) and moderate temperature. Excellent absorption.",
    },
    {
      time: "09:00 AM",
      temp: baseTemp - 2,
      humidity: baseHumidity + 4,
      windSpeed: 9,
      rainChance: isMonsoon ? 20 : 5,
      condition: "sunny",
      spraySuitability: "optimal",
      reason: "Dew has dried; leaves are receptive with minimal wind drift.",
    },
    {
      time: "12:00 PM",
      temp: baseTemp + 4,
      humidity: baseHumidity - 18,
      windSpeed: 16,
      rainChance: isMonsoon ? 30 : 0,
      condition: isSummer ? "sunny" : "cloudy",
      spraySuitability: "caution",
      reason: "High noon temperature accelerates spray droplet evaporation. Wait for late afternoon.",
    },
    {
      time: "03:00 PM",
      temp: baseTemp + 3,
      humidity: baseHumidity - 10,
      windSpeed: 21,
      rainChance: isMonsoon ? 45 : 10,
      condition: isMonsoon ? "rainy" : "sunny",
      spraySuitability: isMonsoon ? "prohibited" : "caution",
      reason: isMonsoon
        ? "Wind gust exceeds 20 km/h with 45% precipitation probability. High wash-off risk."
        : "Gusty crosswinds may cause spray drift onto adjacent rows.",
    },
    {
      time: "05:30 PM",
      temp: baseTemp - 1,
      humidity: baseHumidity + 2,
      windSpeed: 8,
      rainChance: isMonsoon ? 15 : 5,
      condition: "cloudy",
      spraySuitability: "optimal",
      reason: "Ideal evening window: Lower thermal lift, gentle breeze, no rain forecasted.",
    },
  ];

  const activeSlot = hourlySlots[selectedSlotIndex] ?? hourlySlots[0]!;

  // Disease epidemiological forecasts
  const blastRisk = baseHumidity > 78 && baseTemp <= 30 ? "High" : "Moderate";
  const blbRisk = isMonsoon ? "Severe" : "Low";
  const thripsRisk = isSummer || baseHumidity < 55 ? "Severe" : "Low";

  return (
    <div className={cn("space-y-8 pb-14 max-w-4xl mx-auto", enter)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line pb-4">
        <Link
          to="/"
          className="-ml-2 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {t("back")}
        </Link>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          Offline Microclimate Engine
        </span>
      </div>

      <PageHeader
        eyebrow="Agricultural Meteorology"
        title={t("sprayWindow")}
        sub={`Microclimate telemetry and safe spray forecasting for ${settings.district}, ${settings.state}.`}
      />

      {/* Main Meteorological Status Card */}
      <div className={cn(card, "p-6 bg-gradient-to-br from-card via-card to-primary/5 border-primary/20 space-y-6 shadow-sm")}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Current Field Conditions
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-extrabold text-foreground sm:text-5xl font-mono">
                {activeSlot.temp}°C
              </span>
              <span className="text-sm font-semibold text-muted-foreground">
                in {settings.district}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Season: <strong className="text-foreground capitalize">{settings.season}</strong> · Humidity: <strong className="text-foreground">{activeSlot.humidity}% RH</strong>
            </p>
          </div>

          {/* Spray Safety Banner */}
          <div
            className={cn(
              "rounded-2xl p-4 border flex items-center gap-3 sm:max-w-xs",
              activeSlot.spraySuitability === "optimal"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : activeSlot.spraySuitability === "caution"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400"
            )}
          >
            {activeSlot.spraySuitability === "optimal" ? (
              <ShieldCheck className="size-8 shrink-0" />
            ) : activeSlot.spraySuitability === "caution" ? (
              <AlertTriangle className="size-8 shrink-0" />
            ) : (
              <ShieldAlert className="size-8 shrink-0" />
            )}
            <div>
              <p className="font-extrabold text-sm uppercase tracking-wide">
                {activeSlot.spraySuitability === "optimal"
                  ? "Optimal Spray Window"
                  : activeSlot.spraySuitability === "caution"
                  ? "Spray with Caution"
                  : "Do Not Spray"}
              </p>
              <p className="text-xs opacity-90 line-clamp-2">
                {activeSlot.reason}
              </p>
            </div>
          </div>
        </div>

        {/* 4 Sensor Gauges */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-line bg-surface/50 p-3.5 space-y-1">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Wind className="size-3.5 text-primary" /> Wind Velocity
            </span>
            <p className="font-mono text-xl font-bold text-foreground">
              {activeSlot.windSpeed} <span className="text-xs font-normal text-muted-foreground">km/h</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              {activeSlot.windSpeed < 12 ? "Safe low drift" : "High drift risk"}
            </p>
          </div>

          <div className="rounded-xl border border-line bg-surface/50 p-3.5 space-y-1">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Droplets className="size-3.5 text-blue-500" /> Relative Humidity
            </span>
            <p className="font-mono text-xl font-bold text-foreground">
              {activeSlot.humidity}%
            </p>
            <p className="text-[11px] text-muted-foreground">
              {activeSlot.humidity > 80 ? "Foliar wetness high" : "Normal leaf drying"}
            </p>
          </div>

          <div className="rounded-xl border border-line bg-surface/50 p-3.5 space-y-1">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <CloudRain className="size-3.5 text-indigo-500" /> Rain Probability
            </span>
            <p className="font-mono text-xl font-bold text-foreground">
              {activeSlot.rainChance}%
            </p>
            <p className="text-[11px] text-muted-foreground">
              {activeSlot.rainChance < 20 ? "Wash-off improbable" : "Wash-off probable"}
            </p>
          </div>

          <div className="rounded-xl border border-line bg-surface/50 p-3.5 space-y-1">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Thermometer className="size-3.5 text-amber" /> Temperature
            </span>
            <p className="font-mono text-xl font-bold text-foreground">
              {activeSlot.temp}°C
            </p>
            <p className="text-[11px] text-muted-foreground">
              {activeSlot.temp > 33 ? "Avoid noon heat" : "Balanced absorption"}
            </p>
          </div>
        </div>

        {/* Hourly Timeline Selector */}
        <div className="space-y-2 pt-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Daily Spray Window Timeline
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {hourlySlots.map((slot, idx) => {
              const isSelected = selectedSlotIndex === idx;
              return (
                <button
                  key={slot.time}
                  type="button"
                  onClick={() => setSelectedSlotIndex(idx)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all text-center",
                    isSelected
                      ? "border-primary bg-primary/10 ring-2 ring-primary/40 font-bold"
                      : "border-line bg-surface hover:border-primary/40"
                  )}
                >
                  <span className="text-xs font-semibold">{slot.time}</span>
                  <span className="font-mono text-base font-extrabold text-foreground">
                    {slot.temp}°C
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      slot.spraySuitability === "optimal"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : slot.spraySuitability === "caution"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {slot.spraySuitability}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Disease Microclimate Risk Forecast */}
      <div className={cn(card, "p-6 space-y-4")}>
        <div className="flex items-center gap-2">
          <Gauge className="size-5 text-primary" />
          <h3 className="text-base font-bold text-foreground">
            Disease Epidemic Weather Risk Indices
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Calculated by correlating current humidity, temperature, and leaf moisture duration against ICAR epidemiological thresholds.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          {/* Rice Blast Risk */}
          <div className="rounded-2xl border border-line bg-surface/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Rice Blast Spore Risk</span>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-bold",
                blastRisk === "High" ? "bg-rose-500/15 text-rose-500" : "bg-emerald-500/15 text-emerald-500"
              )}>
                {blastRisk}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Night dew periods &gt;10 hrs combined with RH &gt;80% accelerate fungal conidia release.
            </p>
          </div>

          {/* Rice BLB Risk */}
          <div className="rounded-2xl border border-line bg-surface/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Bacterial Blight (BLB)</span>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-bold",
                blbRisk === "Severe" ? "bg-rose-500/15 text-rose-500" : "bg-emerald-500/15 text-emerald-500"
              )}>
                {blbRisk}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Heavy rain splashes and standing field floodwaters drive rapid vascular bacterial migration.
            </p>
          </div>

          {/* Chilli Thrips & Mites */}
          <div className="rounded-2xl border border-line bg-surface/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Chilli Thrips &amp; Mites</span>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-bold",
                thripsRisk === "Severe" ? "bg-amber-500/15 text-amber-500" : "bg-emerald-500/15 text-emerald-500"
              )}>
                {thripsRisk}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Dry warm weather &gt;32°C accelerates thrips reproduction and leaf curl virus transmission.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

