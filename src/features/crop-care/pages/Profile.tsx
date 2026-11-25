import { Link } from "@tanstack/react-router";
import {
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  CloudRain,
  Cpu,
  Database,
  Download,
  FileCheck2,
  Globe,
  HardDrive,
  Key,
  Leaf,
  Lock,
  MapPin,
  Moon,
  Palette,
  Shield,
  Smartphone,
  Snowflake,
  Sun,
  Sunrise,
  Trash2,
  Upload,
  User,
  Wind,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCropCare } from "../context";
import { langs, type Lang } from "../i18n";
import { crops, l, type CropKey } from "../knowledge";
import { DownloadAppCard } from "../ui/DownloadAppCard";
import { regions } from "../regions";
import {
  exportEncryptedBackupFile,
  importEncryptedBackupFile,
  storageUsage,
} from "../services/store";
import type { Season, ThemePref } from "../services/types";
import {
  btn,
  btnPrimary,
  btnSecondary,
  card,
  Confirm,
  enter,
  PageHeader,
  Section,
} from "../ui";

export function ProfilePage() {
  const { t, lang, settings, updateSettings, clearData } = useCropCare();

  const [name, setName] = useState(settings.name || "");
  const [customPassphrase, setCustomPassphrase] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const region = regions.find((r) => r.state === settings.state) ?? regions[0]!;

  const handleDetectCurrentLocation = () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      toast.error("Geolocation is not supported on this device/browser");
      return;
    }
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
            { headers: { "User-Agent": "KisanAI-CropCare/1.0" } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const detectedDistrict = addr.state_district || addr.county || addr.city || addr.town || addr.village || "";
            const detectedState = addr.state || "";

            const matchedRegion = regions.find((r) => r.state.toLowerCase() === detectedState.toLowerCase()) || region;
            const matchedDistrict =
              matchedRegion.districts.find((d) => detectedDistrict.toLowerCase().includes(d.toLowerCase())) ||
              detectedDistrict ||
              matchedRegion.districts[0];

            updateSettings({
              state: matchedRegion.state,
              district: matchedDistrict,
            });
            toast.success(`Location set to: ${matchedDistrict}, ${matchedRegion.state}`);
          } else {
            toast.success("GPS coordinates detected successfully");
          }
        } catch {
          toast.info("GPS coordinates retrieved");
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (err) => {
        console.warn("Location error:", err);
        toast.error("Could not access GPS. Please check location permissions.");
        setIsDetectingLocation(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };
  const sizes = storageUsage();
  const totalStorageKb = Math.round(
    Object.values(sizes).reduce((a, b) => a + b, 0) / 1024
  );

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({ name: name.trim() });
    toast.success("Profile updated");
  };

  const toggleCrop = (key: CropKey) => {
    const next = settings.crops.includes(key)
      ? settings.crops.filter((c) => c !== key)
      : [...settings.crops, key];
    if (next.length === 0) {
      toast.error("Please keep at least one active crop");
      return;
    }
    updateSettings({ crops: next });
    toast.success("Crop preferences updated");
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      await exportEncryptedBackupFile(customPassphrase.trim() || undefined);
      toast.success("Encrypted backup downloaded (.cropcare)");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to generate encrypted backup");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const res = await importEncryptedBackupFile(
        text,
        customPassphrase.trim() || undefined
      );
      toast.success(`Backup restored! ${res.scansRestored} scans recovered.`);
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err: unknown) {
      console.error("Import error:", err);
      toast.error(
        "Failed to decrypt backup. Check file integrity or passphrase."
      );
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const seasonOptions: { key: Season; icon: typeof Sun; subtitle: string }[] = [
    { key: "kharif", icon: CloudRain, subtitle: "Monsoon (Jun-Oct)" },
    { key: "rabi", icon: Snowflake, subtitle: "Winter (Nov-Mar)" },
    { key: "zaid", icon: Sun, subtitle: "Summer (Mar-Jun)" },
    { key: "early-kharif", icon: Sunrise, subtitle: "Early Monsoon (May-Jul)" },
    { key: "post-monsoon", icon: Wind, subtitle: "Autumn (Sep-Nov)" },
  ];

  return (
    <div className={cn("space-y-8 pb-12 max-w-2xl mx-auto", enter)}>
      <PageHeader
        eyebrow="Preferences"
        title={t("profileTitle")}
        sub="Manage your farm location, language, active crops and encrypted device storage."
      />

      {/* Farmer Profile Card */}
      <div className={cn(card, "p-6 space-y-4")}>
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
            <User className="size-6" />
          </span>
          <div>
            <h3 className="font-bold text-base text-foreground">
              {settings.name?.trim() ? settings.name : "Farmer Profile"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {settings.district}, {settings.state} · {t(settings.season as any)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveName} className="flex gap-2 pt-1">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("yourName")}
            className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
          <button type="submit" className={cn(btnSecondary, "px-4 text-xs")}>
            Save
          </button>
        </form>
      </div>

      {/* Farm Location & Season Settings */}
      <div className={cn(card, "p-6 space-y-5")}>
        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
          <MapPin className="size-4 text-primary" /> {t("farmSettings")}
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* State */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">
              {t("state")}
            </label>
            <select
              value={settings.state}
              onChange={(e) => {
                const newState = e.target.value;
                const newReg = regions.find((r) => r.state === newState);
                updateSettings({
                  state: newState,
                  district: newReg?.districts[0] ?? "",
                });
                toast.success(t("settingsUpdated"));
              }}
              className="w-full rounded-xl border border-line bg-surface p-2.5 text-sm text-foreground outline-none focus:border-primary"
            >
              {regions.map((r) => (
                <option key={r.state} value={r.state}>
                  {r.state}
                </option>
              ))}
            </select>
          </div>

          {/* District */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">
                {t("district")}
              </label>
              <button
                type="button"
                onClick={handleDetectCurrentLocation}
                disabled={isDetectingLocation}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer disabled:opacity-50"
              >
                <MapPin className="size-3" />
                {isDetectingLocation ? "Detecting GPS..." : "Use Current Location"}
              </button>
            </div>
            <select
              value={settings.district}
              onChange={(e) => {
                updateSettings({ district: e.target.value });
                toast.success(t("settingsUpdated"));
              }}
              className="w-full rounded-xl border border-line bg-surface p-2.5 text-sm text-foreground outline-none focus:border-primary"
            >
              {region.districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Season Selector - Expanded with 5 seasons */}
        <div className="space-y-2 pt-2">
          <label className="text-xs font-semibold text-muted-foreground">
            Agricultural Season ({seasonOptions.length} seasons supported)
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {seasonOptions.map(({ key: s, icon: Icon, subtitle }) => {
              const active = settings.season === s;

              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => updateSettings({ season: s })}
                  className={cn(
                    "flex flex-col gap-1 rounded-xl border p-3 text-left transition-all",
                    active
                      ? "border-primary bg-primary/10 font-bold text-primary ring-1 ring-primary"
                      : "border-line bg-surface hover:border-primary/40 text-muted-foreground"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 shrink-0 text-primary" />
                    <span className="block text-xs font-bold text-foreground">
                      {t(s as any)}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Crops Selection */}
      <div className={cn(card, "p-6 space-y-4")}>
        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
          <Leaf className="size-4 text-primary" /> Active Crops
        </h3>
        <p className="text-xs text-muted-foreground">
          Choose the crops you cultivate to personalise alerts and checks.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {crops.map((c) => {
            const on = settings.crops.includes(c.key);
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => toggleCrop(c.key)}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-3.5 transition-all text-left",
                  on
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-line bg-surface opacity-70"
                )}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={c.closeup}
                    alt=""
                    className="size-10 rounded-lg object-cover"
                  />
                  <div>
                    <span className="block font-bold text-sm text-foreground">
                      {l(lang, c.name)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {t(c.key)}
                    </span>
                  </div>
                </div>

                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full border",
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border"
                  )}
                >
                  {on && <Check className="size-3.5" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Language Selection - All 6 Languages */}
      <div className={cn(card, "p-6 space-y-4")}>
        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
          <Globe className="size-4 text-primary" /> Language / भाषा / భాష / மொழி / ಭಾಷೆ / भाषा
        </h3>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {langs.map((lItem) => {
            const active = settings.lang === lItem.code;
            return (
              <button
                key={lItem.code}
                type="button"
                onClick={() => {
                  updateSettings({ lang: lItem.code });
                  toast.success(t("languageChanged"));
                }}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-3 text-left transition-all",
                  active
                    ? "border-primary bg-primary/10 ring-1 ring-primary font-bold text-primary"
                    : "border-line bg-surface hover:border-primary/40"
                )}
              >
                <div>
                  <span className="block text-sm font-semibold text-foreground">
                    {lItem.native}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {lItem.english}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-muted-foreground">
                  {lItem.short}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Encrypted Internal Storage, Export & Import */}
      <div className={cn(card, "p-6 space-y-5 border-primary/30 bg-primary/5")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/20 text-primary">
              <Shield className="size-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-foreground">
                Encrypted Device Internal Storage
              </h3>
              <p className="text-xs text-muted-foreground">
                AES-GCM 256-bit encryption active · ~{totalStorageKb} KB stored
              </p>
            </div>
          </div>
          <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-[11px] font-bold text-primary">
            AES-256
          </span>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          All your crop photographs, diagnoses, farmer field notes, and chat
          history are stored directly inside this device's sandboxed storage.
          You can create a tamper-evident encrypted backup file to safely export
          or transfer your data across devices.
        </p>

        {/* Optional Custom Passphrase */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Key className="size-3 text-primary" /> Optional Backup Passphrase (leave blank to use device key)
          </label>
          <input
            type="password"
            value={customPassphrase}
            onChange={(e) => setCustomPassphrase(e.target.value)}
            placeholder="Enter passphrase for extra security"
            className="w-full rounded-xl border border-line bg-surface p-2.5 text-xs text-foreground outline-none focus:border-primary"
          />
        </div>

        {/* Backup Actions */}
        <div className="flex flex-wrap gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleExportBackup}
            disabled={isExporting}
            className={cn(btnPrimary, "min-h-10 text-xs px-4 flex items-center gap-1.5")}
          >
            <Download className="size-3.5" />
            {isExporting ? "Exporting..." : "Export Encrypted Backup (.cropcare)"}
          </button>

          <input
            type="file"
            ref={fileInputRef}
            accept=".cropcare,.json"
            onChange={handleImportFile}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className={cn(btnSecondary, "min-h-10 text-xs px-4 flex items-center gap-1.5")}
          >
            <Upload className="size-3.5" />
            {isImporting ? "Importing..." : "Import Encrypted Backup"}
          </button>
        </div>
      </div>

      {/* Official Android Offline APK Download Card */}
      <DownloadAppCard />

      {/* Appearance & Theme */}
      <div className={cn(card, "p-6 space-y-4")}>
        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
          <Palette className="size-4 text-primary" /> Appearance
        </h3>

        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["dark", "Dark", Moon],
              ["light", "Light", Sun],
              ["system", "System", Smartphone],
            ] as const
          ).map(([themeVal, label, Icon]) => {
            const active = settings.theme === themeVal;
            return (
              <button
                key={themeVal}
                type="button"
                onClick={() =>
                  updateSettings({ theme: themeVal as ThemePref })
                }
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all",
                  active
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : "border-line bg-surface text-muted-foreground hover:border-primary/40"
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Data Management & Deletion */}
      <div className={cn(card, "p-6 space-y-4")}>
        <div className="flex items-center gap-2">
          <HardDrive className="size-4 text-muted-foreground" />
          <h3 className="font-bold text-sm text-foreground">
            Clear Local Data
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          <Confirm
            trigger={
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-coral transition-colors"
              >
                <Trash2 className="size-3.5" /> Clear Scan History
              </button>
            }
            title="Clear all scans?"
            body="Deletes all photos and diagnoses stored on this device."
            confirmLabel="Delete scans"
            onConfirm={() => {
              clearData("history");
              toast.success("Scan history cleared");
            }}
          />

          <Confirm
            trigger={
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-coral transition-colors"
              >
                <Trash2 className="size-3.5" /> Reset All App Data
              </button>
            }
            title="Reset all application data?"
            body="Clears all scans, bookmarks, reminders and chat history from this device."
            confirmLabel="Reset all data"
            onConfirm={() => {
              clearData("all");
              toast.success("All local data reset");
            }}
          />
        </div>
      </div>
    </div>
  );
}
