/**
 * Weather Service Architecture:
 * - Domain Types
 * - WMO Weather Code Mapper & Conditions
 * - Agricultural Insight Engine (Spraying, Irrigation, Disease, Heat/Cold)
 * - Open-Meteo Live API Client
 * - Offline Storage Cache with Stale-While-Revalidate
 * - Geolocation & Reverse Geocoding
 */

export type WeatherConditionKey =
  | "sunny"
  | "clear-night"
  | "partly-cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "heavy-rain"
  | "thunderstorm"
  | "windy";

export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  condition: WeatherConditionKey;
  conditionLabel: string;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  cloudCover: number;
  precipitation: number;
  uvIndex: number;
  isDay: boolean;
  timestamp: string;
}

export interface HourlyForecast {
  time: string; // e.g. "06:00 AM"
  timestamp: string;
  temperature: number;
  condition: WeatherConditionKey;
  precipitationProb: number;
  precipitation: number;
}

export interface DailyForecast {
  date: string; // e.g. "Thu, Nov 20"
  minTemp: number;
  maxTemp: number;
  condition: WeatherConditionKey;
  conditionLabel: string;
  precipitationProb: number;
}

export interface AgriculturalInsight {
  id: string;
  category: "spraying" | "irrigation" | "disease-risk" | "heat-stress" | "harvest";
  level: "optimal" | "advisory" | "warning";
  title: string;
  message: string;
  iconName: string;
}

export interface WeatherData {
  locationName: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  isLive: boolean;
  lastUpdated: string;
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  insights: AgriculturalInsight[];
}

const CACHE_KEY = "kisanai_weather_cache_v2";

/**
 * WMO Weather Code to Condition Key and Descriptive Text
 */
export function mapWmoCodeToCondition(code: number, isDay = true): { condition: WeatherConditionKey; label: string } {
  switch (code) {
    case 0:
      return { condition: isDay ? "sunny" : "clear-night", label: isDay ? "Sunny & Clear" : "Clear Sky" };
    case 1:
    case 2:
      return { condition: "partly-cloudy", label: "Partly Cloudy" };
    case 3:
      return { condition: "cloudy", label: "Overcast Clouds" };
    case 45:
    case 48:
      return { condition: "fog", label: "Fog / Dew Fog" };
    case 51:
    case 53:
    case 55:
      return { condition: "drizzle", label: "Light Drizzle" };
    case 61:
    case 63:
      return { condition: "rain", label: "Rain Showers" };
    case 65:
    case 80:
    case 81:
    case 82:
      return { condition: "heavy-rain", label: "Heavy Rainfall" };
    case 95:
    case 96:
    case 99:
      return { condition: "thunderstorm", label: "Thunderstorms" };
    default:
      return { condition: isDay ? "sunny" : "clear-night", label: "Fair Weather" };
  }
}

/**
 * Generates verified smart agricultural insights based on real meteorological variables
 */
