import { Link, useSearch } from "@tanstack/react-router";
import {
  BookOpen,
  Bug,
  Compass,
  History,
  Layers,
  Leaf,
  RotateCcw,
  Search,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useCropCare } from "../context";
import {
  crops,
  getTopic,
  l,
  searchTopics,
  topics,
  type CropKey,
  type Mode,
} from "../knowledge";
import {
  btnPrimary,
  card,
  Chip,
  EmptyState,
  enter,
  PageHeader,
  SearchBox,
  Section,
  TopicRow,
} from "../ui";

export function KnowledgeIndexPage() {
  const { t, lang, settings, recent } = useCropCare();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchParams: any = useSearch({ strict: false });

  const [query, setQuery] = useState("");
  const [selectedCrop, setSelectedCrop] = useState<CropKey | "all">(
    searchParams?.crop === "rice" || searchParams?.crop === "chilli"
      ? searchParams.crop
      : "all",
  );
  const [selectedKind, setSelectedKind] = useState<Mode | "all">(
    searchParams?.kind === "disease" || searchParams?.kind === "pest"
      ? searchParams.kind
      : "all",
  );

  const filteredTopics = useMemo(() => {
    return searchTopics(query, {
      ...(selectedCrop !== "all" ? { crop: selectedCrop } : {}),
      ...(selectedKind !== "all" ? { kind: selectedKind } : {}),
    });
  }, [query, selectedCrop, selectedKind]);

  // Resolve recently viewed topics
  const recentTopics = useMemo(() => {
    return recent
      .map((entry) => {
        const [crop, slug] = entry.split("/");
        return crop && slug ? getTopic(crop, slug) : undefined;
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, 4);
  }, [recent]);

  return (
    <div className={cn("space-y-6 pb-12", enter)}>
      <PageHeader
        eyebrow="Field Guide"
        title={t("navKnowledge")}
        sub="Offline agricultural library for rice and chilli diseases, pests and management."
      />

      {/* Search Input */}
      <SearchBox
        value={query}
        onChange={setQuery}
        placeholder="Search by disease, pest, symptom or scientific name..."
      />

      {/* Filter Chips */}
      <div className="space-y-3">
        {/* Crop Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <Chip
            active={selectedCrop === "all"}
            onClick={() => setSelectedCrop("all")}
          >
            {t("all")} Crops ({topics.length})
          </Chip>
          {crops.map((c) => (
            <Chip
              key={c.key}
              active={selectedCrop === c.key}
              onClick={() => setSelectedCrop(c.key)}
            >
              {l(lang, c.name)} (
              {topics.filter((tp) => tp.crop === c.key).length})
            </Chip>
          ))}
        </div>

        {/* Kind Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <Chip
            active={selectedKind === "all"}
            onClick={() => setSelectedKind("all")}
          >
            All problems
          </Chip>
          <Chip
            active={selectedKind === "disease"}
            onClick={() => setSelectedKind("disease")}
          >
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-coral" />
              {t("diseases")}
            </span>
          </Chip>
          <Chip
            active={selectedKind === "pest"}
            onClick={() => setSelectedKind("pest")}
          >
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber" />
              {t("pests")}
            </span>
          </Chip>
        </div>
      </div>

      {/* Recently Viewed Section (only shown when not actively searching) */}
      {!query && recentTopics.length > 0 && selectedCrop === "all" && (
        <Section title="Recently Viewed">
          <div className="grid gap-3 sm:grid-cols-2">
            {recentTopics.map((item) => (
              <TopicRow key={`${item.crop}-${item.slug}`} topic={item} />
            ))}
          </div>
        </Section>
      )}

      {/* Topics List / Results */}
      <Section
        title={`Topics (${filteredTopics.length})`}
        action={
          (query || selectedCrop !== "all" || selectedKind !== "all") && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelectedCrop("all");
                setSelectedKind("all");
              }}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Reset filters
            </button>
          )
        }
      >
        {filteredTopics.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredTopics.map((topic) => (
              <TopicRow
                key={`${topic.crop}-${topic.slug}`}
                topic={topic}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No matching topics found"
            body="Try searching with a different symptom, vernacular name or reset filters."
            action={
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSelectedCrop("all");
                  setSelectedKind("all");
                }}
                className={cn(btnPrimary, "min-h-11 px-5")}
              >
                Show all topics
              </button>
            }
          />
        )}
      </Section>
    </div>
  );
}
