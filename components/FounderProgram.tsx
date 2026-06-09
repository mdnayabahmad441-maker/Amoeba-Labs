"use client";

import { motion } from "framer-motion";

export default function FounderProgram() {
  return (
    <section id="about" className="py-28 px-6">
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
                <div className="grid md:grid-cols-2 gap-12 items-center">
                  <div>
                    <p className="text-amber-300 uppercase tracking-[0.3em] text-xs font-semibold mb-5">
                      Build With Us
                    </p>
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                      Need Strategy And{" "}
                      <span className="bg-linear-to-r from-amber-100 via-yellow-600 to-stone-200 bg-clip-text text-transparent">
                        Execution?
                      </span>
                    </h2>
                    <p className="text-gray-400 text-lg leading-relaxed mb-8">
                      Bring the business challenge. We help define the plan,
                      organize the work, build the tools, automate the process,
                      and execute with your team until the outcome is real.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <a
                        href="/apply"
                        className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-amber-300 hover:bg-amber-200 text-black font-bold rounded-full transition-all duration-300 shadow-lg shadow-amber-900/20 hover:shadow-amber-300/30 hover:scale-[1.02] text-sm"
                      >
                        Start A Project
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </a>
                      <a
                        href="#contact"
                        className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-amber-300/20 hover:border-amber-200/45 rounded-full text-white font-medium transition-all duration-300 hover:bg-amber-300/5 text-sm"
                      >
                        Talk To Us First
                      </a>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      { icon: "01", title: "Strategy Roadmap", desc: "Business goals, priorities, execution plan, and success metrics." },
                      { icon: "02", title: "Systems Buildout", desc: "Software, workflows, dashboards, CRMs, and internal tools." },
                      { icon: "03", title: "AI Integration", desc: "AI and automation added where they improve speed or quality." },
                      { icon: "04", title: "Growth Execution", desc: "Sales systems, launch plans, reporting, and continuous iteration." },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="flex items-start gap-4 p-4 rounded-xl bg-black/20 border border-amber-300/10 hover:border-amber-300/25 transition-colors"
                      >
                        <span className="text-amber-200 font-mono text-sm font-bold shrink-0">{item.icon}</span>
                        <div>
                          <div className="text-white font-semibold text-sm mb-0.5">{item.title}</div>
                          <div className="text-gray-500 text-xs leading-relaxed">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
