"use client";

import { motion } from "framer-motion";

const services = [
  {
    number: "01",
    icon: "01",
    title: "Business Strategy",
    description:
      "Clear plans for growth, positioning, operations, technology, and revenue. We turn vague goals into executable roadmaps.",
    accent: "from-amber-300/20 to-amber-300/5",
    border: "from-amber-300/30 via-transparent to-transparent",
  },
  {
    number: "02",
    icon: "02",
    title: "Execution Systems",
    description:
      "Operating systems, workflows, KPIs, team processes, and management tools that help the business actually move.",
    accent: "from-yellow-700/20 to-yellow-700/5",
    border: "from-yellow-700/30 via-transparent to-transparent",
  },
  {
    number: "03",
    icon: "03",
    title: "AI & Automation",
    description:
      "Practical AI workflows, assistants, dashboards, and automations that reduce manual work and improve decisions.",
    accent: "from-stone-300/12 to-stone-500/5",
    border: "from-stone-300/20 via-transparent to-transparent",
  },
  {
    number: "04",
    icon: "04",
    title: "Product & Software",
    description:
      "Websites, SaaS platforms, CRMs, portals, ERP modules, internal tools, and custom software built around your business.",
    accent: "from-yellow-900/25 to-yellow-900/5",
    border: "from-yellow-800/35 via-transparent to-transparent",
  },
  {
    number: "05",
    icon: "05",
    title: "Sales & Growth",
    description:
      "Lead systems, funnels, go-to-market planning, customer journeys, reporting, and growth operations.",
    accent: "from-lime-900/20 to-lime-900/5",
    border: "from-lime-800/25 via-transparent to-transparent",
  },
  {
    number: "06",
    icon: "06",
    title: "End-to-End Buildout",
    description:
      "From idea to launch and beyond. We can plan, design, build, deploy, measure, and iterate with your team.",
    accent: "from-orange-950/30 to-orange-950/5",
    border: "from-orange-900/30 via-transparent to-transparent",
  },
];

export default function Services() {
  return (
    <section id="services" className="py-28 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl mb-20"
        >
          <p className="text-amber-300 uppercase tracking-[0.3em] text-xs font-semibold mb-4">
            What We Do
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">
            Complete{" "}
            <span className="bg-linear-to-r from-amber-200 to-yellow-600 bg-clip-text text-transparent">
              Business Solutions
            </span>
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            We do more than advise. We help define the strategy, build the
            systems, execute the work, and improve the business with measurable
            follow-through.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.07 }}
            >
              <div className={`p-px rounded-2xl bg-linear-to-br ${service.border} h-full`}>
                <div className="group rounded-2xl brand-panel hover:bg-[#15120c] transition-all duration-300 p-7 h-full flex flex-col relative overflow-hidden">
                  <div className={`absolute inset-0 bg-linear-to-br ${service.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`} />

                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-5">
                      <span className="text-amber-200 font-mono text-xl font-bold">
                        {service.icon}
                      </span>
                      <span className="text-gray-700 font-mono text-sm font-bold">
                        {service.number}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-3">{service.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed flex-1">
                      {service.description}
                    </p>

                    <div className="mt-5 flex items-center gap-1.5 text-xs text-gray-600 group-hover:text-amber-300 transition-colors duration-300">
                      <span>Learn more</span>
                      <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
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
