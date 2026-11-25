import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Cpu,
  HelpCircle,
  Leaf,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useCropCare } from "../context";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BackButton,
  btn,
  btnPrimary,
  btnSecondary,
  card,
  enter,
  PageHeader,
  Section,
} from "../ui";

export function HelpPage() {
  const { t } = useCropCare();

  const faqs = [
    {
      id: "photos",
      q: "How should I take photos for accurate crop diagnosis?",
      a: "Keep the affected plant part (leaf, fruit, panicle) centered in the frame. Avoid harsh direct sun glares or deep shadows. Hold the phone steady so veins and spot margins are sharp. Include a little surrounding healthy tissue to provide natural contrast.",
    },
    {
      id: "pesticides",
      q: "Why doesn't the assistant show exact pesticide dosages or brand names?",
      a: "Under Indian agricultural regulations (CIB&RC), chemical crop protection recommendations must match verified regional registrations for your specific crop and district. Until verified local records are installed, the app provides cultural controls, preventive practices and safety advice, advising consultation with your local Agricultural Officer or Krishi Vigyan Kendra (KVK).",
    },
    {
      id: "offline",
      q: "Does this app send my farm photos to cloud servers?",
      a: "No. The app is engineered offline-first. Your scan photos, severity ratings, notes and messages remain entirely on your device's local storage. No farm images are uploaded to external cloud endpoints.",
    },
    {
      id: "severity",
      q: "How is disease severity calculated?",
      a: "For rice, diseases like blast and brown spot are evaluated against the internationally recognized IRRI Standard Evaluation System (SES) 0–9 scale. For chilli leaf curl, a 0–4 leaf curl index is used. For other leaf spots, the visible percentage of necrotic tissue is assessed into mild, moderate or severe bands.",
    },
    {
      id: "sample",
      q: "What does the 'Sample result' badge mean?",
      a: "The web preview allows you to test image quality checks, library guides and the diagnostic workflow without native on-device neural runtimes. Sample results show the exact interface and format that the native Android app produces when running the on-device MobileNetV3 models.",
    },
  ];

  return (
    <div className={cn("space-y-6 pb-12 max-w-2xl mx-auto", enter)}>
      <div className="border-b border-line pb-4">
        <Link
          to="/"
          className="-ml-2 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Home
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t("navHelp")}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Field guidance, image quality standards and agricultural safety principles.
        </p>
      </div>

      {/* Accordion FAQ */}
      <div className={cn(card, "p-5")}>
        <Accordion type="single" collapsible className="w-full divide-y divide-line">
          {faqs.map((f) => (
            <AccordionItem key={f.id} value={f.id} className="border-none py-2">
              <AccordionTrigger className="text-left font-bold text-sm text-foreground hover:text-primary hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-xs leading-relaxed text-muted-foreground pt-1 pb-3">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Agricultural Extension Helpline Card */}
      <div className={cn(card, "p-6 space-y-3 border-primary/30 bg-card")}>
        <div className="flex items-center gap-2 text-primary font-bold text-sm">
          <ShieldCheck className="size-5" /> Need Direct Agricultural Assistance?
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Contact your local Krishi Vigyan Kendra (KVK) or district agricultural
          department when crop symptoms spread quickly, weather stress threatens
          yield, or prior to any major chemical application.
        </p>
        <div className="pt-2">
          <Link
            to="/diagnose"
            className={cn(btnPrimary, "min-h-10 px-4 text-xs font-bold")}
          >
            Start a new diagnosis
          </Link>
        </div>
      </div>
    </div>
  );
}
