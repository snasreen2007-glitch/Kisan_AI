import * as React from "react";
import { Link } from "@tanstack/react-router";
import { useCropCare } from "../context";
import {
  TrendingUp,
  AlertTriangle,
  Scale,
  DollarSign,
  HelpCircle,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  BarChart2,
} from "lucide-react";

interface YieldLossScenario {
  crop: "rice" | "chilli";
  variety: string;
  expectedYieldPerAcre: number; // Quintals
  mktPricePerQuintal: number; // INR
  severityPct: number; // 0-100%
  stage: "early" | "mid" | "late";
}

export function YieldEstimatorPage(): React.JSX.Element {
  const { scans, t } = useCropCare();

  const [crop, setCrop] = React.useState<"rice" | "chilli">("rice");
  const [acres, setAcres] = React.useState<number>(2.5);
  const [variety, setVariety] = React.useState<string>("BPT 5204 (Samba Mahsuri)");
  const [expectedYieldPerAcre, setExpectedYieldPerAcre] = React.useState<number>(24); // Quintals
  const [mktPricePerQuintal, setMktPricePerQuintal] = React.useState<number>(2320); // MSP Paddy Common approx
  const [severityPct, setSeverityPct] = React.useState<number>(18);
  const [stage, setStage] = React.useState<"early" | "mid" | "late">("mid");

  // Pre-fill from latest scan note if present
  React.useEffect(() => {
    const latest = scans[0];
    if (latest) {
      if (latest.crop === "rice" || latest.crop === "chilli") {
        setCrop(latest.crop);
      }
      if (latest.severity?.areaPercent != null && latest.severity.areaPercent > 0) {
        setSeverityPct(Math.round(latest.severity.areaPercent));
      }
    }
  }, [scans]);

  // Adjust defaults when crop changes
  const handleCropChange = (newCrop: "rice" | "chilli") => {
    setCrop(newCrop);
    if (newCrop === "rice") {
      setVariety("BPT 5204 (Samba Mahsuri)");
      setExpectedYieldPerAcre(24);
      setMktPricePerQuintal(2320);
    } else {
      setVariety("Teja (S17)");
      setExpectedYieldPerAcre(16);
      setMktPricePerQuintal(18500);
    }
  };

  // Empirical agricultural damage calculation curve
  // Late stage damage has slightly lower impact on already filled grains, early stage can wipe out tillering/flowering
  const stageMultipliers = {
    early: 1.15, // High impact on vegetative framework
    mid: 1.0, // Standard grain filling / flowering impact
    late: 0.7, // Grain already formed, partial cosmetic or test weight loss
  };

  const calculatedLossPct = Math.min(
    95,
    Math.round(severityPct * stageMultipliers[stage] * (crop === "rice" ? 0.85 : 0.95)),
  );

  const baselineTotalYield = Number((acres * expectedYieldPerAcre).toFixed(1));
  const estimatedLostYield = Number(((baselineTotalYield * calculatedLossPct) / 100).toFixed(1));
  const harvestYieldAfterLoss = Number((baselineTotalYield - estimatedLostYield).toFixed(1));

  const baselineGrossValue = Math.round(baselineTotalYield * mktPricePerQuintal);
  const directFinancialLoss = Math.round(estimatedLostYield * mktPricePerQuintal);
  const expectedRealization = baselineGrossValue - directFinancialLoss;

  // Preventable loss with timely CIB&RC recommended cultural & biological intervention
  const potentialSavingsWithCare = Math.round(directFinancialLoss * 0.72);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Header */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
              <TrendingUp className="h-3.5 w-3.5" />
              Agronomic Loss & Economic Forecasting
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {t("harvestForecast")}
            </h1>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Correlate visual disease severity percentages with realistic field harvest potential, market price benchmarks, and actionable economic risk mitigation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/diagnose"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 active:scale-95"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Run Vision Scan
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Left Input Configuration */}
        <div className="space-y-4 md:col-span-5">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              1. Farm & Crop Parameters
            </h2>

            {/* Crop toggle */}
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-stone-100 p-1 dark:bg-stone-800">
              <button
                type="button"
                onClick={() => handleCropChange("rice")}
                className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                  crop === "rice"
                    ? "bg-white text-emerald-800 shadow-xs dark:bg-stone-700 dark:text-emerald-400"
                    : "text-stone-600 hover:text-stone-900 dark:text-stone-400"
                }`}
              >
                🌾 Rice / Paddy
              </button>
              <button
                type="button"
                onClick={() => handleCropChange("chilli")}
                className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                  crop === "chilli"
                    ? "bg-white text-rose-800 shadow-xs dark:bg-stone-700 dark:text-rose-400"
                    : "text-stone-600 hover:text-stone-900 dark:text-stone-400"
                }`}
              >
                🌶️ Chilli / Mirchi
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                  Total Farm Area (Acres)
                </label>
                <input
                  type="number"
                  min="0.25"
                  max="200"
                  step="0.25"
                  value={acres}
                  onChange={(e) => setAcres(Math.max(0.1, Number(e.target.value) || 0.1))}
                  className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-800 focus:border-emerald-500 focus:bg-white focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                  Target Variety / Cultivar
                </label>
                <select
                  value={variety}
                  onChange={(e) => setVariety(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-800 focus:border-emerald-500 focus:bg-white focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
                >
                  {crop === "rice" ? (
                    <>
                      <option value="BPT 5204 (Samba Mahsuri)">BPT 5204 (Samba Mahsuri - Fine)</option>
                      <option value="MTU 1010 (Cottondora Sannalu)">MTU 1010 (Cottondora Sannalu)</option>
                      <option value="RNR 15048 (Telangana Sona)">RNR 15048 (Telangana Sona - Low GI)</option>
                      <option value="Swarna (MTU 7029)">Swarna (MTU 7029 - High Biomass)</option>
                    </>
                  ) : (
                    <>
                      <option value="Teja (S17)">Teja S17 (Export Pungent)</option>
                      <option value="Guntur Sannam (S4)">Guntur Sannam S4</option>
                      <option value="Byadagi KDL">Byadagi (High Oleoresin/Color)</option>
                      <option value="Armoor / 334">Armoor 334 (Local Hybrid)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="flex items-center justify-between text-xs font-medium text-stone-700 dark:text-stone-300">
                  <span>Standard Yield Benchmark (Quintals / Acre)</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    {expectedYieldPerAcre} Qtl
                  </span>
                </label>
                <input
                  type="range"
                  min={crop === "rice" ? 12 : 6}
                  max={crop === "rice" ? 36 : 28}
                  step="1"
                  value={expectedYieldPerAcre}
                  onChange={(e) => setExpectedYieldPerAcre(Number(e.target.value))}
                  className="mt-2 w-full accent-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                  Expected APMC / Mandi Price (₹ / Quintal)
                </label>
                <input
                  type="number"
                  step="50"
                  value={mktPricePerQuintal}
                  onChange={(e) => setMktPricePerQuintal(Number(e.target.value) || 0)}
                  className="mt-1.5 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-800 focus:border-emerald-500 focus:bg-white focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                    Growth Stage at Infection
                  </label>
                  <span className="text-[11px] font-mono text-stone-500 capitalize">{stage} stage</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["early", "mid", "late"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStage(s)}
                      className={`rounded-lg py-1.5 text-xs font-medium capitalize transition-all ${
                        stage === s
                          ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                          : "border border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-amber-900 dark:text-amber-300">
                    Vision Scan Severity: {severityPct}%
                  </label>
                  <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                    {severityPct < 10
                      ? "Mild"
                      : severityPct < 25
                        ? "Moderate"
                        : severityPct < 50
                          ? "High"
                          : "Severe"}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="1"
                  value={severityPct}
                  onChange={(e) => setSeverityPct(Number(e.target.value))}
                  className="mt-3 w-full accent-amber-600"
                />
                <p className="mt-1.5 text-[11px] text-amber-800/80 dark:text-amber-400/80">
                  Slide or scan a leaf with KisanAI camera to update lesion density.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Output Calculations */}
        <div className="space-y-4 md:col-span-7">
          {/* Main Key Figures */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center shadow-xs dark:border-stone-800 dark:bg-stone-900">
              <span className="text-[11px] font-medium text-stone-500">Normal Harvest</span>
              <p className="mt-1 font-mono text-xl font-bold text-stone-900 dark:text-stone-100">
                {baselineTotalYield} <span className="text-xs font-normal">Qtl</span>
              </p>
              <p className="mt-0.5 text-[10px] text-stone-400">
                ≈ {Math.round(baselineTotalYield * 1.33)} bags (75kg)
              </p>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-center shadow-xs dark:border-rose-950/40 dark:bg-rose-950/20">
              <span className="text-[11px] font-medium text-rose-700 dark:text-rose-400">
                Projected Yield Loss
              </span>
              <p className="mt-1 font-mono text-xl font-bold text-rose-600 dark:text-rose-400">
                -{estimatedLostYield} <span className="text-xs font-normal">Qtl</span>
              </p>
              <p className="mt-0.5 text-[10px] font-semibold text-rose-700/70 dark:text-rose-400/70">
                {calculatedLossPct}% total loss
              </p>
            </div>

            <div className="col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 text-center shadow-xs sm:col-span-1 dark:border-emerald-950/40 dark:bg-emerald-950/20">
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                Expected Realization
              </span>
              <p className="mt-1 font-mono text-xl font-bold text-emerald-700 dark:text-emerald-300">
                {harvestYieldAfterLoss} <span className="text-xs font-normal">Qtl</span>
              </p>
              <p className="mt-0.5 text-[10px] text-emerald-800/70 dark:text-emerald-400/70">
                Net remaining harvest
              </p>
            </div>
          </div>

          {/* Financial Breakdown Card */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs dark:border-stone-800 dark:bg-stone-900">
            <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900 dark:text-stone-100">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              Direct Financial Risk Analysis
            </h3>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-600 dark:text-stone-400">Standard Gross Revenue (Healthy):</span>
                <span className="font-mono font-semibold text-stone-900 dark:text-stone-200">
                  ₹{baselineGrossValue.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Estimated Financial Loss (If untreated):
                </span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  - ₹{directFinancialLoss.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="h-px bg-stone-200 dark:bg-stone-800" />
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  Net Expected Harvest Revenue:
                </span>
                <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{expectedRealization.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Recovery Window with KisanAI */}
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-emerald-600 p-2 text-white">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                    Recoverable Harvest with Timely Agronomic Action
                  </h4>
                  <p className="mt-1 text-xs text-emerald-800/90 dark:text-emerald-400/90 leading-relaxed">
                    By applying statutory university-recommended bio-fungicides/IPM within the next 48 hours, you can salvage up to <strong>72% of the at-risk crop</strong>, saving an estimated:
                  </p>
                  <p className="mt-2 font-mono text-lg font-bold text-emerald-700 dark:text-emerald-300">
                    + ₹{potentialSavingsWithCare.toLocaleString("en-IN")}{" "}
                    <span className="text-xs font-normal text-emerald-800 dark:text-emerald-400">
                      (≈ {((estimatedLostYield * 0.72)).toFixed(1)} Quintals protected)
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actionable Next Steps */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Recommended Intervention Protocols
            </h4>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Link
                to="/weather"
                className="group flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-3 hover:border-emerald-300 hover:bg-emerald-50/30 dark:border-stone-800 dark:bg-stone-850 dark:hover:border-emerald-900"
              >
                <div>
                  <p className="text-xs font-semibold text-stone-900 dark:text-stone-200">
                    Check Weather Spray Window
                  </p>
                  <p className="text-[11px] text-stone-500">Verify wind & rain before foliar treatment</p>
                </div>
                <ArrowRight className="h-4 w-4 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600" />
              </Link>

              <Link
                to="/calculator"
                className="group flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-3 hover:border-emerald-300 hover:bg-emerald-50/30 dark:border-stone-800 dark:bg-stone-850 dark:hover:border-emerald-900"
              >
                <div>
                  <p className="text-xs font-semibold text-stone-900 dark:text-stone-200">
                    Fertilizer Rebalance
                  </p>
                  <p className="text-[11px] text-stone-500">Reduce Excess Nitrogen to limit blast spread</p>
                </div>
                <ArrowRight className="h-4 w-4 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

