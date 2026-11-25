import React from "react";
import type { WeatherConditionKey } from "../services/weather-service";
import { cn } from "@/lib/utils";

interface WeatherAtmosphereProps {
  condition: WeatherConditionKey;
  isDay?: boolean;
  className?: string;
}

export const WeatherAtmosphere: React.FC<WeatherAtmosphereProps> = ({
  condition,
  isDay = true,
  className,
}) => {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-3xl transition-colors duration-1000",
        className
      )}
    >
      {/* 1. SUNNY DAY ATMOSPHERE */}
      {condition === "sunny" && isDay && (
        <div className="relative size-full bg-gradient-to-br from-amber-500/25 via-sky-400/10 to-transparent">
          {/* Animated Glowing Sun Disk */}
          <div className="absolute -top-10 -right-10 size-48 rounded-full bg-amber-400/25 blur-3xl animate-pulse" />
          <div className="absolute top-2 right-2 size-20 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 shadow-[0_0_50px_rgba(251,191,36,0.6)]" />
          {/* Warm Sun Rays */}
          <div className="absolute -top-16 -right-16 size-72 rounded-full border border-amber-300/20 animate-spin [animation-duration:60s]" />
          <div className="absolute -top-24 -right-24 size-96 rounded-full border border-dashed border-amber-200/15 animate-spin [animation-duration:90s]" />
        </div>
      )}

      {/* 2. CLEAR NIGHT ATMOSPHERE */}
      {(condition === "clear-night" || (!isDay && condition === "sunny")) && (
        <div className="relative size-full bg-gradient-to-br from-slate-900/40 via-indigo-950/20 to-transparent">
          {/* Subtle Moon & Stars */}
          <div className="absolute top-4 right-4 size-14 rounded-full bg-slate-100 shadow-[0_0_30px_rgba(241,245,249,0.5)]">
            <div className="absolute size-14 rounded-full bg-slate-900/30 blur-xs" />
          </div>
          {/* Twinkling stars */}
          <span className="absolute top-8 left-1/4 size-1 rounded-full bg-white/70 animate-ping [animation-duration:3s]" />
          <span className="absolute top-16 left-1/2 size-1.5 rounded-full bg-white/60 animate-pulse [animation-duration:4s]" />
          <span className="absolute top-10 left-3/4 size-1 rounded-full bg-white/80 animate-ping [animation-duration:5s]" />
        </div>
      )}

      {/* 3. PARTLY CLOUDY */}
      {condition === "partly-cloudy" && (
        <div className="relative size-full bg-gradient-to-br from-sky-400/20 via-sky-200/10 to-transparent">
          <div className="absolute top-2 right-4 size-16 rounded-full bg-amber-300/40 blur-xl" />
          {/* Drifting Clouds */}
          <div className="absolute top-6 -right-6 h-14 w-36 rounded-full bg-white/30 blur-md animate-pulse [animation-duration:8s]" />
          <div className="absolute top-12 right-12 h-10 w-28 rounded-full bg-white/20 blur-sm" />
        </div>
      )}

      {/* 4. OVERCAST CLOUDY */}
      {condition === "cloudy" && (
        <div className="relative size-full bg-gradient-to-br from-slate-500/20 via-slate-600/10 to-transparent">
          <div className="absolute -top-6 left-10 h-24 w-56 rounded-full bg-slate-300/25 blur-xl animate-pulse [animation-duration:7s]" />
          <div className="absolute top-2 -right-8 h-20 w-48 rounded-full bg-slate-400/20 blur-lg" />
        </div>
      )}

      {/* 5. RAIN & SHOWERS */}
      {(condition === "rain" || condition === "drizzle") && (
        <div className="relative size-full bg-gradient-to-b from-sky-900/30 via-slate-800/20 to-transparent overflow-hidden">
          {/* Animated Falling Raindrops */}
          <div className="absolute inset-0 opacity-40">
            <span className="absolute top-0 left-[15%] h-6 w-0.5 rounded-full bg-sky-300 animate-bounce [animation-duration:0.8s]" />
            <span className="absolute top-4 left-[35%] h-8 w-0.5 rounded-full bg-sky-200 animate-bounce [animation-duration:0.6s]" />
            <span className="absolute top-2 left-[55%] h-7 w-0.5 rounded-full bg-sky-300 animate-bounce [animation-duration:0.9s]" />
            <span className="absolute top-6 left-[75%] h-6 w-0.5 rounded-full bg-sky-200 animate-bounce [animation-duration:0.7s]" />
            <span className="absolute top-1 left-[90%] h-8 w-0.5 rounded-full bg-sky-300 animate-bounce [animation-duration:0.85s]" />
          </div>
        </div>
      )}

      {/* 6. HEAVY RAIN & THUNDERSTORMS */}
      {(condition === "heavy-rain" || condition === "thunderstorm") && (
        <div className="relative size-full bg-gradient-to-b from-indigo-950/40 via-slate-900/30 to-transparent overflow-hidden">
          {/* Subtle Thunder Flash */}
          {condition === "thunderstorm" && (
            <div className="absolute inset-0 bg-indigo-200/10 opacity-0 animate-[pulse_4s_ease-in-out_infinite]" />
          )}
          {/* Heavy streaks */}
          <div className="absolute inset-0 opacity-60">
            <span className="absolute -top-2 left-[20%] h-10 w-0.5 rounded-full bg-sky-200 animate-bounce [animation-duration:0.5s]" />
            <span className="absolute top-2 left-[45%] h-12 w-0.5 rounded-full bg-sky-100 animate-bounce [animation-duration:0.4s]" />
            <span className="absolute top-0 left-[70%] h-11 w-0.5 rounded-full bg-sky-200 animate-bounce [animation-duration:0.55s]" />
            <span className="absolute top-3 left-[85%] h-10 w-0.5 rounded-full bg-sky-100 animate-bounce [animation-duration:0.45s]" />
          </div>
        </div>
      )}

      {/* 7. FOG */}
      {condition === "fog" && (
        <div className="relative size-full bg-gradient-to-r from-slate-300/20 via-slate-400/30 to-slate-300/20">
          <div className="absolute inset-x-0 bottom-0 h-28 bg-white/25 blur-2xl animate-pulse [animation-duration:10s]" />
          <div className="absolute inset-x-0 top-4 h-16 bg-slate-200/20 blur-xl" />
        </div>
      )}

      {/* 8. WINDY */}
      {condition === "windy" && (
        <div className="relative size-full bg-gradient-to-br from-teal-500/15 via-sky-400/10 to-transparent">
          <div className="absolute top-10 left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-teal-300/40 to-transparent animate-pulse [animation-duration:2s]" />
          <div className="absolute top-20 left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-sky-200/30 to-transparent animate-pulse [animation-duration:3s]" />
        </div>
      )}
    </div>
  );
};

