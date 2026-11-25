import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  ExternalLink,
  HardDrive,
  Info,
  Layers,
  ShieldCheck,
  Smartphone,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useCropCare } from "../context";
import { getModelStatus } from "../services/models";
import type { ModelStatusItem } from "../services/types";
import {
  BackButton,
  btn,
  btnPrimary,
  btnSecondary,
  card,
  enter,
  Notice,
  PageHeader,
  Section,
} from "../ui";

export function OfflineStatusPage() {
  const { t, online } = useCropCare();
  const [items, setItems] = useState<ModelStatusItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getModelStatus()
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className={cn("space-y-6 pb-12 max-w-2xl mx-auto", enter)}>
      <div className="border-b border-line pb-4">
        <Link
          to="/profile"
          className="-ml-2 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to Profile
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Offline & Model Status
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Real-time telemetry of on-device neural runtimes, local database and offline storage.
        </p>
      </div>

      {/* Online / Offline Network Banner */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border p-4 text-xs font-medium leading-relaxed",
          online
            ? "border-primary/30 bg-primary/10 text-foreground"
            : "border-amber/30 bg-amber/10 text-amber",
        )}
      >
        {online ? (
          <Wifi className="size-5 text-primary shrink-0" />
        ) : (
          <WifiOff className="size-5 text-amber shrink-0" />
        )}
        <div>
          <p className="font-bold text-sm">
            {online ? "Internet Connected" : "Currently Offline"}
          </p>
          <p className="text-muted-foreground">
            {online
              ? "All field guides, saved history and mathematical checks operate without sending photos to cloud servers."
              : "No connection detected. Your offline field guide and scan history remain fully accessible."}
          </p>
        </div>
      </div>

      {/* Engine & Model Status Items */}
      <Section title="Runtime & Component Telemetry">
        <div className="space-y-3">
          {items.map((item) => {
            const isInstalled = item.state === "installed";
            const isUnavailable = item.state === "unavailable";

            return (
              <div
                key={item.id}
                className={cn(
                  card,
                  "p-4 flex items-start justify-between gap-3 transition-all",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-xl",
                      isInstalled
                        ? "bg-primary/15 text-primary"
                        : "bg-surface text-muted-foreground",
                    )}
                  >
                    {item.id === "database" ? (
                      <Database className="size-5" />
                    ) : (
                      <Cpu className="size-5" />
                    )}
                  </span>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-foreground">
                        {item.label}
                      </h4>
                      {item.version && (
                        <span className="font-mono text-[10px] rounded bg-surface px-1.5 py-0.5 text-muted-foreground">
                          v{item.version}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.detail}
                    </p>
                  </div>
                </div>

                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider shrink-0",
                    isInstalled
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-surface text-muted-foreground border border-line",
                  )}
                >
                  {isInstalled ? "Ready" : "Web Preview"}
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Architecture Explanation Card */}
      <div className={cn(card, "p-6 space-y-3")}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <h3 className="font-bold text-sm text-foreground">
            How Offline Crop Care Works
          </h3>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          In the upcoming Android app, MobileNetV3 disease vision models and a
          quantized 4-bit Llama 3.2 1B Instruct assistant run strictly inside
          device memory via ExecuTorch. In this web preview, agricultural
          knowledge, image quality verification and scan history operate 100%
          client-side in your browser.
        </p>
      </div>
    </div>
  );
}
