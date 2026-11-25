import { Link } from "@tanstack/react-router";
import {
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCropCare } from "../context";
import { crops, l, type CropKey } from "../knowledge";
import type { Reminder } from "../services/types";
import {
  btn,
  btnPrimary,
  btnSecondary,
  card,
  EmptyState,
  enter,
  fmtDate,
  PageHeader,
  Section,
} from "../ui";

export function NotificationsPage() {
  const {
    t,
    lang,
    reminders,
    events,
    addReminder,
    toggleReminder,
    removeReminder,
    settings,
  } = useCropCare();

  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCrop, setNewCrop] = useState<CropKey>(settings.crops[0] || "rice");
  const [newDate, setNewDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().slice(0, 10);
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addReminder({
      title: newTitle.trim(),
      crop: newCrop,
      dueDate: newDate,
    });
    setNewTitle("");
    setIsAdding(false);
    toast.success("Field reminder created");
  };

  const presets = [
    { title: "Inspect rice leaves for blast spots", crop: "rice" as CropKey },
    { title: "Check base of paddy hills for planthoppers", crop: "rice" as CropKey },
    { title: "Turn over chilli leaves to check for thrips", crop: "chilli" as CropKey },
    { title: "Check chilli fruit for soft spots or anthracnose", crop: "chilli" as CropKey },
  ];

  return (
    <div className={cn("space-y-8 pb-12", enter)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t("navNotifications")}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Scouting schedule and local field event activity
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className={cn(btnPrimary, "min-h-10 px-4 text-xs font-bold")}
        >
          <Plus className="size-4" /> Add reminder
        </button>
      </div>

      {/* Add Reminder Modal / Inline Form */}
      {isAdding && (
        <form
          onSubmit={handleCreate}
          className={cn(card, "p-5 border-primary/40 space-y-4 animate-in fade-in")}
        >
          <h3 className="text-sm font-bold text-foreground">
            Schedule Field Inspection Reminder
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Reminder task
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Check south field for blast after rain"
                required
                className="w-full rounded-xl border border-line bg-surface p-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Target crop
                </label>
                <select
                  value={newCrop}
                  onChange={(e) => setNewCrop(e.target.value as CropKey)}
                  className="w-full rounded-xl border border-line bg-surface p-3 text-sm text-foreground outline-none focus:border-primary"
                >
                  {crops.map((c) => (
                    <option key={c.key} value={c.key}>
                      {l(lang, c.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Due date
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface p-3 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Quick suggestion:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((pr) => (
                  <button
                    key={pr.title}
                    type="button"
                    onClick={() => {
                      setNewTitle(pr.title);
                      setNewCrop(pr.crop);
                    }}
                    className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-foreground"
                  >
                    {pr.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className={cn(btnSecondary, "min-h-9 px-3 text-xs")}
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              className={cn(btnPrimary, "min-h-9 px-4 text-xs font-bold")}
            >
              Save reminder
            </button>
          </div>
        </form>
      )}

      {/* Field Inspection Reminders List */}
      <Section title={`Reminders (${reminders.length})`}>
        {reminders.length > 0 ? (
          <div className="space-y-2.5">
            {reminders.map((r) => {
              const isOverdue =
                !r.done && r.dueDate <= new Date().toISOString().slice(0, 10);

              return (
                <div
                  key={r.id}
                  className={cn(
                    card,
                    "flex items-center gap-3 p-3.5 transition-all",
                    r.done && "opacity-60 bg-surface/30",
                    isOverdue && "border-amber/40 bg-amber/5",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleReminder(r.id)}
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-lg border transition-all",
                      r.done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary",
                    )}
                    aria-label="Toggle complete"
                  >
                    {r.done && <Check className="size-4" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-semibold text-foreground",
                        r.done && "line-through text-muted-foreground",
                      )}
                    >
                      {r.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t(r.crop)} · Due {fmtDate(r.dueDate, lang)}
                      {isOverdue && (
                        <span className="ml-2 font-bold text-amber">
                          (Due today / overdue)
                        </span>
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      removeReminder(r.id);
                      toast.success("Reminder removed");
                    }}
                    className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-surface hover:text-coral transition-colors"
                    aria-label="Delete reminder"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={cn(card, "p-6 text-center text-xs text-muted-foreground")}>
            <Calendar className="size-8 mx-auto text-primary/40 mb-2" />
            No reminders scheduled. Tap "Add reminder" to set field checks.
          </div>
        )}
      </Section>

      {/* Local Event Activity Log */}
      <Section title="Local Activity Log">
        {events.length > 0 ? (
          <div className={cn(card, "divide-y divide-line")}>
            {events.slice(0, 15).map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between p-3.5 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="size-2 rounded-full bg-primary" />
                  <span className="font-medium text-foreground">{ev.label}</span>
                </div>
                <span className="font-mono text-muted-foreground text-[11px]">
                  {fmtDate(ev.at, lang)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className={cn(card, "p-6 text-center text-xs text-muted-foreground")}>
            <Clock className="size-8 mx-auto text-primary/40 mb-2" />
            No activity recorded yet.
          </div>
        )}
      </Section>
    </div>
  );
}
