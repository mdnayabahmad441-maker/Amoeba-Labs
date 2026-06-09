"use client";

import { motion } from "framer-motion";

function DashboardPreview() {
  return (
    <div className="relative w-full max-w-sm mx-auto lg:mx-0">
      {/* Glow behind preview */}
      <div className="absolute inset-0 bg-cyan-500/15 rounded-3xl blur-3xl scale-110" />

      {/* Main card */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="relative border border-white/12 rounded-2xl bg-[#071a35]/90 backdrop-blur-sm p-5 shadow-2xl shadow-black/50"
      >
        {/* Card header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-sm">
              🎓
            </div>
            <span className="text-white font-semibold text-sm">NaySha Educore</span>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Live
          </span>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Schools", value: "42" },
            { label: "Questions", value: "12K" },
            { label: "Revenue", value: "$62K" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white/4 border border-white/8 rounded-xl p-2.5 text-center"
            >
              <div className="text-cyan-400 font-bold text-sm">{s.value}</div>
              <div className="text-gray-500 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-400">Monthly Growth</span>
            <span className="text-cyan-400">+24%</span>
          </div>
          <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "72%" }}
              transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
              className="h-full bg-linear-to-r from-cyan-500 to-blue-500 rounded-full"
            />
          </div>
        </div>

        {/* Pipeline stages */}
        <div className="flex gap-1.5">
          {[
            { stage: "New", count: 6, color: "bg-blue-400" },
            { stage: "Demo", count: 4, color: "bg-yellow-400" },
            { stage: "Won", count: 8, color: "bg-green-400" },
          ].map((p) => (
            <div key={p.stage} className="flex-1 bg-white/4 rounded-lg p-2 text-center">
              <div className={`w-1.5 h-1.5 rounded-full ${p.color} mx-auto mb-1`} />
              <div className="text-white text-xs font-medium">{p.count}</div>
              <div className="text-gray-600 text-xs">{p.stage}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Floating notification 1 */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -bottom-5 -left-8 border border-white/12 bg-[#071a35]/95 backdrop-blur-sm rounded-xl px-3.5 py-2.5 shadow-xl shadow-black/40 flex items-center gap-2.5"
      >
        <span className="text-lg">🏫</span>
        <div>
          <p className="text-white text-xs font-semibold">New School Added</p>
          <p className="text-gray-500 text-xs">Sunrise Academy • just now</p>
        </div>
      </motion.div>

      {/* Floating notification 2 */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="absolute -top-5 -right-6 border border-green-500/25 bg-[#071a35]/95 backdrop-blur-sm rounded-xl px-3.5 py-2.5 shadow-xl shadow-black/40 flex items-center gap-2.5"
      >
        <span className="text-lg">🧠</span>
        <div>
          <p className="text-green-400 text-xs font-semibold">AI Questions Ready</p>
          <p className="text-gray-500 text-xs">NEET · 50 questions generated</p>
        </div>
      </motion.div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(#00e5ff 1px, transparent 1px), linear-gradient(to right, #00e5ff 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      {/* Radial fade over grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(0,229,255,0.08),transparent)]" />

      {/* Glow orbs */}
      <div className="absolute top-1/3 -left-32 w-[500px] h-[500px] bg-cyan-500/8 rounded-full blur-[140px]" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-700/8 rounded-full blur-[140px]" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-32 lg:py-0 lg:min-h-screen lg:flex lg:items-center">
        <div className="grid lg:grid-cols-2 gap-16 xl:gap-24 items-center w-full">

          {/* Left — Text */}
          <div>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8 inline-flex items-center gap-2.5 border border-cyan-500/25 bg-cyan-500/5 px-5 py-2 rounded-full text-cyan-300 text-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Complete Business Solutions - Strategy to Execution
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="text-5xl md:text-6xl xl:text-7xl font-bold leading-[1.08] tracking-tight"
            >
              We Turn Business
              <span className="block text-shimmer mt-1">Strategy Into</span>
              <span className="block text-white">Execution</span>
            </motion.h1>

            {/* Subtext */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-7 text-lg text-gray-400 max-w-xl leading-relaxed"
            >
              Nayab Labs helps founders, teams, and growing companies plan,
              build, automate, and scale. From business strategy and operating
              systems to AI products and execution support, we turn ideas into
              measurable outcomes.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              className="mt-9 flex flex-col sm:flex-row gap-4"
            >
              <a
                href="#contact"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-full transition-all duration-300 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-400/40 hover:scale-[1.02]"
              >
                Build With Us
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
              <a
                href="#portfolio"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/15 hover:border-white/30 hover:bg-white/4 rounded-full transition-all duration-300 text-white font-medium"
              >
                Explore Solutions
              </a>
            </motion.div>

            {/* Social proof row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.7 }}
              className="mt-10 flex items-center gap-6 text-sm text-gray-500"
            >
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                Strategy-Led
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                Execution-Focused
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                AI-Enabled
              </div>
            </motion.div>
          </div>

          {/* Right — Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="hidden lg:flex justify-center"
          >
            <DashboardPreview />
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <div className="w-5 h-8 border border-white/15 rounded-full flex items-start justify-center p-1">
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            className="w-1 h-1.5 bg-cyan-400 rounded-full"
          />
        </div>
      </motion.div>
    </section>
  );
}
