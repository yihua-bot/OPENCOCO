import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0c0a08] text-white flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-2 font-bold">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">C</div>
          Coco
        </div>
        <div className="flex items-center gap-4">
          <Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</Link>
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Sign in</Link>
          <Link href="/register" className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-sm font-medium transition-colors">
            Get started free
          </Link>
        </div>
      </nav>

      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 gap-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/20 text-orange-400 text-xs font-medium">
          ✨ Powered by Sora2, Kling 2.6 &amp; Hailuo
        </div>
        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight max-w-3xl leading-tight">
          The AI Video Editor{" "}
          <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
            for Your Mind
          </span>
        </h1>
        <p className="text-lg text-gray-400 max-w-xl leading-relaxed">
          Edit like chatting with a real person. Say &ldquo;Make this part faster&rdquo; or &ldquo;Change the music,&rdquo; and the video updates instantly.
        </p>
        <div className="flex gap-4">
          <Link href="/register" className="px-8 py-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 font-semibold text-lg transition-all shadow-xl shadow-orange-900/30">
            Start creating free
          </Link>
          <Link href="/pricing" className="px-8 py-3.5 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 font-semibold text-lg transition-all text-gray-300">
            See pricing
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12 max-w-3xl w-full">
          {[
            { icon: "💬", label: "Chat to create" },
            { icon: "🎬", label: "8 video styles" },
            { icon: "🎵", label: "AI music & voice" },
            { icon: "⚡", label: "Ready in seconds" },
          ].map((f) => (
            <div key={f.label} className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="text-sm text-gray-400">{f.label}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