export function generateAgriculturalInsights(current: CurrentWeather, hourly: HourlyForecast[]): AgriculturalInsight[] {
  const insights: AgriculturalInsight[] = [];
  const next12hRainProb = Math.max(...hourly.slice(0, 12).map((h) => h.precipitationProb || 0), 0);

  // 1. Spray Suitability (Wind & Rain)
  if (current.windSpeed > 18 || next12hRainProb > 40) {
    insights.push({
      id: "spray-caution",
      category: "spraying",
      level: "warning",
      title: "Field Spraying Not Recommended",
      message: `Wind speed is ${Math.round(current.windSpeed)} km/h with ${next12hRainProb}% rain probability in next 12 hours. High droplet drift and foliar wash-off hazard.`,
      iconName: "Wind",
    });
  } else if (current.windSpeed <= 12 && current.temperature < 32 && next12hRainProb < 20) {
    insights.push({
      id: "spray-optimal",
      category: "spraying",
      level: "optimal",
      title: "Optimal Spray Window Active",
      message: "Gentle winds (< 12 km/h) and moderate temperature. Excellent leaf absorption with minimal evaporation lift.",
      iconName: "CheckCircle2",
    });
  }

  // 2. Irrigation Scheduling (Rain & Humidity)
  if (next12hRainProb >= 50 || current.precipitation > 2.0) {
    insights.push({
      id: "irrigation-postpone",
      category: "irrigation",
      level: "advisory",
      title: "Hold Off Routine Irrigation",
      message: `Imminent rainfall (${next12hRainProb}% chance). Delay pump irrigation to prevent root hypoxia and waterlogging in low-lying bunds.`,
      iconName: "CloudRain",
    });
  } else if (current.temperature > 34 && current.humidity < 40) {
    insights.push({
      id: "irrigation-required",
      category: "irrigation",
      level: "warning",
      title: "High Evapotranspiration Rate",
      message: `High ambient temperature (${Math.round(current.temperature)}°C) and low humidity (${current.humidity}%). Monitor root-zone moisture; apply light evening irrigation.`,
      iconName: "Droplets",
    });
  }

  // 3. Fungal & Bacterial Microclimate Risk (Dew & Humidity)
  if (current.humidity >= 80 && current.temperature >= 20 && current.temperature <= 28) {
    insights.push({
      id: "disease-spore-risk",
      category: "disease-risk",
      level: "warning",
      title: "Elevated Fungal Spore Spread Risk",
      message: `High relative humidity (${current.humidity}%) and warm nights promote spore germination of Rice Blast and Chilli Anthracnose. Scout field edges.`,
      iconName: "AlertTriangle",
    });
  }

  // 4. Solar Radiation / Heat Stress
  if (current.uvIndex >= 8 || current.temperature >= 37) {
    insights.push({
      id: "heat-stress",
      category: "heat-stress",
      level: "advisory",
      title: "Intense Solar UV & Thermal Stress",
      message: `UV Index is ${current.uvIndex.toFixed(1)} (Very High). Ensure seedling nurseries have adequate soil dampness; avoid manual transplanting during peak hours.`,
      iconName: "Sun",
    });
  }

  return insights;
}

/**
 * Service to fetch, cache, and manage real weather data
 */
export class LiveWeatherService {
  private static instance: LiveWeatherService;

  public static getInstance(): LiveWeatherService {
    if (!LiveWeatherService.instance) {
      LiveWeatherService.instance = new LiveWeatherService();
    }
    return LiveWeatherService.instance;
  }

