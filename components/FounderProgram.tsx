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
          <div className="p-px rounded-3xl bg-linear-to-br from-cyan-500/30 via-blue-500/15 to-purple-500/10">
            <div className="rounded-3xl relative overflow-hidden bg-[#071a35]">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-20%,rgba(0,229,255,0.1),transparent)]" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-32 bg-linear-to-b from-cyan-500/40 to-transparent" />
              <div className="absolute inset-0 bg-linear-to-br from-cyan-500/4 via-transparent to-blue-600/4" />

              <div className="relative z-10 px-8 md:px-16 py-16 md:py-20">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                  <div>
                    <p className="text-cyan-400 uppercase tracking-[0.3em] text-xs font-semibold mb-5">
                      Build With Us
                    </p>
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                      Need Strategy And{" "}
                      <span className="bg-linear-to-r from-cyan-400 via-blue-300 to-purple-400 bg-clip-text text-transparent">
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
                        className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-full transition-all duration-300 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/30 hover:scale-[1.02] text-sm"
                      >
                        Start A Project
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </a>
                      <a
                        href="#contact"
                        className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-white/15 hover:border-white/30 rounded-full text-white font-medium transition-all duration-300 hover:bg-white/4 text-sm"
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
                        className="flex items-start gap-4 p-4 rounded-xl bg-white/4 border border-white/8 hover:border-white/15 transition-colors"
                      >
                        <span className="text-cyan-300 font-mono text-sm font-bold shrink-0">{item.icon}</span>
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
