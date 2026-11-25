import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  Bookmark,
  ChevronRight,
  FileText,
  Leaf,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCropCare } from "../context";
import { getTopic, l } from "../knowledge";
import {
  btnPrimary,
  btnSecondary,
  card,
  Chip,
  EmptyState,
  enter,
  fmtDate,
  PageHeader,
  ScanRow,
} from "../ui";

export function SavedPage() {
  const { t, lang, saved, scans, removeSaved } = useCropCare();
  const [filter, setFilter] = useState<"all" | "topic" | "report">("all");

  const filteredItems = saved.filter((item) => {
    if (filter === "topic") return item.kind === "topic";
    if (filter === "report") return item.kind === "report";
    return true;
  });

  return (
    <div className={cn("space-y-6 pb-12", enter)}>
      <PageHeader
        eyebrow="Saved Collection"
        title={t("navSaved")}
        sub="Field guides and reports pinned for quick offline access."
      />

      {saved.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>
            {t("all")} ({saved.length})
          </Chip>
          <Chip active={filter === "topic"} onClick={() => setFilter("topic")}>
            Topics ({saved.filter((i) => i.kind === "topic").length})
          </Chip>
          <Chip
            active={filter === "report"}
            onClick={() => setFilter("report")}
          >
            Reports ({saved.filter((i) => i.kind === "report").length})
          </Chip>
        </div>
      )}

      {filteredItems.length > 0 ? (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            if (item.kind === "topic" && item.slug) {
              const topic = getTopic(item.crop, item.slug);
              if (!topic) return null;

              return (
                <div
                  key={item.id}
                  className={cn(
                    card,
                    "flex items-center justify-between p-4 transition-all hover:border-primary/50",
                  )}
                >
                  <Link
                    to="/library/$crop/$slug"
                    params={{ crop: item.crop, slug: item.slug }}
                    className="flex flex-1 items-center gap-3.5 min-w-0"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <BookOpen className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-foreground">
                        {l(lang, topic.name)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {t(item.crop)} · {t(topic.kind)} · Saved{" "}
                        {fmtDate(item.savedAt, lang)}
                      </p>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2 pl-3">
                    <button
                      type="button"
                      onClick={() => {
                        removeSaved(item.id);
                        toast.success("Removed from saved items");
                      }}
                      className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-surface hover:text-coral transition-colors"
                      aria-label="Remove"
                    >
                      <Trash2 className="size-4" />
                    </button>
                    <ChevronRight className="size-4 text-subtle" />
                  </div>
                </div>
              );
            }

            if (item.kind === "report" && item.scanId) {
              const scan = scans.find((s) => s.id === item.scanId);
              if (!scan) return null;

              return (
                <div key={item.id} className="relative">
                  <ScanRow scan={scan} />
                </div>
              );
            }

            return null;
          })}
        </div>
      ) : (
        <EmptyState
          icon={Bookmark}
          title="No saved items yet"
          body="Bookmark useful disease guides from the Knowledge library or field scan reports for offline reference."
          action={
            <Link to="/library" className={cn(btnPrimary, "min-h-11 px-5")}>
              Browse crop knowledge
            </Link>
          }
        />
      )}
    </div>
  );
}
