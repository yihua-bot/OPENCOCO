import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Perfect for trying out Coco",
    features: ["5 videos per month", "720p resolution", "8 video styles", "Basic templates", "Community support"],
    cta: "Get started free",
    href: "/register",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    description: "For creators who need more",
    features: ["Unlimited videos", "1080p resolution", "All video styles", "Priority generation", "Email support", "API access (100 req/day)"],
    cta: "Start Pro",
    href: "/register?plan=pro",
    highlight: true,
  },
  {
    name: "Business",
    price: "$49",
    period: "/month",
    description: "For teams and power users",
    features: ["Unlimited videos", "4K resolution", "All video styles", "Fastest generation", "Dedicated support", "Unlimited API access", "Custom branding"],
    cta: "Start Business",
    href: "/register?plan=business",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0c0a08] text-white">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">C</div>
          Coco
        </Link>
        <Link href="/login" className="text-sm text-gray-400 hover:text-white">Sign in</Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Simple, transparent pricing</h1>
          <p className="text-gray-400">Start free, upgrade when you need more.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-6 border flex flex-col ${
                plan.highlight
                  ? "border-orange-500 bg-orange-500/20 ring-1 ring-orange-500/20"
                  : "border-white/10 bg-white/5"
              }`}
            >
              {plan.highlight && (
                <div className="text-xs font-medium text-orange-400 bg-orange-500/20 rounded-full px-3 py-1 w-fit mb-4">
                  Most popular
                </div>
              )}
              <div className="mb-6">
                <h2 className="text-lg font-semibold">{plan.name}</h2>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-gray-500 text-sm">{plan.period}</span>
                </div>
                <p className="text-gray-500 text-sm mt-2">{plan.description}</p>
              </div>

              <ul className="space-y-3 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="text-green-400">✓</span> {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`w-full py-3 rounded-xl text-center text-sm font-medium transition-all ${
                  plan.highlight
                    ? "bg-orange-600 hover:bg-orange-700 text-white"
                    : "border border-white/10 hover:border-white/20 hover:bg-white/5 text-gray-300"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
