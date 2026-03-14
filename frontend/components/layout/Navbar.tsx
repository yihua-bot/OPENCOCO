"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { LogOut, User, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user, logout } = useAuthStore();
  const pathname = usePathname();

  return (
    <nav className="h-14 border-b border-white/5 flex items-center px-6 gap-4 bg-[#0c0a08]/80 backdrop-blur-sm sticky top-0 z-50">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 font-bold text-white">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-sm">
          C
        </div>
        <span className="text-sm">Coco</span>
      </Link>

      <div className="flex-1" />

      {user && (
        <div className="flex items-center gap-3">
          {/* Credits */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400">
            <Zap size={12} className="text-yellow-400" />
            <span>{user.credits} credits</span>
          </div>

          {/* Plan badge */}
          <span className={cn(
            "px-2 py-0.5 rounded-full text-xs font-medium",
            user.plan === "free" && "bg-gray-500/20 text-gray-400",
            user.plan === "pro" && "bg-orange-500/20 text-orange-400",
            user.plan === "business" && "bg-yellow-500/20 text-yellow-400",
          )}>
            {user.plan}
          </span>

          <Link href="/account">
            <button className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-xs font-bold text-white hover:bg-orange-700 transition-colors">
              {user.name?.[0]?.toUpperCase() || <User size={14} />}
            </button>
          </Link>

          <Button variant="ghost" size="sm" onClick={logout} className="text-gray-500 hover:text-gray-300">
            <LogOut size={14} />
          </Button>
        </div>
      )}
    </nav>
  );
}
