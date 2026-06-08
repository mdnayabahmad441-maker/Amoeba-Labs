"use client";

import { motion } from "framer-motion";

const stats = [
  { value: "360", label: "Business View", sub: "Strategy, systems, growth" },
  { value: "AI", label: "Enabled Execution", sub: "Automation where it matters" },
  { value: "End", label: "To End Delivery", sub: "Plan, build, launch, improve" },
  { value: "2025", label: "Founded", sub: "Built for modern businesses" },
];

export default function Stats() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Top separator */}
        <div className="h-px bg-linear-to-r from-transparent via-white/10 to-transparent mb-16" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.09 }}
            >
              {/* Gradient border wrapper */}
              <div className="p-px rounded-2xl bg-linear-to-br from-white/10 via-transparent to-cyan-500/10 h-full">
                <div className="rounded-2xl bg-[#071a35] hover:bg-[#081e3a] transition-colors duration-300 p-6 md:p-8 h-full flex flex-col justify-between">
                  <div className="text-4xl md:text-5xl font-bold bg-linear-to-br from-cyan-300 to-blue-400 bg-clip-text text-transparent mb-3">
                    {stat.value}
                  </div>
                  <div>
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
        <div className="h-px bg-linear-to-r from-transparent via-white/10 to-transparent mt-16" />
      </div>
    </section>
  );
}
