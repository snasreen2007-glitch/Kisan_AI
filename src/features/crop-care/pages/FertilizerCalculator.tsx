import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Flame,
  Info,
  Layers,
  Leaf,
  Scale,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useCropCare } from "../context";
import type { CropKey } from "../knowledge";
import { PageHeader, card, enter, btnPrimary, btnSecondary } from "../ui";

type GrowthStage = "basal" | "vegetative" | "flowering" | "grain_fruit";

export function FertilizerCalculatorPage() {
  const { t, settings, lang } = useCropCare();

  const [selectedCrop, setSelectedCrop] = useState<CropKey>("rice");
  const [acres, setAcres] = useState<number>(2);
  const [soilType, setSoilType] = useState<"clay" | "loam" | "sandy" | "black">("loam");
  const [growthStage, setGrowthStage] = useState<GrowthStage>("basal");

  // Agronomic balanced calculation (kg per acre based on ANGRAU / ICAR recommendations)
  const isRice = selectedCrop === "rice";

  // Base requirement per acre: N - P2O5 - K2O (kg/acre)
  // Rice: 48 - 24 - 20 kg N-P-K per acre
  // Chilli: 60 - 24 - 48 kg N-P-K per acre
  const totalN = isRice ? 48 * acres : 60 * acres;
  const totalP = 24 * acres;
  const totalK = isRice ? 20 * acres : 48 * acres;

  // Commercial Fertilizer Quantities:
  // DAP supplies 18% N and 46% P2O5. All P applied at basal.
  const dapTotal = Math.round(totalP / 0.46);
  const nSuppliedByDap = Math.round(dapTotal * 0.18);
  const remainingN = Math.max(0, totalN - nSuppliedByDap);
  const ureaTotal = Math.round(remainingN / 0.46);
  const mopTotal = Math.round(totalK / 0.60);
  const zincTotal = isRice ? 10 * acres : 6 * acres;

  // Split calculations based on selected growth stage
  let stageUrea = 0;
  let stageDap = 0;
  let stageMop = 0;
  let stageZinc = 0;
  let stageAdvice = "";

  if (growthStage === "basal") {
    stageDap = dapTotal; // 100% P at basal
    stageUrea = Math.round(ureaTotal * (isRice ? 0.33 : 0.25)); // Initial N
    stageMop = Math.round(mopTotal * 0.50); // 50% K at basal
    stageZinc = zincTotal; // Soil application
    stageAdvice = "Incorporate DAP, Zinc, and 50% Potash into final puddled soil before transplanting.";
  } else if (growthStage === "vegetative") {
    stageUrea = Math.round(ureaTotal * (isRice ? 0.34 : 0.35));
    stageAdvice = "Broadcast Urea in moist soil (not stagnant standing water) to stimulate rapid tillering / vegetative branching.";
  } else if (growthStage === "flowering") {
    stageUrea = Math.round(ureaTotal * (isRice ? 0.33 : 0.25));
    stageMop = Math.round(mopTotal * 0.50); // Remaining 50% K at panicle initiation / fruit set
    stageAdvice = "Apply Potash and final Urea split to promote plump panicle grains and flower retention.";
  } else {
    stageUrea = isRice ? 0 : Math.round(ureaTotal * 0.15);
    stageAdvice = isRice
      ? "No further nitrogen required. Avoid urea during heading to prevent neck blast and grain discoloration."
      : "Light nitrogen maintenance after first picking to support continuous fruiting.";
  }

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
          ANGRAU / ICAR Grounded
        </span>
      </div>

      <PageHeader
        eyebrow="Soil & Plant Nutrition"
        title={t("fertilizerDosage")}
        sub="Calculate precise N-P-K splits, Zinc, and Potash requirements per acre without hazardous chemical hallucinations."
      />

      {/* Input Configuration Card */}
      <div className={cn(card, "p-6 space-y-6")}>
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Crop Switcher */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Select Crop
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedCrop("rice")}
                className={cn(
                  "rounded-xl border p-3 font-bold text-sm transition-all flex items-center justify-center gap-2",
                  selectedCrop === "rice"
                    ? "border-primary bg-primary/15 text-primary ring-1 ring-primary"
                    : "border-line bg-surface text-muted-foreground hover:text-foreground"
                )}
              >
                <Leaf className="size-4" /> Rice (Paddy)
              </button>
              <button
                type="button"
                onClick={() => setSelectedCrop("chilli")}
                className={cn(
                  "rounded-xl border p-3 font-bold text-sm transition-all flex items-center justify-center gap-2",
                  selectedCrop === "chilli"
                    ? "border-primary bg-primary/15 text-primary ring-1 ring-primary"
                    : "border-line bg-surface text-muted-foreground hover:text-foreground"
                )}
              >
                <Flame className="size-4" /> Chilli
              </button>
            </div>
          </div>

          {/* Acreage Slider & Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Cultivated Area
              </label>
              <span className="font-mono text-sm font-bold text-primary">
                {acres} {acres === 1 ? "Acre" : "Acres"}
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={15}
              step={0.5}
              value={acres}
              onChange={(e) => setAcres(parseFloat(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
              <span>0.5 Acre</span>
              <span>5 Acres</span>
              <span>10 Acres</span>
              <span>15 Acres</span>
            </div>
          </div>
        </div>

        {/* Growth Stage Selector */}
        <div className="space-y-2 pt-2 border-t border-line">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Current Crop Growth Stage
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ["basal", "Basal (Transplanting)", "DAP + Zinc + Potash"],
                ["vegetative", isRice ? "Active Tillering" : "Vegetative / Branching", "Urea Split 1"],
                ["flowering", isRice ? "Panicle Initiation" : "Flowering & Fruit Set", "Urea + Potash"],
                ["grain_fruit", isRice ? "Grain Filling / Heading" : "Fruiting & Picking", "Maintenance"],
              ] as const
            ).map(([stageVal, label, sub]) => {
              const active = growthStage === stageVal;
              return (
                <button
                  key={stageVal}
                  type="button"
                  onClick={() => setGrowthStage(stageVal)}
                  className={cn(
                    "flex flex-col gap-1 rounded-xl border p-3 text-left transition-all",
                    active
                      ? "border-primary bg-primary/15 text-primary ring-1 ring-primary font-bold"
                      : "border-line bg-surface hover:border-primary/40 text-muted-foreground"
                  )}
                >
                  <span className="text-xs font-bold text-foreground">{label}</span>
                  <span className="text-[10px] text-muted-foreground">{sub}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Calculated Recommendation Card */}
      <div className={cn(card, "p-6 border-primary/30 bg-gradient-to-br from-card to-primary/5 space-y-6 shadow-sm")}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              Recommended Dose for Current Stage
            </h3>
            <p className="text-xs text-muted-foreground">
              For {acres} {acres === 1 ? "Acre" : "Acres"} of {selectedCrop.toUpperCase()} at {growthStage.toUpperCase()} stage.
            </p>
          </div>
          <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary font-mono self-start sm:self-auto">
            Stage Split
          </span>
        </div>

        {/* 4 Nutrient Bags Display */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Urea */}
          <div className="rounded-2xl border border-line bg-surface/60 p-4 space-y-1">
            <span className="block text-xs font-semibold text-muted-foreground">Urea (46% N)</span>
            <p className="font-mono text-2xl font-extrabold text-foreground">
              {stageUrea} <span className="text-xs font-normal text-muted-foreground">kg</span>
            </p>
            <p className="text-[10px] text-muted-foreground">
              Total season: {ureaTotal} kg
            </p>
          </div>

          {/* DAP */}
          <div className="rounded-2xl border border-line bg-surface/60 p-4 space-y-1">
            <span className="block text-xs font-semibold text-muted-foreground">DAP (18-46-0)</span>
            <p className="font-mono text-2xl font-extrabold text-foreground">
              {stageDap} <span className="text-xs font-normal text-muted-foreground">kg</span>
            </p>
            <p className="text-[10px] text-muted-foreground">
              Total season: {dapTotal} kg
            </p>
          </div>

          {/* MOP (Potash) */}
          <div className="rounded-2xl border border-line bg-surface/60 p-4 space-y-1">
            <span className="block text-xs font-semibold text-muted-foreground">MOP Potash (60% K)</span>
            <p className="font-mono text-2xl font-extrabold text-foreground">
              {stageMop} <span className="text-xs font-normal text-muted-foreground">kg</span>
            </p>
            <p className="text-[10px] text-muted-foreground">
              Total season: {mopTotal} kg
            </p>
          </div>

          {/* Zinc Sulfate */}
          <div className="rounded-2xl border border-line bg-surface/60 p-4 space-y-1">
            <span className="block text-xs font-semibold text-muted-foreground">Zinc Sulfate (21%)</span>
            <p className="font-mono text-2xl font-extrabold text-foreground">
              {stageZinc} <span className="text-xs font-normal text-muted-foreground">kg</span>
            </p>
            <p className="text-[10px] text-muted-foreground">
              Basal soil application
            </p>
          </div>
        </div>

        {/* Stage Specific Field Agronomy Advice */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs leading-relaxed space-y-1">
          <p className="font-bold text-foreground flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-primary" /> Application Guidelines
          </p>
          <p className="text-muted-foreground">{stageAdvice}</p>
        </div>
      </div>

      {/* Visual Guide to Nutrient Deficiencies */}
      <div className={cn(card, "p-6 space-y-4")}>
        <div className="flex items-center gap-2">
          <Layers className="size-5 text-primary" />
          <h3 className="text-base font-bold text-foreground">
            Nutrient Deficiency Diagnostic Markers
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Identify physiological nutritional stress vs pathological diseases.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-surface/50 p-3.5 space-y-1">
            <span className="font-bold text-xs text-foreground">Nitrogen (N) Deficiency</span>
            <p className="text-xs text-muted-foreground">
              Uniform pale yellowing (chlorosis) beginning from older lower leaves progressing upwards.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface/50 p-3.5 space-y-1">
            <span className="font-bold text-xs text-foreground">Potassium (K) Scorching</span>
            <p className="text-xs text-muted-foreground">
              Marginal chlorosis and necrotic tip browning on older leaves; poor root anchoring and lodging.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface/50 p-3.5 space-y-1">
            <span className="font-bold text-xs text-foreground">Zinc (Zn) Khaira Disorder</span>
            <p className="text-xs text-muted-foreground">
              Rusty reddish-brown pigmentation and blotches on third and fourth leaves appearing 2–3 weeks after transplanting.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

