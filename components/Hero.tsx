"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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

const launchBars = [
  "w-24",
  "w-36",
  "w-28",
  "w-44",
];

const launchPillars = [
  "Find",
  "Build",
  "Measure",
];

export default function Hero() {
  const [showLaunch, setShowLaunch] = useState(true);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowLaunch(false), reduceMotion ? 420 : 2800);
    return () => window.clearTimeout(timeout);
  }, [reduceMotion]);

  return (
    <section className="relative min-h-[100svh] overflow-hidden border-b border-amber-300/10">
      <AnimatePresence>
        {showLaunch && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.08, filter: "blur(14px)" }}
            transition={{ duration: 0.75, ease: "easeOut" }}
            className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-[#050505]"
          >
            <div
              className="absolute inset-0 opacity-[0.1]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(244,213,138,0.26) 1px, transparent 1px), linear-gradient(to right, rgba(244,213,138,0.26) 1px, transparent 1px)",
                backgroundSize: "52px 52px",
              }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(244,213,138,0.24),transparent_20rem),radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.08),transparent_11rem),linear-gradient(140deg,rgba(5,5,5,0.76),rgba(5,5,5,0.98))]" />
            <div className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-amber-100/10 via-transparent to-transparent" />
            <div className="hero-scan absolute inset-x-0 top-0 h-32 bg-linear-to-b from-transparent via-amber-100/16 to-transparent" />
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 1.1, delay: 0.2, ease: "easeOut" }}
              className="absolute inset-x-0 top-1/2 h-px origin-center bg-linear-to-r from-transparent via-amber-200/35 to-transparent"
            />
            <motion.div
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ duration: 1.1, delay: 0.34, ease: "easeOut" }}
              className="absolute inset-y-0 left-1/2 w-px origin-center bg-linear-to-b from-transparent via-amber-100/22 to-transparent"
            />

            <motion.div
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.65, delay: 0.45, ease: "easeOut" }}
              className="absolute left-8 top-8 hidden w-52 rounded-2xl border border-amber-300/10 bg-black/20 p-4 backdrop-blur md:block"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-stone-500">
                  performance
                </span>
                <motion.span
                  animate={reduceMotion ? {} : { opacity: [0.45, 1, 0.45] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  className="h-2 w-2 rounded-full bg-amber-300"
                />
              </div>
              <div className="space-y-2.5">
                {launchBars.map((bar, index) => (
                  <motion.div
                    key={bar}
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ duration: 0.55, delay: 0.5 + index * 0.12, ease: "easeOut" }}
                    className={`h-1.5 origin-left rounded-full bg-linear-to-r from-amber-200/80 to-transparent ${bar}`}
                  />
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.75, ease: "easeOut" }}
              className="relative flex w-full max-w-md flex-col items-center px-6"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: [0.35, 0.9, 0.45], scale: [0.78, 1.08, 0.98] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-2 h-72 w-72 rounded-full border border-amber-300/10 bg-amber-300/5 blur-[1px]"
              />
              <motion.div
                animate={reduceMotion ? {} : { rotate: -360 }}
                transition={{ duration: 13, repeat: Infinity, ease: "linear" }}
                className="absolute top-10 h-56 w-56 rounded-full border border-amber-300/20"
              />
              <motion.div
                animate={reduceMotion ? {} : { rotate: 360 }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                className="absolute top-16 h-44 w-44 rounded-full border border-dashed border-stone-200/16"
              />

              <motion.div
                initial={{ opacity: 0, rotateX: 14, y: 16 }}
                animate={{ opacity: 1, rotateX: 0, y: 0 }}
                transition={{ duration: 0.7, delay: 0.18, ease: "easeOut" }}
                className="relative w-full overflow-hidden rounded-[2rem] border border-amber-300/18 bg-[#090806]/72 p-7 shadow-2xl shadow-amber-950/40 backdrop-blur-xl"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-amber-200/70 to-transparent" />
                <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-amber-300/10 blur-3xl" />
                <div className="absolute -bottom-24 left-8 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
                <motion.div
                  initial={{ x: "-120%", opacity: 0 }}
                  animate={{ x: "145%", opacity: [0, 1, 0] }}
                  transition={{ duration: 1.25, delay: 1.75, ease: "easeInOut" }}
                  className="absolute inset-y-0 w-28 rotate-12 bg-linear-to-r from-transparent via-amber-100/12 to-transparent"
                />

                <div className="relative mx-auto grid h-36 w-36 place-items-center rounded-[1.9rem] border border-amber-300/35 bg-black/55 shadow-2xl shadow-amber-300/10 backdrop-blur">
                  <motion.div
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
                    className="absolute inset-3 rounded-[1.5rem] border border-amber-300/15 bg-amber-300/5"
                  />
                  <motion.div
                    animate={reduceMotion ? {} : { opacity: [0.25, 0.85, 0.25], scale: [0.9, 1.13, 0.9] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute h-24 w-24 rounded-[1.55rem] border border-amber-300/30 bg-amber-300/8 shadow-lg shadow-amber-300/20"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.78 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.7, ease: "easeOut" }}
                    className="relative z-10 grid h-20 w-20 place-items-center overflow-hidden rounded-[1.35rem] border border-amber-200/35 bg-black shadow-xl shadow-amber-300/15"
                  >
                    <Image
                      src="/groenics-logo.jpeg"
                      alt="Groenics logo"
                      width={80}
                      height={80}
                      priority
                      className="h-full w-full object-cover"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, delay: 0.55, ease: "easeOut" }}
                    className="absolute h-px w-32 bg-linear-to-r from-transparent via-amber-200/50 to-transparent"
                  />
                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.6, delay: 0.62, ease: "easeOut" }}
                    className="absolute h-32 w-px bg-linear-to-b from-transparent via-amber-200/45 to-transparent"
                  />
                </div>

                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: reduceMotion ? 180 : 272 }}
                  transition={{ duration: 0.8, delay: 0.72, ease: "easeOut" }}
                  className="mx-auto mt-8 h-px bg-linear-to-r from-transparent via-amber-200 to-transparent"
                />

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.9 }}
                  className="mt-5 text-center"
                >
                  <div className="text-3xl font-bold tracking-tight text-white">
                    Groenics
                  </div>
                  <div className="mt-3 text-xs uppercase tracking-[0.28em] text-amber-200/75">
                    Business Problem Solving
                  </div>
                </motion.div>

                <div className="relative mt-6 grid grid-cols-3 gap-2">
                  {launchPillars.map((signal, index) => (
                    <motion.div
                      key={signal}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 1.05 + index * 0.08, ease: "easeOut" }}
                      className="rounded-full border border-amber-300/10 bg-black/25 px-3 py-2 text-center text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-stone-400"
                    >
                      {signal}
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 1.42, ease: "easeOut" }}
                  className="mt-6"
                >
                  <div className="relative h-1 overflow-hidden rounded-full bg-amber-300/10">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 1.25, delay: 1.48, ease: "easeInOut" }}
                      className="h-full origin-left rounded-full bg-linear-to-r from-amber-300 via-amber-100 to-amber-300 shadow-lg shadow-amber-300/20"
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 2.1 }}
                  className="mt-5 flex items-center justify-between rounded-xl border border-amber-300/12 bg-black/30 px-4 py-3 font-mono text-[0.64rem] uppercase tracking-[0.2em] text-stone-400"
                >
                  <span>assessment</span>
                  <span className="text-amber-200/85">ready</span>
                </motion.div>
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
              We find business problems and build AI solutions
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="text-5xl md:text-6xl xl:text-7xl font-bold leading-[1.02] tracking-tight"
            >
              Find the Problems
              <span className="block text-shimmer mt-2">Slowing Your</span>
              <span className="block text-white">Business Down.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-8 text-lg text-stone-300 max-w-xl leading-relaxed"
            >
              Every business loses money through inefficient processes, manual
              work, poor follow-ups, and outdated systems. Groenics identifies
              these problems and solves them with AI, automation, and custom
              software.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              className="mt-9 flex flex-col sm:flex-row gap-4"
            >
              <a
                href="#contact"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber-300 px-5 py-4 text-center text-sm font-bold text-black shadow-lg shadow-amber-900/30 transition-all duration-300 hover:scale-[1.02] hover:bg-amber-200 hover:shadow-amber-300/20 sm:w-auto sm:px-8 sm:text-base"
              >
                Get a Free Business Assessment
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
              <a
                href="#framework"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-amber-300/20 px-5 py-4 text-sm font-medium text-stone-100 transition-all duration-300 hover:border-amber-200/45 hover:bg-amber-300/5 sm:w-auto sm:px-8 sm:text-base"
              >
                See How We Work
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.7 }}
              className="mt-10 flex flex-wrap items-center gap-6 text-sm text-stone-500"
            >
              {["Revenue Leaks", "Time Waste", "Manual Workflows"].map((item) => (
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
                { title: "Find", desc: "Hidden business problems" },
                { title: "Build", desc: "AI and software solutions" },
                { title: "Measure", desc: "Savings and results" },
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
