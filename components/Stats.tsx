"use client";

import { motion } from "framer-motion";

const stats = [
  { value: "360", label: "Business View", sub: "Strategy, systems, growth" },
  { value: "AI", label: "Enabled Execution", sub: "Automation where it matters" },
  { value: "End", label: "To End Delivery", sub: "Plan, build, launch, improve" },
  { value: "2025", label: "Founded", sub: "Built for modern businesses" },
];

const signalWidths = ["w-10", "w-16", "w-12"];

export default function Stats() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Top separator */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          whileInView={{ scaleX: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="h-px origin-center gold-rule mb-16"
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.09 }}
              whileHover={{ y: -6 }}
            >
              {/* Gradient border wrapper */}
              <div className="p-px rounded-2xl bg-linear-to-br from-amber-300/20 via-white/5 to-transparent h-full">
                <div className="group relative overflow-hidden rounded-2xl brand-panel hover:bg-[#15120c] transition-colors duration-300 p-6 md:p-8 h-full flex flex-col justify-between">
                  <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-amber-300/35 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="absolute right-4 top-4 grid gap-1.5 opacity-35 transition-opacity group-hover:opacity-70">
                    {signalWidths.map((width, index) => (
                      <motion.span
                        key={width}
                        animate={{ opacity: [0.35, 1, 0.35], x: [0, 4, 0] }}
                        transition={{ duration: 2.6, delay: index * 0.18, repeat: Infinity, ease: "easeInOut" }}
                        className={`block h-1 rounded-full bg-amber-300/70 ${width}`}
                      />
                    ))}
                  </div>
                  <div className="relative text-4xl md:text-5xl font-bold bg-linear-to-br from-amber-100 to-yellow-700 bg-clip-text text-transparent mb-3">
                    {stat.value}
                  </div>
                  <div className="relative">
                    <div className="text-white font-semibold text-sm md:text-base mb-1">
                      {stat.label}
                    </div>
                    <div className="text-gray-500 text-xs md:text-sm">{stat.sub}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom separator */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          whileInView={{ scaleX: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="h-px origin-center gold-rule mt-16"
        />
      </div>
    </section>
  );
}
