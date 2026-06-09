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
          <p className="text-cyan-400 uppercase tracking-[0.3em] text-xs font-semibold mb-4">
            Portfolio
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-5">
            Our{" "}
            <span className="bg-linear-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
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
          <div className="p-px rounded-3xl bg-linear-to-br from-cyan-500/30 via-blue-500/10 to-transparent">
            <div className="rounded-3xl bg-[#071a35] p-8 md:p-12 relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />

              <div className="relative z-10 grid md:grid-cols-2 gap-10 items-center">
                {/* Left */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                      School ERP · AI · SaaS
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-cyan-500/15 text-cyan-400 border-cyan-500/30">
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
                    <span className="text-cyan-400 font-medium">NEET</span>,{" "}
                    <span className="text-cyan-400 font-medium">CBSE</span>, and{" "}
                    <span className="text-cyan-400 font-medium">JEE</span> syllabi.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {["School ERP", "Fee & Billing", "Admissions", "AI Question Generator", "NEET / CBSE / JEE", "Staff Management"].map(
                      (tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1.5 rounded-full border border-white/10 bg-white/4 text-gray-400 text-xs"
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
                      className="bg-white/4 border border-white/8 rounded-2xl p-4"
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
                <div className="rounded-2xl bg-[#071a35] p-7 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-gray-600 uppercase tracking-wider">TBD</span>
                    <span className="px-3 py-1 rounded-full text-xs border bg-white/4 text-gray-500 border-white/10">
                      Coming Soon
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{v.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-5 flex-1">{v.desc}</p>
                  <div className="flex gap-2">
                    {v.tags.map((tag) => (
                      <span key={tag} className="px-3 py-1 rounded-full bg-white/4 border border-white/8 text-gray-500 text-xs">
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
