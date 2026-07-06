"use client";

import { motion } from "framer-motion";

const assessmentItems = [
  "Revenue leaks",
  "Time waste",
  "Manual processes",
  "Customer experience issues",
  "Sales inefficiencies",
  "Marketing gaps",
  "Operational problems",
  "AI opportunities",
  "Estimated savings",
  "Priority action plan",
];

export default function FounderProgram() {
  return (
    <section id="assessment" className="py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="p-px rounded-3xl bg-linear-to-br from-amber-300/30 via-yellow-700/15 to-white/5">
            <div className="rounded-3xl relative overflow-hidden brand-panel">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(244,213,138,0.08),transparent_45%,rgba(255,255,255,0.03))]" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-32 bg-linear-to-b from-amber-300/40 to-transparent" />

              <div className="relative z-10 px-8 md:px-16 py-16 md:py-20">
                <div className="grid md:grid-cols-[0.9fr_1.1fr] gap-12 items-start">
                  <div>
                    <p className="text-amber-300 uppercase tracking-[0.3em] text-xs font-semibold mb-5">
                      Free Business Assessment
                    </p>
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                      Know what is costing you before{" "}
                      <span className="bg-linear-to-r from-amber-100 via-yellow-600 to-stone-200 bg-clip-text text-transparent">
                        you build anything.
                      </span>
                    </h2>
                    <p className="text-gray-400 text-lg leading-relaxed mb-8">
                      The assessment is designed to uncover the problems that
                      slow growth, waste team capacity, damage customer
                      experience, or hide inside disconnected systems.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <a
                        href="#contact"
                        className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-amber-300 hover:bg-amber-200 text-black font-bold rounded-full transition-all duration-300 shadow-lg shadow-amber-900/20 hover:shadow-amber-300/30 hover:scale-[1.02] text-sm"
                      >
                        Get a Free Business Assessment
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </a>
                      <a
                        href="#services"
                        className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-amber-300/20 hover:border-amber-200/45 rounded-full text-white font-medium transition-all duration-300 hover:bg-amber-300/5 text-sm"
                      >
                        View Problem Areas
                      </a>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {assessmentItems.map((item, index) => (
                      <motion.div
                        key={item}
                        initial={{ opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.45, delay: index * 0.04 }}
                        className="flex items-start gap-3 rounded-xl bg-black/20 border border-amber-300/10 p-4 hover:border-amber-300/25 transition-colors"
                      >
                        <span className="mt-1 h-2 w-2 rounded-full bg-amber-300 shadow-sm shadow-amber-300/40" />
                        <div>
                          <div className="text-white font-semibold text-sm">{item}</div>
                          <div className="mt-1 text-gray-500 text-xs leading-relaxed">
                            Identified, prioritized, and tied to a practical next step.
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="mt-12 rounded-2xl border border-amber-300/10 bg-black/20 p-6">
                  <p className="text-lg font-semibold text-white">
                    Core promise: We Find Business Problems. We Build AI
                    Solutions. We Deliver Measurable Results.
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-stone-500">
                    Visitors should leave with one clear idea: Groenics
                    understands business first and technology second. We do not
                    sell AI for the sake of AI. We solve real business problems
                    and measure the result.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
