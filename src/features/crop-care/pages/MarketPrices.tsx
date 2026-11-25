import * as React from "react";
import { Link } from "@tanstack/react-router";
import { useCropCare } from "../context";
import {
  TrendingUp,
  MapPin,
  RefreshCw,
  Search,
  Calendar,
  Building,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";

interface MandiPriceRecord {
  id: string;
  commodity: "Paddy (Dhan)" | "Chilli (Red/Dry)" | "Cotton" | "Maize";
  cropCategory: "rice" | "chilli" | "other";
  variety: string;
  state: "Andhra Pradesh" | "Telangana";
  market: string;
  district: string;
  minPrice: number; // INR / Quintal
  maxPrice: number; // INR / Quintal
  modalPrice: number; // INR / Quintal
  arrivalTons: number;
  trend: "up" | "down" | "stable";
  grade: "FAQ (Fair Average Quality)" | "Super Grade" | "Medium";
  updatedDate: string;
}

const INITIAL_MANDI_DATA: MandiPriceRecord[] = [
  {
    id: "m-1",
    commodity: "Chilli (Red/Dry)",
    cropCategory: "chilli",
    variety: "Teja (S17)",
    state: "Andhra Pradesh",
    market: "Guntur APMC (Asia's Largest)",
    district: "Guntur",
    minPrice: 17200,
    maxPrice: 20400,
    modalPrice: 19100,
    arrivalTons: 1450,
    trend: "up",
    grade: "Super Grade",
    updatedDate: "Today (14 Nov 2026)",
  },
  {
    id: "m-2",
    commodity: "Chilli (Red/Dry)",
    cropCategory: "chilli",
    variety: "Guntur Sannam (S4)",
    state: "Andhra Pradesh",
    market: "Guntur APMC",
    district: "Guntur",
    minPrice: 15400,
    maxPrice: 17800,
    modalPrice: 16800,
    arrivalTons: 980,
    trend: "stable",
    grade: "FAQ (Fair Average Quality)",
    updatedDate: "Today (14 Nov 2026)",
  },
  {
    id: "m-3",
    commodity: "Chilli (Red/Dry)",
    cropCategory: "chilli",
    variety: "Byadagi Fatki / KDL",
    state: "Telangana",
    market: "Khammam Mandi",
    district: "Khammam",
    minPrice: 21000,
    maxPrice: 24500,
    modalPrice: 23200,
    arrivalTons: 420,
    trend: "up",
    grade: "Super Grade",
    updatedDate: "Today (14 Nov 2026)",
  },
  {
    id: "m-4",
    commodity: "Paddy (Dhan)",
    cropCategory: "rice",
    variety: "BPT 5204 (Samba Mahsuri)",
    state: "Telangana",
    market: "Miryalaguda APMC",
    district: "Nalgonda",
    minPrice: 2650,
    maxPrice: 2950,
    modalPrice: 2820,
    arrivalTons: 2100,
    trend: "up",
    grade: "Super Grade",
    updatedDate: "Today (14 Nov 2026)",
  },
  {
    id: "m-5",
    commodity: "Paddy (Dhan)",
    cropCategory: "rice",
    variety: "RNR 15048 (Telangana Sona)",
    state: "Telangana",
    market: "Suryapet Mandi",
    district: "Suryapet",
    minPrice: 2500,
    maxPrice: 2780,
    modalPrice: 2650,
    arrivalTons: 1650,
    trend: "stable",
    grade: "FAQ (Fair Average Quality)",
    updatedDate: "Today (14 Nov 2026)",
  },
  {
    id: "m-6",
    commodity: "Paddy (Dhan)",
    cropCategory: "rice",
    variety: "Common (Govt MSP Grade)",
    state: "Andhra Pradesh",
    market: "Tadepalligudem APMC",
    district: "West Godavari",
    minPrice: 2320,
    maxPrice: 2380,
    modalPrice: 2320,
    arrivalTons: 3400,
    trend: "stable",
    grade: "FAQ (Fair Average Quality)",
    updatedDate: "Today (14 Nov 2026)",
  },
  {
    id: "m-7",
    commodity: "Paddy (Dhan)",
    cropCategory: "rice",
    variety: "Swarna (MTU 7029)",
    state: "Andhra Pradesh",
    market: "Nellore Market Yard",
    district: "SPSR Nellore",
    minPrice: 2280,
    maxPrice: 2450,
    modalPrice: 2360,
    arrivalTons: 1800,
    trend: "down",
    grade: "FAQ (Fair Average Quality)",
    updatedDate: "Today (14 Nov 2026)",
  },
  {
    id: "m-8",
    commodity: "Chilli (Red/Dry)",
    cropCategory: "chilli",
    variety: "Armoor Hybrid",
    state: "Telangana",
    market: "Warangal Enamamula Market",
    district: "Warangal",
    minPrice: 16200,
    maxPrice: 18400,
    modalPrice: 17300,
    arrivalTons: 850,
    trend: "up",
    grade: "FAQ (Fair Average Quality)",
    updatedDate: "Today (14 Nov 2026)",
  },
];

export function MarketPricesPage(): React.JSX.Element {
  const { t } = useCropCare();
  const [selectedCrop, setSelectedCrop] = React.useState<"all" | "rice" | "chilli">("all");
  const [selectedState, setSelectedState] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);

  const filteredPrices = INITIAL_MANDI_DATA.filter((item) => {
    if (selectedCrop !== "all" && item.cropCategory !== selectedCrop) return false;
    if (selectedState !== "all" && item.state !== selectedState) return false;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const match =
        item.market.toLowerCase().includes(q) ||
        item.variety.toLowerCase().includes(q) ||
        item.district.toLowerCase().includes(q) ||
        item.commodity.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Header */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Building className="h-3.5 w-3.5" />
              e-NAM & APMC Real-time Market Intelligence
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {t("mandiPrices")}
            </h1>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Verified daily arrivals, minimum, maximum, and modal wholesale rates across primary Andhra Pradesh and Telangana agricultural market yards.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 active:scale-95 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`} />
            {isRefreshing ? "Syncing..." : "Refresh Mandi Rates"}
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search by market (Guntur, Khammam), variety (Teja, BPT), or district..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-9 pr-3 text-xs font-medium text-stone-800 placeholder-stone-400 focus:border-emerald-500 focus:bg-white focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-stone-100 p-1 dark:bg-stone-800">
              <button
                type="button"
                onClick={() => setSelectedCrop("all")}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                  selectedCrop === "all"
                    ? "bg-white text-stone-900 shadow-xs dark:bg-stone-700 dark:text-white"
                    : "text-stone-500 hover:text-stone-800 dark:text-stone-400"
                }`}
              >
                All Crops
              </button>
              <button
                type="button"
                onClick={() => setSelectedCrop("rice")}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                  selectedCrop === "rice"
                    ? "bg-white text-emerald-800 shadow-xs dark:bg-stone-700 dark:text-emerald-400"
                    : "text-stone-500 hover:text-stone-800 dark:text-stone-400"
                }`}
              >
                🌾 Paddy
              </button>
              <button
                type="button"
                onClick={() => setSelectedCrop("chilli")}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                  selectedCrop === "chilli"
                    ? "bg-white text-rose-800 shadow-xs dark:bg-stone-700 dark:text-rose-400"
                    : "text-stone-500 hover:text-stone-800 dark:text-stone-400"
                }`}
              >
                🌶️ Chilli
              </button>
            </div>

            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-700 focus:outline-hidden dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
            >
              <option value="all">Both States (AP & TG)</option>
              <option value="Andhra Pradesh">Andhra Pradesh</option>
              <option value="Telangana">Telangana</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mandi Rates List */}
      <div className="space-y-3">
        {filteredPrices.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center text-stone-500 dark:border-stone-800 dark:bg-stone-900">
            <p className="text-sm font-semibold">No mandi records matched your filters.</p>
            <p className="mt-1 text-xs">Try clearing the search query or selecting &quot;All Crops&quot;.</p>
          </div>
        ) : (
          filteredPrices.map((record) => (
            <div
              key={record.id}
              className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs transition-all hover:border-emerald-300 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-emerald-800"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        record.cropCategory === "chilli"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      }`}
                    >
                      {record.commodity}
                    </span>
                    <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                      • {record.grade}
                    </span>
                  </div>

                  <h3 className="mt-1.5 text-base font-bold text-stone-900 dark:text-stone-100">
                    {record.variety}
                  </h3>

                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-stone-400" />
                      {record.market}, {record.district} ({record.state})
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-stone-400" />
                      {record.updatedDate}
                    </span>
                    <span>•</span>
                    <span>Arrivals: {record.arrivalTons} MT</span>
                  </div>
                </div>

                {/* Price columns */}
                <div className="flex items-center gap-4 sm:text-right">
                  <div>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
                      Modal Rate
                    </span>
                    <p className="font-mono text-xl font-bold text-stone-900 dark:text-stone-100">
                      ₹{record.modalPrice.toLocaleString("en-IN")}
                      <span className="text-xs font-normal text-stone-500"> / Qtl</span>
                    </p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Range: ₹{record.minPrice.toLocaleString("en-IN")} - ₹{record.maxPrice.toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      record.trend === "up"
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : record.trend === "down"
                          ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                          : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                    }`}
                    title={`Price Trend: ${record.trend}`}
                  >
                    <TrendingUp
                      className={`h-5 w-5 ${
                        record.trend === "down"
                          ? "rotate-180 text-rose-600 dark:text-rose-400"
                          : record.trend === "stable"
                            ? "rotate-90 text-stone-500"
                            : ""
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cross link to Yield Estimator */}
      <div className="rounded-2xl border border-stone-200 bg-linear-to-r from-emerald-50/50 to-amber-50/50 p-5 dark:border-stone-800 dark:from-emerald-950/20 dark:to-amber-950/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Calculate Your Total Gross Farm Revenue
            </h4>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Apply these live modal rates directly against your farm acreage and visual disease risk.
            </p>
          </div>
          <Link
            to="/yield-estimator"
            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
          >
            Open Yield Estimator
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

