import { Link } from "@tanstack/react-router";
import {
  Calendar,
  ChevronRight,
  Filter,
  Grid,
  History,
  LayoutGrid,
  List,
  RotateCcw,
  ScanLine,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useCropCare } from "../context";
import { crops, l, type CropKey } from "../knowledge";
import type { Band } from "../services/types";
import {
  btn,
  btnPrimary,
  btnSecondary,
  card,
  Chip,
  Confirm,
  EmptyState,
  enter,
  PageHeader,
  ScanRow,
  Section,
} from "../ui";

export function HistoryPage() {
  const { t, lang, scans, clearData } = useCropCare();

  const [selectedCrop, setSelectedCrop] = useState<CropKey | "all">("all");
  const [selectedBand, setSelectedBand] = useState<Band | "all">("all");
  const [isGrid, setIsGrid] = useState(false);

  const filteredScans = useMemo(() => {
    return scans.filter((s) => {
      if (selectedCrop !== "all" && s.crop !== selectedCrop) return false;
      if (selectedBand !== "all" && s.severity?.band !== selectedBand)
        return false;
      return true;
    });
  }, [scans, selectedCrop, selectedBand]);

  return (
    <div className={cn("space-y-6 pb-12", enter)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t("navHistory")}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {scans.length} scans saved on this device · private and offline
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-xl border border-line bg-card p-1">
            <button
              type="button"
              onClick={() => setIsGrid(false)}
              className={cn(
                "rounded-lg p-1.5 text-xs font-semibold transition-colors",
                !isGrid
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="List view"
            >
              <List className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsGrid(true)}
              className={cn(
                "rounded-lg p-1.5 text-xs font-semibold transition-colors",
                isGrid
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="size-4" />
            </button>
          </div>

          {/* Clear history */}
          {scans.length > 0 && (
            <Confirm
              trigger={
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-coral/50 hover:text-coral transition-colors"
                >
                  <Trash2 className="size-3.5" /> Clear all
                </button>
              }
              title="Clear all scan history?"
              body="All saved scans and photos will be permanently deleted from this device. This cannot be undone."
              confirmLabel="Clear all scans"
              onConfirm={() => clearData("history")}
            />
          )}
        </div>
      </div>

      {/* Filters Bar */}
      {scans.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Chip
              active={selectedCrop === "all"}
              onClick={() => setSelectedCrop("all")}
            >
              All Crops ({scans.length})
            </Chip>
            {crops.map((c) => {
              const count = scans.filter((s) => s.crop === c.key).length;
              return (
                <Chip
                  key={c.key}
                  active={selectedCrop === c.key}
                  onClick={() => setSelectedCrop(c.key)}
                >
                  {l(lang, c.name)} ({count})
                </Chip>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Chip
              active={selectedBand === "all"}
              onClick={() => setSelectedBand("all")}
            >
              All Severities
            </Chip>
            <Chip
              active={selectedBand === "mild"}
              onClick={() => setSelectedBand("mild")}
            >
              <span className="inline-flex items-center gap-1.5 text-leaf">
                <span className="size-2 rounded-full bg-leaf" />
                {t("mild")}
              </span>
            </Chip>
            <Chip
              active={selectedBand === "moderate"}
              onClick={() => setSelectedBand("moderate")}
            >
              <span className="inline-flex items-center gap-1.5 text-amber">
                <span className="size-2 rounded-full bg-amber" />
                {t("moderate")}
              </span>
            </Chip>
            <Chip
              active={selectedBand === "severe"}
              onClick={() => setSelectedBand("severe")}
            >
              <span className="inline-flex items-center gap-1.5 text-coral">
                <span className="size-2 rounded-full bg-coral" />
                {t("severe")}
              </span>
            </Chip>
          </div>
        </div>
      )}

      {/* Scans List / Grid */}
      {filteredScans.length > 0 ? (
        <div
          className={cn(
            isGrid
              ? "grid grid-cols-2 gap-3 sm:grid-cols-3"
              : "space-y-3",
          )}
        >
          {filteredScans.map((scan) => (
            <ScanRow key={scan.id} scan={scan} grid={isGrid} />
          ))}
        </div>
      ) : scans.length > 0 ? (
        <EmptyState
          icon={Filter}
          title="No scans match these filters"
          body="Try resetting your crop or severity filters to see all your saved scans."
          action={
            <button
              type="button"
              onClick={() => {
                setSelectedCrop("all");
                setSelectedBand("all");
              }}
              className={cn(btnPrimary, "min-h-11 px-5")}
            >
              Reset filters
            </button>
          }
        />
      ) : (
        <EmptyState
          icon={History}
          title={t("noScans")}
          body={t("noScansSub")}
          action={
            <Link to="/diagnose" className={cn(btnPrimary, "min-h-11 px-5")}>
              <ScanLine className="size-4" /> {t("diagnoseCrop")}
            </Link>
          }
        />
      )}
    </div>
  );
}
