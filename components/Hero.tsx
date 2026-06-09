"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative min-h-[92svh] overflow-hidden border-b border-amber-300/10">
      <div
        className="absolute inset-0 opacity-[0.055]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(244,213,138,0.28) 1px, transparent 1px), linear-gradient(to right, rgba(244,213,138,0.28) 1px, transparent 1px)",
          backgroundSize: "84px 84px",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(5,5,5,0.98)_0%,rgba(5,5,5,0.82)_56%,rgba(31,24,12,0.78)_100%)]" />
      <div className="absolute left-0 top-0 h-full w-px bg-linear-to-b from-transparent via-amber-300/30 to-transparent" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-28 pb-16 lg:pt-32 lg:pb-20">
        <div className="max-w-4xl">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8 inline-flex items-center gap-2.5 border border-amber-300/25 bg-amber-300/5 px-5 py-2 rounded-full text-amber-100 text-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
              For businesses that need clarity, systems, and growth
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="text-5xl md:text-6xl xl:text-7xl font-bold leading-[1.02] tracking-tight"
            >
              Build the systems your
              <span className="block text-shimmer mt-2">business needs</span>
              <span className="block text-white">to grow</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-8 text-lg text-stone-300 max-w-xl leading-relaxed"
            >
              Nayab Labs helps businesses turn scattered work into clear
              strategy, automated operations, better sales follow-up, and
              software that keeps the company moving.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              className="mt-9 flex flex-col sm:flex-row gap-4"
            >
              <a
                href="#contact"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-amber-300 hover:bg-amber-200 text-black font-bold rounded-full transition-all duration-300 shadow-lg shadow-amber-900/30 hover:shadow-amber-300/20 hover:scale-[1.02]"
              >
                Start A Project
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
              <a
                href="#portfolio"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-amber-300/20 hover:border-amber-200/45 hover:bg-amber-300/5 rounded-full transition-all duration-300 text-stone-100 font-medium"
              >
                View What We Build
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.7 }}
              className="mt-10 flex flex-wrap items-center gap-6 text-sm text-stone-500"
            >
              {["Revenue Systems", "Operations Dashboards", "AI Automation"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                  {item}
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.85 }}
              className="mt-8 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3"
            >
              {[
                { title: "Plan", desc: "Clear roadmap" },
                { title: "Build", desc: "Tools and workflows" },
                { title: "Scale", desc: "Automation and reporting" },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-amber-300/10 bg-black/20 px-4 py-3">
                  <div className="text-sm font-semibold text-amber-100">{item.title}</div>
                  <div className="mt-1 text-xs text-stone-500">{item.desc}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="absolute bottom-5 left-1/2 -translate-x-1/2 h-8 w-px bg-linear-to-b from-amber-300/70 to-transparent"
      />
    </section>
  );
}
