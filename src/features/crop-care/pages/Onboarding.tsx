import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, CloudRain, Database, History, Snowflake, Sparkles, WifiOff, Cpu } from "lucide-react";
import { useEffect, useState } from "react";
import hero from "@/assets/welcome-hero.jpg";
import { cn } from "@/lib/utils";
import { useCropCare } from "../context";
import { langs } from "../i18n";
import { crops, l, type CropKey } from "../knowledge";
import { regions } from "../regions";
import type { Season } from "../services/types";
import { Logo } from "../shell";
import { btnGhost, btnPrimary, enter, Notice } from "../ui";

const STEPS = 7;

export function OnboardingPage() {
  const { t, settings, updateSettings, lang, ready } = useCropCare();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // If already onboarded, immediately redirect to home and never show again
  useEffect(() => {
    if (ready && settings.onboarded) {
      void navigate({ to: "/" });
    }
  }, [ready, settings.onboarded, navigate]);

  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1));
  const finish = () => {
    updateSettings({ onboarded: true });
    if (typeof window !== "undefined") {
      window.localStorage.setItem("kisanai_welcome_completed", "true");
    }
    void navigate({ to: "/" });
  };
  const region = regions.find((r) => r.state === settings.state) ?? regions[0]!;

  if (step === 0) {
    return (
      <div className="relative flex min-h-dvh flex-col overflow-hidden">
        <img src={hero} alt="Rice terraces and chilli plants at dawn" className="absolute inset-0 size-full object-cover" width={1280} height={1600} />
        <div className="image-scrim absolute inset-0" />
        <div className="absolute -right-20 top-24 size-72 rounded-full bg-primary/20 blur-3xl animate-drift" />
        <div className="relative z-10 p-5 sm:p-8"><Logo /></div>
        <div className={cn("relative z-10 mx-auto mt-auto w-full max-w-xl p-6 pb-10 sm:pb-16", enter)}>
          <span className="on-image inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-xs font-semibold backdrop-blur"><WifiOff className="size-3.5" /> Works without internet</span>
          <h1 className="on-image mt-4 text-4xl font-bold leading-[1.08] tracking-tight text-balance sm:text-5xl">{t("obWelcomeTitle")}</h1>
          <p className="on-image-muted mt-4 text-[17px] leading-relaxed">{t("obWelcomeSub")}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button onClick={next} className={cn(btnPrimary, "w-full sm:w-auto")}>{t("getStarted")} <ArrowRight className="size-5" /></button>
            <button onClick={finish} className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/20 bg-black/40 px-6 text-sm font-semibold text-white backdrop-blur hover:bg-black/60 transition-colors">Skip to Home</button>
          </div>
        </div>
      </div>
    );
  }

  const option = (active: boolean) => cn("flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all active:scale-[0.99]", active ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-line bg-card hover:border-primary/40");
  const tick = (active: boolean) => <span className={cn("ml-auto grid size-6 shrink-0 place-items-center rounded-full border", active ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{active && <Check className="size-4" />}</span>;

  const screens: { title: string; sub: string; body: React.ReactNode }[] = [
    { title: "", sub: "", body: null },
    {
      title: t("obLangTitle"), sub: t("obLangSub"),
      body: <div className="space-y-3">{langs.map((x) => (
        <button key={x.code} onClick={() => updateSettings({ lang: x.code })} className={option(settings.lang === x.code)}>
          <span className="grid size-12 place-items-center rounded-xl bg-surface text-lg font-bold">{x.short}</span>
          <span><span className="block text-xl font-semibold">{x.native}</span><span className="text-sm text-muted-foreground">{x.english}</span></span>{tick(settings.lang === x.code)}
        </button>))}</div>,
    },
    {
      title: t("obDistrictTitle"), sub: t("obDistrictSub"),
      body: <div className="space-y-5">
        <div><p className="mb-2 text-sm font-semibold">{t("state")}</p><div className="grid grid-cols-2 gap-2">{regions.map((r) => (
          <button key={r.state} onClick={() => updateSettings({ state: r.state, district: r.districts[0]! })} className={cn(option(settings.state === r.state), "justify-center p-3 text-center font-semibold")}>{r.state}</button>))}</div></div>
        <div><p className="mb-2 text-sm font-semibold">{t("district")}</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{region.districts.map((d) => (
          <button key={d} onClick={() => updateSettings({ district: d })} className={cn(option(settings.district === d), "min-h-12 justify-center p-2 text-center text-sm font-medium")}>{d}</button>))}</div></div>
        <Notice tone="warn">{t("recordsPending")}</Notice>
      </div>,
    },
    {
      title: t("obSeasonTitle"), sub: t("obSeasonSub"),
      body: <div className="grid gap-3 sm:grid-cols-2">{(["kharif", "rabi"] as Season[]).map((s) => {
        const Icon = s === "kharif" ? CloudRain : Snowflake;
        return (<button key={s} onClick={() => updateSettings({ season: s })} className={cn(option(settings.season === s), "flex-col items-start p-5")}>
          <span className="flex w-full items-center"><span className="grid size-12 place-items-center rounded-xl bg-primary/12 text-primary"><Icon className="size-6" /></span>{tick(settings.season === s)}</span>
          <span className="mt-3 text-xl font-semibold">{t(s)}</span><span className="text-sm text-muted-foreground">{t(s === "kharif" ? "kharifHint" : "rabiHint")}</span>
        </button>);
      })}</div>,
    },
    {
      title: t("obCropsTitle"), sub: t("obCropsSub"),
      body: <div className="grid gap-3 sm:grid-cols-2">{crops.map((c) => {
        const on = settings.crops.includes(c.key);
        const toggle = () => { const n: CropKey[] = on ? settings.crops.filter((k) => k !== c.key) : [...settings.crops, c.key]; if (n.length) updateSettings({ crops: n }); };
        return (<button key={c.key} onClick={toggle} aria-pressed={on} className={cn("relative overflow-hidden rounded-2xl border text-left transition-all", on ? "border-primary ring-1 ring-primary" : "border-line opacity-70")}>
          <img src={c.closeup} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" width={1024} height={1024} />
          <span className="image-scrim absolute inset-0" />
          <span className="absolute inset-x-0 bottom-0 flex items-center p-4"><span className="on-image text-2xl font-bold">{l(lang, c.name)}</span>{tick(on)}</span>
        </button>);
      })}</div>,
    },
    {
      title: t("obOfflineTitle"), sub: t("obOfflineSub"),
      body: <div className="space-y-3">
        {([[Cpu, "obOff1"], [Database, "obOff2"], [History, "obOff3"], [WifiOff, "obOff4"]] as const).map(([Icon, k]) => (
          <div key={k} className="flex items-center gap-4 rounded-2xl border border-line bg-card p-4"><span className="grid size-11 place-items-center rounded-xl bg-primary/12 text-primary"><Icon className="size-5" /></span><span className="font-medium">{t(k)}</span></div>))}
        <Notice>{t("obOfflineNote")}</Notice>
      </div>,
    },
    {
      title: t("obReadyTitle"), sub: t("obReadySub"),
      body: <div className="space-y-4">
        <div className="flex flex-col items-center rounded-3xl border border-line bg-card p-8 text-center hero-glow">
          <span className="grid size-16 place-items-center rounded-2xl bg-primary text-primary-foreground animate-in zoom-in duration-500"><Sparkles className="size-7" /></span>
          <p className="mt-4 text-lg font-semibold">{settings.district}, {settings.state}</p>
          <p className="text-sm text-muted-foreground">{t(settings.season)} · {settings.crops.map((c) => t(c)).join(" · ")} · {langs.find((x) => x.code === settings.lang)?.native}</p>
        </div>
        <label className="block"><span className="mb-2 block text-sm font-semibold">{t("yourName")}</span>
          <input value={settings.name} onChange={(e) => updateSettings({ name: e.target.value.slice(0, 40) })} className="h-12 w-full rounded-xl border border-border bg-card px-4 outline-none focus:border-primary" /></label>
      </div>,
    },
  ];
  const s = screens[step]!;

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 pb-8 pt-5">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep(step - 1)} className={cn(btnGhost, "min-h-10 px-3")}>{t("back")}</button>
        <div className="flex flex-1 gap-1.5" aria-label={`Step ${step} of ${STEPS - 1}`}>{Array.from({ length: STEPS - 1 }, (_, i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i < step ? "bg-primary" : "bg-muted")} />)}</div>
        {step < STEPS - 1 && <button onClick={() => setStep(STEPS - 1)} className={cn(btnGhost, "min-h-10 px-3")}>{t("skip")}</button>}
      </div>
      <div key={step} className={cn("mt-8 flex-1", enter)}>
        <h1 className="text-3xl font-bold tracking-tight text-balance">{s.title}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{s.sub}</p>
        <div className="mt-7">{s.body}</div>
      </div>
      <button onClick={step === STEPS - 1 ? finish : next} className={cn(btnPrimary, "mt-8 w-full")}>{step === STEPS - 1 ? t("exploreApp") : t("continue")} <ArrowRight className="size-5" /></button>
    </div>
  );
}
