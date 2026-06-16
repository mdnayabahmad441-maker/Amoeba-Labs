"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const systemNodes = [
  { label: "Strategy", className: "left-2 top-10 sm:left-4 sm:top-12" },
  { label: "CRM", className: "right-3 top-14 sm:right-6 sm:top-16" },
  { label: "Billing", className: "left-5 bottom-16 sm:left-10 sm:bottom-20" },
  { label: "AI Ops", className: "right-4 bottom-12 sm:right-8 sm:bottom-16" },
];

const signalBars = [
  "w-20 delay-0",
  "w-32 delay-150",
  "w-24 delay-300",
  "w-28 delay-500",
];

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

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.35 }}
        className="pointer-events-none absolute inset-x-0 top-24 z-0 mx-auto h-[34rem] max-w-7xl px-6 opacity-75 lg:top-28 lg:opacity-100"
      >
        <div className="relative ml-auto h-full w-full max-w-[39rem]">
          <div className="absolute inset-0 hidden lg:block">
            <div className="absolute left-12 top-16 h-px w-96 rotate-[18deg] bg-linear-to-r from-transparent via-amber-300/25 to-transparent" />
            <div className="absolute bottom-28 left-20 h-px w-80 -rotate-[16deg] bg-linear-to-r from-transparent via-stone-200/20 to-transparent" />
            <div className="absolute right-20 top-20 h-72 w-px bg-linear-to-b from-transparent via-amber-300/20 to-transparent" />
          </div>

          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="absolute right-0 top-6 hidden w-64 rounded-lg border border-amber-300/15 bg-[#0b0a08]/80 p-4 shadow-2xl shadow-black/40 backdrop-blur md:block"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-amber-200/60">Pipeline</div>
                <div className="mt-1 text-lg font-bold text-white">₹8.4L</div>
              </div>
              <div className="rounded-full border border-green-400/20 bg-green-400/10 px-2 py-1 text-[10px] font-semibold text-green-300">
                +18%
              </div>
            </div>
            <div className="space-y-2.5">
              {signalBars.map((bar) => (
                <div key={bar} className="h-2 overflow-hidden rounded-full bg-white/8">
                  <div className={`hero-signal h-full rounded-full bg-amber-300/80 ${bar}`} />
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute bottom-6 left-0 hidden w-60 rounded-lg border border-white/10 bg-[#0b0a08]/80 p-4 shadow-2xl shadow-black/40 backdrop-blur md:block"
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400" />
              <div className="text-xs font-semibold text-stone-300">Automation running</div>
            </div>
            <div className="space-y-2">
              {["Lead capture", "Follow-up queue", "Invoice reminder"].map((item, index) => (
                <div key={item} className="flex items-center justify-between rounded-md border border-white/8 bg-white/4 px-3 py-2">
                  <span className="text-xs text-stone-300">{item}</span>
                  <span className="text-[10px] text-amber-200">{index === 0 ? "Live" : "Queued"}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
            className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-300/15 sm:h-80 sm:w-80"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 42, repeat: Infinity, ease: "linear" }}
            className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-stone-200/10 sm:h-60 sm:w-60"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.65 }}
            className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-amber-300/25 bg-black/40 shadow-2xl shadow-amber-950/30 backdrop-blur sm:h-32 sm:w-32"
          >
            <Image
              src="/groenics-logo.jpeg"
              alt=""
              width={84}
              height={84}
              className="h-20 w-20 rounded-xl object-cover sm:h-24 sm:w-24"
              priority
            />
          </motion.div>

          {systemNodes.map((node, index) => (
            <motion.div
              key={node.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.8 + index * 0.12 }}
              className={`absolute ${node.className}`}
            >
              <motion.div
                animate={{ y: [0, index % 2 === 0 ? -6 : 6, 0] }}
                transition={{ duration: 5 + index, repeat: Infinity, ease: "easeInOut" }}
                className="rounded-full border border-amber-300/20 bg-[#0b0a08]/85 px-4 py-2 text-xs font-semibold text-amber-100 shadow-lg shadow-black/30 backdrop-blur"
              >
                {node.label}
              </motion.div>
            </motion.div>
          ))}
        </div>
      </motion.div>

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
