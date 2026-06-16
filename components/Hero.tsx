"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const dataNodes = [
  "left-[14%] top-[18%]",
  "right-[18%] top-[24%]",
  "left-[20%] bottom-[24%]",
  "right-[15%] bottom-[18%]",
  "left-[48%] top-[10%]",
  "left-[52%] bottom-[12%]",
];

const codeRows = [
  "w-32",
  "w-44",
  "w-28",
  "w-40",
  "w-24",
];

export default function Hero() {
  const [showLaunch, setShowLaunch] = useState(true);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowLaunch(false), reduceMotion ? 350 : 1850);
    return () => window.clearTimeout(timeout);
  }, [reduceMotion]);

  return (
    <section className="relative min-h-[100svh] overflow-hidden border-b border-amber-300/10">
      <AnimatePresence>
        {showLaunch && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-[#050505]"
          >
            <div
              className="absolute inset-0 opacity-[0.14]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(244,213,138,0.35) 1px, transparent 1px), linear-gradient(to right, rgba(244,213,138,0.35) 1px, transparent 1px)",
                backgroundSize: "44px 44px",
              }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(244,213,138,0.14),transparent_26rem),linear-gradient(120deg,rgba(5,5,5,0.84),rgba(5,5,5,0.96))]" />
            <div className="hero-scan absolute inset-x-0 top-0 h-28 bg-linear-to-b from-transparent via-amber-200/16 to-transparent" />
            <div className="absolute inset-x-0 top-1/2 h-px bg-linear-to-r from-transparent via-amber-300/25 to-transparent" />
            <div className="absolute inset-y-0 left-1/2 w-px bg-linear-to-b from-transparent via-amber-200/20 to-transparent" />

            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="relative flex w-full max-w-md flex-col items-center px-6"
            >
              <motion.div
                animate={reduceMotion ? {} : { rotate: -360 }}
                transition={{ duration: 11, repeat: Infinity, ease: "linear" }}
                className="absolute top-1 h-44 w-44 rounded-full border border-amber-300/20"
              />
              <motion.div
                animate={reduceMotion ? {} : { rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute top-7 h-32 w-32 rounded-full border border-dashed border-stone-200/15"
              />

              <div className="relative grid h-28 w-28 place-items-center rounded-2xl border border-amber-300/30 bg-black/60 shadow-2xl shadow-amber-950/40 backdrop-blur">
                <motion.div
                  animate={reduceMotion ? {} : { opacity: [0.34, 1, 0.34], scale: [0.94, 1, 0.94] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  className="h-14 w-14 rounded-lg border border-amber-300/40 bg-amber-300/10 shadow-lg shadow-amber-300/10"
                />
                <div className="absolute h-px w-24 bg-linear-to-r from-transparent via-amber-200/35 to-transparent" />
                <div className="absolute h-24 w-px bg-linear-to-b from-transparent via-amber-200/35 to-transparent" />
              </div>

                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: 208 }}
                  transition={{ duration: 0.75, delay: 0.35, ease: "easeOut" }}
                  className="mt-8 h-px bg-linear-to-r from-transparent via-amber-300 to-transparent"
                />
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.55 }}
                  className="mt-5 text-center"
                >
                  <div className="text-xl font-bold tracking-tight text-white">Groenics</div>
                  <div className="mt-2 text-xs uppercase tracking-[0.34em] text-amber-200/70">
                    Systems Online
                  </div>
                </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.78 }}
                className="mt-6 flex w-full max-w-xs items-center justify-between rounded-lg border border-amber-300/12 bg-black/30 px-4 py-3 font-mono text-[0.64rem] uppercase tracking-[0.2em] text-stone-400"
              >
                <span>core.sync</span>
                <span className="text-amber-200/75">ready</span>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="absolute inset-0 opacity-[0.11]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(244,213,138,0.28) 1px, transparent 1px), linear-gradient(to right, rgba(244,213,138,0.28) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div className="hero-scan absolute inset-x-0 top-0 h-40 bg-linear-to-b from-transparent via-amber-200/8 to-transparent" />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(5,5,5,0.95)_0%,rgba(5,5,5,0.74)_46%,rgba(31,24,12,0.58)_100%)]" />
      <div className="absolute left-0 top-0 h-full w-px bg-linear-to-b from-transparent via-amber-300/30 to-transparent" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.35 }}
        className="pointer-events-none absolute inset-x-0 top-24 z-0 mx-auto h-[39rem] max-w-7xl px-6 opacity-90 lg:top-24 lg:opacity-100"
      >
        <div className="relative ml-auto h-full w-full max-w-[39rem]">
          <div className="absolute inset-0 hidden lg:block">
            <div className="absolute left-12 top-16 h-px w-96 rotate-[18deg] bg-linear-to-r from-transparent via-amber-300/25 to-transparent" />
            <div className="absolute bottom-28 left-20 h-px w-80 -rotate-[16deg] bg-linear-to-r from-transparent via-stone-200/20 to-transparent" />
            <div className="absolute right-20 top-20 h-72 w-px bg-linear-to-b from-transparent via-amber-300/20 to-transparent" />
          </div>

          <div className="absolute right-2 top-8 hidden h-56 w-72 overflow-hidden rounded-lg border border-amber-300/20 bg-[#0b0a08]/90 p-4 shadow-2xl shadow-black/50 backdrop-blur md:block">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-400/70" />
              <span className="h-2 w-2 rounded-full bg-yellow-300/70" />
              <span className="h-2 w-2 rounded-full bg-green-400/70" />
            </div>
            <div className="space-y-3">
              {codeRows.map((row, index) => (
                <motion.div
                  key={`${row}-${index}`}
                  initial={{ opacity: 0.35, x: -12 }}
                  animate={{ opacity: [0.35, 1, 0.5], x: [0, 10, 0] }}
                  transition={{ duration: 3.2, delay: index * 0.18, repeat: Infinity, ease: "easeInOut" }}
                  className={`h-2 rounded-full bg-linear-to-r from-amber-300/80 via-stone-200/50 to-transparent ${row}`}
                />
              ))}
            </div>
            <div className="absolute bottom-0 left-0 h-px w-full bg-linear-to-r from-transparent via-amber-300/50 to-transparent" />
          </div>

          <div className="absolute bottom-7 left-2 hidden h-52 w-64 overflow-hidden rounded-lg border border-white/12 bg-[#0b0a08]/85 p-4 shadow-2xl shadow-black/50 backdrop-blur md:block">
            <div className="grid h-full grid-cols-5 gap-2">
              {Array.from({ length: 20 }).map((_, index) => (
                <motion.div
                  key={index}
                  animate={{ opacity: [0.18, 0.85, 0.24], scaleY: [0.55, 1, 0.68] }}
                  transition={{ duration: 2.8, delay: index * 0.07, repeat: Infinity, ease: "easeInOut" }}
                  className="origin-bottom rounded-sm border border-amber-300/15 bg-amber-300/10"
                />
              ))}
            </div>
          </div>

          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
            className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-300/25 sm:h-96 sm:w-96"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 42, repeat: Infinity, ease: "linear" }}
            className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-stone-200/15 sm:h-72 sm:w-72"
          />

          <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-amber-300/35 bg-black/55 shadow-2xl shadow-amber-950/40 backdrop-blur sm:h-40 sm:w-40">
            <motion.div
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-5 rounded-2xl border border-amber-300/30 bg-amber-300/8"
            />
            <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-amber-300/80 shadow-lg shadow-amber-300/30" />
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-linear-to-b from-transparent via-amber-300/35 to-transparent" />
            <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-linear-to-r from-transparent via-amber-300/35 to-transparent" />
          </div>

          {dataNodes.map((className, index) => (
            <motion.div
              key={className}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.8 + index * 0.12 }}
              className={`absolute ${className}`}
            >
              <motion.div
                animate={{ y: [0, index % 2 === 0 ? -6 : 6, 0] }}
                transition={{ duration: 5 + index, repeat: Infinity, ease: "easeInOut" }}
                className="h-4 w-4 rounded-full border border-amber-300/40 bg-amber-300/70 shadow-lg shadow-amber-300/30"
              />
            </motion.div>
          ))}
        </div>
      </motion.div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-28 pb-16 lg:pt-32 lg:pb-20">
        <div className="max-w-3xl">
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
              Groenics helps businesses turn scattered work into clear
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
