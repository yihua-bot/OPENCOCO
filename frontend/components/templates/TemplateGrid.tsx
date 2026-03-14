"use client";
import { Template } from "@/lib/api";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, string> = {
  film: "🎬",
  anime: "⚡",
  commercial: "📢",
  explainer: "💡",
  kids: "🌈",
  music: "🎵",
  fan: "✨",
  lipsync: "🎤",
};

interface TemplateCardProps {
  template: Template;
  selected?: boolean;
  onClick?: () => void;
}

export function TemplateCard({ template, selected, onClick }: TemplateCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-left p-4 rounded-xl border transition-all duration-150 hover:border-orange-500/50 hover:bg-orange-500/5",
        selected
          ? "border-orange-500 bg-orange-500/10 ring-1 ring-orange-500/30"
          : "border-white/10 bg-white/5"
      )}
    >
      <div className="text-2xl mb-2">{CATEGORY_ICONS[template.category] || "🎥"}</div>
      <div className="font-medium text-sm text-white mb-1">{template.name}</div>
      <div className="text-xs text-gray-500 line-clamp-2">{template.description}</div>
    </button>
  );
}

interface TemplateGridProps {
  templates: Template[];
  selectedId?: string | null;
  onSelect?: (template: Template) => void;
}

export function TemplateGrid({ templates, selectedId, onSelect }: TemplateGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {templates.map((t) => (
        <TemplateCard
          key={t.id}
          template={t}
          selected={selectedId === t.id}
          onClick={() => onSelect?.(t)}
        />
      ))}
    </div>
  );
}
