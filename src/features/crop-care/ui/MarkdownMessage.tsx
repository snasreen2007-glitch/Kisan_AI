import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle, Info, Lightbulb, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

/**
 * Format inline markdown tokens: **bold**, *italic*, `code`
 */
function renderInline(text: string): React.ReactNode[] {
  // Regex splitting by bold (**...**), italic (*...*), or code (`...`)
  const parts = text.split(/(\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+?`)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return (
        <em key={index} className="italic text-foreground/90">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code key={index} className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[11.5px] text-primary">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

/**
 * Clean, lightweight, zero-dependency Markdown renderer for chat messages.
 * Handles headers, bullet points, numbered lists, callouts (Safety/Tip), and inline formatting.
 */
export function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  if (!content) return null;

  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i] ?? "";
    const trimmed = rawLine.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Callout boxes (Safety Notice, Warning, Tip)
    if (
      trimmed.startsWith("📌") ||
      trimmed.startsWith("⚠️") ||
      trimmed.startsWith("💡") ||
      trimmed.startsWith("> ")
    ) {
      const isSafety = trimmed.includes("Safety") || trimmed.includes("CIB&RC") || trimmed.includes("సావధానత") || trimmed.includes("గమనిక") || trimmed.includes("सावधानी");
      const isTip = trimmed.startsWith("💡") || trimmed.toLowerCase().includes("tip");
      const isWarn = trimmed.startsWith("⚠️") && !isSafety;

      const calloutText = trimmed.replace(/^([📌⚠️💡]|\>\s*)/, "").trim();

      nodes.push(
        <div
          key={`callout-${i}`}
          className={cn(
            "my-2 rounded-xl p-3 text-xs leading-relaxed border transition-all",
            isSafety
              ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
              : isTip
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
              : isWarn
              ? "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200"
              : "bg-surface border-line text-foreground"
          )}
        >
          <div className="flex items-start gap-2">
            {isSafety ? (
              <ShieldAlert className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            ) : isTip ? (
              <Lightbulb className="size-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            ) : isWarn ? (
              <AlertTriangle className="size-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            ) : (
              <Info className="size-4 shrink-0 mt-0.5 text-primary" />
            )}
            <div className="flex-1 font-medium">{renderInline(calloutText)}</div>
          </div>
        </div>
      );
      i++;
      continue;
    }

    // Numbered list items (e.g. "1. Step description", "2. ...")
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const listItems: { num: string; text: string }[] = [];
      while (i < lines.length) {
        const curLine = lines[i];
        if (curLine === undefined) break;
        const curTrim = curLine.trim();
        const m = curTrim.match(/^(\d+)\.\s+(.*)$/);
        if (m && m[1] && m[2]) {
          listItems.push({ num: m[1], text: m[2] });
          i++;
        } else if (!curTrim) {
          i++;
          break;
        } else {
          break;
        }
      }

      nodes.push(
        <ol key={`numlist-${i}`} className="my-2 space-y-1.5 pl-0.5">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-[13px] leading-relaxed">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[10px] font-bold text-primary mt-0.5">
                {item.num}
              </span>
              <div className="flex-1">{renderInline(item.text)}</div>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Bullet items (e.g. "• Item", "- Item", "* Item")
    const bulletMatch = trimmed.match(/^([•\-\*])\s+(.*)$/);
    if (bulletMatch) {
      const listItems: string[] = [];
      while (i < lines.length) {
        const curLine = lines[i];
        if (curLine === undefined) break;
        const curTrim = curLine.trim();
        const m = curTrim.match(/^([•\-\*])\s+(.*)$/);
        if (m && m[2]) {
          listItems.push(m[2]);
          i++;
        } else if (!curTrim) {
          i++;
          break;
        } else {
          break;
        }
      }

      nodes.push(
        <ul key={`bulletlist-${i}`} className="my-2 space-y-1.5 pl-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-[13px] leading-relaxed">
              <span className="size-1.5 rounded-full bg-primary shrink-0 mt-2" />
              <div className="flex-1">{renderInline(item)}</div>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Section header (e.g. "### Heading", "## Heading", "🌾 **Heading**:", "🔍 **Heading**:")
    const isHeader =
      trimmed.startsWith("###") ||
      trimmed.startsWith("##") ||
      (/^([\p{Emoji}\u2000-\u3300]\s*)?\*\*[^*]+?\*\*[:\s]*$/u.test(trimmed) && trimmed.length < 80);

    if (isHeader) {
      const headerText = trimmed.replace(/^#+\s*/, "");
      nodes.push(
        <h4
          key={`header-${i}`}
          className="text-sm font-bold tracking-tight text-foreground mt-3 mb-1.5 flex items-center gap-1.5"
        >
          {renderInline(headerText)}
        </h4>
      );
      i++;
      continue;
    }

    // Regular paragraph
    nodes.push(
      <p key={`p-${i}`} className="text-[13px] leading-relaxed text-foreground/90 my-1">
        {renderInline(trimmed)}
      </p>
    );
    i++;
  }

  return <div className={cn("space-y-1", className)}>{nodes}</div>;
}
