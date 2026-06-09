"use client";

import { motion } from "framer-motion";

export default function Portfolio() {
  return (
    <section id="portfolio" className="py-28 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <p className="text-amber-300 uppercase tracking-[0.3em] text-xs font-semibold mb-4">
            Portfolio
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-5">
            Our{" "}
            <span className="bg-linear-to-r from-amber-200 to-yellow-600 bg-clip-text text-transparent">
              Ventures
            </span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto text-lg">
            Companies and products being built inside the Nayab Labs ecosystem.
          </p>
        </motion.div>

        {/* Featured venture */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-5"
        >
          <div className="p-px rounded-3xl bg-linear-to-br from-amber-300/30 via-yellow-700/10 to-transparent">
            <div className="rounded-3xl brand-panel p-8 md:p-12 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-amber-300/45 to-transparent" />
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(244,213,138,0.07),transparent_42%,rgba(255,255,255,0.03))]" />

              <div className="relative z-10 grid md:grid-cols-2 gap-10 items-center">
                {/* Left */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                      School ERP · AI · SaaS
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-amber-300/15 text-amber-300 border-amber-300/30">
                      ● Building
                    </span>
                  </div>

                  <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                    NaySha Educore
                  </h3>

                  <p className="text-gray-400 leading-relaxed mb-8">
                    A complete ERP platform built exclusively for schools and
                    educational institutions. Manages admissions, students, staff,
                    timetables, fees, billing, and reporting — plus an AI engine
                    that generates exam-ready questions aligned to{" "}
                    <span className="text-amber-300 font-medium">NEET</span>,{" "}
                    <span className="text-amber-300 font-medium">CBSE</span>, and{" "}
                    <span className="text-amber-300 font-medium">JEE</span> syllabi.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {["School ERP", "Fee & Billing", "Admissions", "AI Question Generator", "NEET / CBSE / JEE", "Staff Management"].map(
                      (tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1.5 rounded-full border border-amber-300/10 bg-black/20 text-stone-400 text-xs"
                        >
                          {tag}
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* Right — mini metrics */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: "🏫", label: "Target", value: "Schools" },
                    { icon: "📦", label: "ERP Modules", value: "10+" },
                    { icon: "🧠", label: "AI Questions", value: "NEET/JEE/CBSE" },
                    { icon: "🌍", label: "Deployment", value: "SaaS" },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="bg-black/20 border border-amber-300/10 rounded-2xl p-4"
                    >
                      <span className="text-2xl block mb-2">{m.icon}</span>
                      <div className="text-white font-bold text-lg">{m.value}</div>
                      <div className="text-gray-500 text-xs mt-0.5">{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Coming soon ventures */}
        <div className="grid md:grid-cols-2 gap-5">
          {[
            {
              title: "Future Venture II",
              desc: "Currently in stealth. Built on insights from our first venture launch.",
              tags: ["Ideation", "Research"],
            },
            {
              title: "Future Venture III",
              desc: "A third AI-first product targeting a new vertical. Architecture in progress.",
              tags: ["Architecture", "Planning"],
            },
          ].map((v, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <div className="p-px rounded-2xl bg-linear-to-br from-white/8 to-transparent h-full">
                <div className="rounded-2xl brand-panel p-7 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-gray-600 uppercase tracking-wider">TBD</span>
                    <span className="px-3 py-1 rounded-full text-xs border bg-amber-300/5 text-gray-500 border-amber-300/10">
                      Coming Soon
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{v.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-5 flex-1">{v.desc}</p>
                  <div className="flex gap-2">
                    {v.tags.map((tag) => (
                      <span key={tag} className="px-3 py-1 rounded-full bg-black/20 border border-amber-300/10 text-gray-500 text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
