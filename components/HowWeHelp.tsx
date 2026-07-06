"use client";

import { motion } from "framer-motion";

const helpItems = [
  {
    number: "01",
    title: "Understand your business",
    description:
      "We learn how your revenue, operations, people, tools, customers, and management routines actually work today.",
  },
  {
    number: "02",
    title: "Identify hidden problems",
    description:
      "We find revenue leaks, time waste, manual processes, customer experience issues, sales inefficiencies, and reporting gaps.",
  },
  {
    number: "03",
    title: "Prioritize what matters most",
    description:
      "We estimate impact, effort, savings, and risk so the first solution targets the problem with the strongest business case.",
  },
  {
    number: "04",
    title: "Build the right AI solution",
    description:
      "We design AI workflows, automations, dashboards, CRMs, internal tools, or custom software around the business problem.",
  },
  {
    number: "05",
    title: "Implement and automate",
    description:
      "We connect the solution to your team, tools, data, approvals, and daily workflows so it becomes part of how work gets done.",
  },
  {
    number: "06",
    title: "Measure results and continuously improve",
    description:
      "We track time saved, revenue recovered, cycle time, customer experience, and operating visibility, then keep improving the system.",
  },
];

export default function HowWeHelp() {
  return (
    <section id="framework" className="px-6 py-24">
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
              Groenics Business Problem Framework
            </p>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight">
              Business first, technology{" "}
              <span className="bg-linear-to-r from-amber-100 to-yellow-700 bg-clip-text text-transparent">
                second
              </span>
            </h2>
            <p className="mt-6 text-lg text-stone-400 leading-relaxed">
              We do not begin with a tool demo. We begin by understanding the
              business problem, the cost of leaving it unsolved, and the result
              that would make the project worth doing.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.65, delay: 0.15 }}
              className="mt-10 hidden max-w-md overflow-hidden rounded-2xl border border-amber-300/10 bg-black/20 p-5 lg:block"
            >
              <div className="relative h-44">
                <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-amber-300/25 bg-amber-300/8" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
                  className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-amber-300/18"
                />
                {["Problem", "Impact", "Solution", "Result"].map((label, index) => {
                  const positions = [
                    "left-2 top-4",
                    "right-3 top-7",
                    "left-6 bottom-5",
                    "right-1 bottom-7",
                  ];
                  return (
                    <motion.div
                      key={label}
                      animate={{ y: [0, index % 2 === 0 ? -5 : 5, 0] }}
                      transition={{ duration: 4 + index, repeat: Infinity, ease: "easeInOut" }}
                      className={`absolute ${positions[index]} rounded-full border border-amber-300/15 bg-[#0b0a08]/90 px-3 py-1.5 text-xs text-amber-100`}
                    >
                      {label}
                    </motion.div>
                  );
                })}
                <div className="absolute left-1/2 top-1/2 h-px w-full -translate-x-1/2 bg-linear-to-r from-transparent via-amber-300/25 to-transparent" />
                <div className="absolute left-1/2 top-1/2 h-full w-px -translate-y-1/2 bg-linear-to-b from-transparent via-amber-300/20 to-transparent" />
              </div>
            </motion.div>
          </motion.div>

          <div className="relative grid gap-4">
            <div className="absolute left-6 top-8 bottom-8 hidden w-px bg-linear-to-b from-amber-300/5 via-amber-300/30 to-amber-300/5 sm:block" />
            {helpItems.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: index * 0.08 }}
                whileHover={{ x: 6 }}
                className="group relative overflow-hidden rounded-2xl border border-amber-300/10 brand-panel p-6 transition-colors hover:border-amber-300/25"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-amber-300/35 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-300/15 bg-black/30 font-mono text-sm font-bold text-amber-200">
                    <motion.span
                      animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0, 0.4] }}
                      transition={{ duration: 2.4, delay: index * 0.25, repeat: Infinity, ease: "easeOut" }}
                      className="absolute inset-0 rounded-xl border border-amber-300/25"
                    />
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
