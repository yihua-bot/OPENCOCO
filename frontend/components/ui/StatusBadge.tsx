"use client";
import { cn } from "@/lib/utils";

interface BadgeProps {
  status: "idle" | "generating" | "done" | "failed" | "processing" | "pending";
  className?: string;
}

const config = {
  idle: { label: "Idle", cls: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  pending: { label: "Pending", cls: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  generating: { label: "Generating", cls: "bg-orange-500/20 text-orange-400 border-orange-500/20 animate-pulse" },
  processing: { label: "Processing", cls: "bg-orange-500/20 text-orange-400 border-orange-500/20 animate-pulse" },
  done: { label: "Done", cls: "bg-green-500/20 text-green-400 border-green-500/30" },
  failed: { label: "Failed", cls: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export function StatusBadge({ status, className }: BadgeProps) {
  const { label, cls } = config[status] || config.idle;
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", cls, className)}>
      {label}
    </span>
  );
}