  public getCachedWeather(): WeatherData | null {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(CACHE_KEY);
      if (!saved) return null;
      const data = JSON.parse(saved) as WeatherData;
      data.isLive = false; // mark as cached until fresh data loaded
      return data;
    } catch {
      return null;
    }
  }

  public saveToCache(data: WeatherData): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Failed to cache weather data:", e);
    }
  }

  /**
   * Fetches real weather from Open-Meteo for given coordinates
   */
  public async fetchLiveWeather(
    lat: number,
    lon: number,
    locationName = "Your Farm Location",
    district = "",
    state = ""
  ): Promise<WeatherData> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,uv_index,is_day&hourly=temperature_2m,precipitation_probability,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      throw new Error(`Open-Meteo HTTP ${res.status}`);
    }

    const json = await res.json();
    const curr = json.current;
    const isDay = curr.is_day === 1;
    const { condition, label } = mapWmoCodeToCondition(curr.weather_code, isDay);

    const current: CurrentWeather = {
      temperature: Math.round(curr.temperature_2m),
      feelsLike: Math.round(curr.apparent_temperature),
      condition,
      conditionLabel: label,
      humidity: Math.round(curr.relative_humidity_2m),
      windSpeed: Math.round(curr.wind_speed_10m),
      windDirection: Math.round(curr.wind_direction_10m),
      cloudCover: Math.round(curr.cloud_cover),
      precipitation: curr.precipitation || 0,
      uvIndex: curr.uv_index || 0,
      isDay,
      timestamp: curr.time,
    };

    // Parse Hourly (Next 24 hours)
    const hourly: HourlyForecast[] = [];
    const hourlyTimes = json.hourly?.time || [];
    const nowIso = new Date().toISOString();
    let count = 0;
    for (let i = 0; i < hourlyTimes.length && count < 24; i++) {
      const hTimeStr = hourlyTimes[i];
      if (hTimeStr >= nowIso.slice(0, 13) || count > 0) {
        const d = new Date(hTimeStr);
        const timeFmt = d.toLocaleTimeString([], { hour: "numeric", hour12: true });
        const code = json.hourly.weather_code[i];
        const hCond = mapWmoCodeToCondition(code, d.getHours() >= 6 && d.getHours() < 18).condition;
        hourly.push({
          time: count === 0 ? "Now" : timeFmt,
          timestamp: hTimeStr,
          temperature: Math.round(json.hourly.temperature_2m[i]),
          condition: hCond,
          precipitationProb: Math.round(json.hourly.precipitation_probability[i] || 0),
          precipitation: json.hourly.precipitation[i] || 0,
        });
        count++;
      }
    }

    // Fallback: If no future hours found in timezone window, take first available hours
    if (hourly.length === 0 && hourlyTimes.length > 0) {
      for (let i = 0; i < hourlyTimes.length && i < 24; i++) {
        const hTimeStr = hourlyTimes[i];
        const d = new Date(hTimeStr);
        const timeFmt = d.toLocaleTimeString([], { hour: "numeric", hour12: true });
        const code = json.hourly.weather_code?.[i] ?? 0;
        const hCond = mapWmoCodeToCondition(code, d.getHours() >= 6 && d.getHours() < 18).condition;
        hourly.push({
          time: i === 0 ? "Now" : timeFmt,
          timestamp: hTimeStr,
          temperature: Math.round(json.hourly.temperature_2m[i]),
          condition: hCond,
          precipitationProb: Math.round(json.hourly.precipitation_probability?.[i] || 0),
          precipitation: json.hourly.precipitation?.[i] || 0,
        });
      }
    }

    // Parse Daily (Next 7 days)
    const daily: DailyForecast[] = [];
    const dailyDates = json.daily?.time || [];
    for (let j = 0; j < dailyDates.length && j < 7; j++) {
      const dateObj = new Date(dailyDates[j]);
      const dateStr = j === 0 ? "Today" : dateObj.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
      const dCode = json.daily.weather_code[j];
      const dCond = mapWmoCodeToCondition(dCode, true);
      daily.push({
        date: dateStr,
        minTemp: Math.round(json.daily.temperature_2m_min[j]),
        maxTemp: Math.round(json.daily.temperature_2m_max[j]),
        condition: dCond.condition,
        conditionLabel: dCond.label,
        precipitationProb: Math.round(json.daily.precipitation_probability_max[j] || 0),
      });
    }

    const insights = generateAgriculturalInsights(current, hourly);

    const payload: WeatherData = {
      locationName,
      district: district || locationName,
      state,
      latitude: lat,
      longitude: lon,
      isLive: true,
      lastUpdated: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      current,
      hourly,
      daily,
      insights,
    };

    this.saveToCache(payload);
    return payload;
  }

  /**
   * Geocodes district/city name to coordinates
   */
  public async searchLocation(query: string): Promise<{ name: string; admin1: string; lat: number; lon: number } | null> {
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      const data = await res.json();
      const first = data.results?.[0];
      if (!first) return null;
      return {
        name: first.name,
        admin1: first.admin1 || "",
        lat: first.latitude,
        lon: first.longitude,
      };
    } catch {
      return null;
    }
  }
}

export const liveWeatherService = LiveWeatherService.getInstance();

