"use client";

import { motion } from "framer-motion";

const helpItems = [
  {
    number: "01",
    title: "Find what is slowing the business down",
    description:
      "We map your current work, sales flow, tools, team process, and reporting gaps so the next move is based on reality.",
  },
  {
    number: "02",
    title: "Design a practical operating system",
    description:
      "We turn scattered tasks into clear workflows, dashboards, ownership, follow-ups, and measurable business routines.",
  },
  {
    number: "03",
    title: "Build software and automation where it matters",
    description:
      "We create portals, CRMs, websites, AI workflows, and internal tools that reduce manual work and improve execution.",
  },
  {
    number: "04",
    title: "Keep improving with data and follow-through",
    description:
      "We help track performance, improve bottlenecks, and keep the system useful as your business changes.",
  },
];

export default function HowWeHelp() {
  return (
    <section className="px-6 py-24">
      <div className="max-w-7xl mx-auto">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65 }}
            className="lg:sticky lg:top-28"
          >
            <p className="text-amber-300 uppercase tracking-[0.3em] text-xs font-semibold mb-5">
              How We Help
            </p>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight">
              We make your business{" "}
              <span className="bg-linear-to-r from-amber-100 to-yellow-700 bg-clip-text text-transparent">
                easier to run
              </span>
            </h2>
            <p className="mt-6 text-lg text-stone-400 leading-relaxed">
              Nayab Labs works with businesses that need clearer operations,
              better customer follow-up, stronger digital systems, and
              automation that saves real time.
            </p>
          </motion.div>

          <div className="grid gap-4">
            {helpItems.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: index * 0.08 }}
                className="group rounded-2xl border border-amber-300/10 brand-panel p-6 transition-colors hover:border-amber-300/25"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-300/15 bg-black/30 font-mono text-sm font-bold text-amber-200">
                    {item.number}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-stone-500">
                      {item.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
