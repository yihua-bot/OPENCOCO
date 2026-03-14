"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { Zap, Video, CreditCard, LogOut } from "lucide-react";
import Link from "next/link";

export default function AccountPage() {
  const router = useRouter();
  const { user, token, logout, fetchMe } = useAuthStore();

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    fetchMe();
  }, [token]);

  if (!user) return null;

  const planColors = {
    free: "text-gray-400 bg-gray-500/20",
    pro: "text-orange-400 bg-orange-500/20",
    business: "text-yellow-400 bg-yellow-500/20",
  };

  return (
    <div className="min-h-screen bg-[#0c0a08]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-white mb-8">Account</h1>

        {/* Profile */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-orange-600 flex items-center justify-center text-2xl font-bold text-white">
              {user.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <p className="font-semibold text-white text-lg">{user.name || "User"}</p>
              <p className="text-gray-500 text-sm">{user.email}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${planColors[user.plan]}`}>
                {user.plan} plan
              </span>
            </div>
          </div>
        </div>

        {/* Usage */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Usage</h2>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Zap size={18} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-white font-medium">{user.credits} credits remaining</p>
              <p className="text-gray-500 text-sm">
                {user.plan === "free" ? "5 credits/month on free plan" : "Unlimited on your plan"}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link href="/dashboard">
            <Button variant="outline" className="w-full justify-start gap-3">
              <Video size={16} /> My Projects
            </Button>
          </Link>
          <Link href="/pricing">
            <Button variant="outline" className="w-full justify-start gap-3">
              <CreditCard size={16} /> Upgrade Plan
            </Button>
          </Link>
          <Button
            variant="danger"
            className="w-full justify-start gap-3"
            onClick={() => { logout(); router.push("/"); }}
          >
            <LogOut size={16} /> Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
