import { Link, useParams } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Eye,
  HelpCircle,
  Info,
  Leaf,
  MessageCircle,
  ScanLine,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useCropCare } from "../context";
import { getTopic, l, type CropKey } from "../knowledge";
import { safetyPrecautions } from "../services/advisory";
import {
  BackButton,
  btn,
  btnPrimary,
  btnSecondary,
  card,
  enter,
  ListCard,
  Notice,
  PageHeader,
  SaveButton,
} from "../ui";

export function TopicDetailPage() {
  const { crop, slug } = useParams({ strict: false }) as {
    crop?: CropKey;
    slug?: string;
  };
  const { t, lang, visitTopic } = useCropCare();

  const topic = crop && slug ? getTopic(crop, slug) : undefined;

  useEffect(() => {
    if (crop && slug && topic) {
      visitTopic(crop, slug);
    }
  }, [crop, slug, topic, visitTopic]);

  if (!topic) {
    return (
      <div className={cn("space-y-6 max-w-lg mx-auto py-12 text-center", enter)}>
        <span className="grid size-16 mx-auto place-items-center rounded-2xl bg-primary/10 text-primary">
          <HelpCircle className="size-8" />
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Topic not found
        </h2>
        <p className="text-sm text-muted-foreground">
          The requested disease or pest is not present in our offline knowledge base.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link to="/library" className={cn(btnPrimary, "min-h-11 px-5")}>
            Back to library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-8 pb-12", enter)}>
      {/* Top Bar with Back and Save */}
      <div className="flex items-center justify-between border-b border-line pb-4">
        <Link
          to="/library"
          className="-ml-2 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {t("navKnowledge")}
        </Link>

        <div className="flex items-center gap-2">
          <SaveButton kind="topic" crop={topic.crop} slug={topic.slug} />
        </div>
      </div>

      {/* Header Overview Card */}
      <div className={cn(card, "p-6 sm:p-8 space-y-4 border-primary/25")}>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider",
              topic.kind === "disease"
                ? "bg-coral/15 text-coral border border-coral/30"
                : "bg-amber/15 text-amber border border-amber/30",
            )}
          >
            {t(topic.crop)} · {t(topic.kind)}
          </span>
          <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted-foreground">
            {topic.parts.join(", ")}
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
            {l(lang, topic.name)}
          </h1>
          <p className="mt-1 font-mono text-sm italic text-muted-foreground">
            {topic.scientific}
          </p>
        </div>

        <p className="text-base leading-relaxed text-muted-foreground">
          {l(lang, topic.summary)}
        </p>

        {/* Action Triggers */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            to="/diagnose"
            search={{ crop: topic.crop, mode: topic.kind }}
            className={cn(btnPrimary, "min-h-11 px-5 text-sm font-bold")}
          >
            <ScanLine className="size-4" /> Diagnose {t(topic.crop)}
          </Link>
          <Link
            to="/assistant"
            className={cn(btnSecondary, "min-h-11 px-5 text-sm font-semibold")}
          >
            <MessageCircle className="size-4" /> Ask AI about this
          </Link>
        </div>
      </div>

      {/* Identification & Symptoms */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* How to identify */}
        <div className={cn(card, "p-6")}>
          <div className="flex items-center gap-2 mb-3">
            <span className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary">
              <Eye className="size-5" />
            </span>
            <h3 className="text-base font-bold text-foreground">
              How to identify in field
            </h3>
          </div>
          <ul className="space-y-2 pl-4 list-disc text-sm leading-relaxed text-muted-foreground">
            {topic.identify.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {/* Symptoms checklist */}
        <div className={cn(card, "p-6")}>
          <div className="flex items-center gap-2 mb-3">
            <span className="grid size-8 place-items-center rounded-lg bg-coral/15 text-coral">
              <Sparkles className="size-5" />
            </span>
            <h3 className="text-base font-bold text-foreground">
              {t("symptoms")}
            </h3>
          </div>
          <ul className="space-y-2 pl-4 list-disc text-sm leading-relaxed text-muted-foreground">
            {topic.symptoms.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Lookalikes / Differential Diagnosis */}
      {topic.lookalikes && (
        <Notice
          tone="info"
          icon={AlertTriangle}
          title="Differential Diagnosis & Lookalikes"
        >
          {topic.lookalikes}
        </Notice>
      )}

      {/* Immediate Actions & Interventions */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className={cn(card, "p-6")}>
          <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle2 className="size-5 text-primary" />
            {t("immediate")}
          </h3>
          <ListCard items={topic.immediate} ordered />
        </div>

        <div className={cn(card, "p-6")}>
          <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
            <Leaf className="size-5 text-primary" />
            {t("intervention")}
          </h3>
          <ListCard items={topic.cultural} />
        </div>
      </div>

      {/* Prevention Strategy Cards */}
      <div className={cn(card, "p-6 space-y-4")}>
        <h3 className="text-lg font-bold text-foreground">
          {t("prevention")}
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {topic.prevention.map((pv) => (
            <div
              key={pv.title}
              className="rounded-xl border border-line bg-surface/50 p-4 text-xs leading-relaxed"
            >
              <h4 className="font-bold text-foreground text-sm">{pv.title}</h4>
              <p className="mt-1 text-muted-foreground">{pv.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Regulatory & Chemical Guidance Notice */}
      <div className="rounded-2xl border border-line bg-surface/50 p-6 space-y-3">
        <div className="flex items-start gap-3">
          <ShieldAlert className="size-5 shrink-0 text-amber mt-0.5" />
          <div>
            <h4 className="font-bold text-foreground text-sm">
              {t("noChemical")}
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t("noChemicalSub")}
            </p>
          </div>
        </div>

        <p className="rounded-xl bg-card p-3 text-xs text-muted-foreground border border-line">
          <span className="font-semibold text-foreground">
            Agricultural Advice:{" "}
          </span>
          {topic.getHelp}
        </p>
      </div>

      {/* 7-Day Monitoring Plan */}
      <div className={cn(card, "p-6")}>
        <h3 className="text-base font-bold text-foreground mb-3">
          {t("monitoring")}
        </h3>
        <ListCard items={topic.monitoring} />
      </div>
    </div>
  );
}
