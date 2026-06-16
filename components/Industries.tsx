"use client";

import { motion } from "framer-motion";

const industries = [
  {
    name: "Manufacturing",
    challenges:
      "Disconnected production visibility, manual reporting, inventory leakage, inconsistent quality controls, and limited management insight across teams or plants.",
    approach:
      "Groenics maps operational bottlenecks, redesigns workflows, strengthens performance routines, and creates connected operating systems for planning, production, quality, and reporting.",
    outcomes:
      "Higher throughput, reduced downtime, better cost control, improved quality discipline, and faster leadership decisions.",
  },
  {
    name: "Education",
    challenges:
      "Manual administration, fragmented student data, slow admissions, weak parent communication, poor reporting, and limited visibility into institutional performance.",
    approach:
      "Groenics streamlines academic and administrative operations, systemizes the student lifecycle, improves departmental coordination, and builds clearer reporting structures.",
    outcomes:
      "Faster administration, better student and parent experience, stronger compliance, improved reporting, and scalable institutional management.",
  },
  {
    name: "Healthcare",
    challenges:
      "Operational delays, manual patient workflows, poor coordination, limited performance visibility, and pressure to improve service quality without adding complexity.",
    approach:
      "Groenics improves patient journey processes, clarifies internal responsibilities, strengthens reporting, and helps leadership manage service delivery with better operational control.",
    outcomes:
      "Improved patient experience, faster coordination, better resource utilization, stronger governance, and more reliable service delivery.",
  },
  {
    name: "SMEs",
    challenges:
      "Founder-dependent operations, informal processes, limited reporting, manual workflows, weak follow-up discipline, and growth constrained by operational complexity.",
    approach:
      "Groenics identifies execution gaps, standardizes core processes, creates practical management routines, and helps teams run the business with more structure and accountability.",
    outcomes:
      "Reduced dependency on individuals, clearer visibility, stronger productivity, improved follow-through, and a more scalable operating foundation.",
  },
  {
    name: "Mid-Market Companies",
    challenges:
      "Scaling complexity, inconsistent processes across departments, underused data, limited AI readiness, and difficulty turning strategy into repeatable execution.",
    approach:
      "Groenics redesigns operating models, improves cross-functional workflows, builds decision visibility, and guides practical AI adoption tied to clear business priorities.",
    outcomes:
      "Faster execution, stronger management control, improved margins, better customer experience, and readiness for the next stage of growth.",
  },
  {
    name: "Enterprises",
    challenges:
      "Siloed operations, complex transformation programs, legacy processes, slow adoption, inconsistent reporting, and difficulty converting strategy into measurable outcomes.",
    approach:
      "Groenics aligns people, processes, systems, and execution plans around performance improvement, governance, adoption, and enterprise-wide operating discipline.",
    outcomes:
      "Greater efficiency, improved adoption, stronger governance, better data-driven decisions, and measurable transformation impact.",
  },
  {
    name: "Government Organizations",
    challenges:
      "Manual service workflows, fragmented records, slow reporting, limited transparency, and growing expectations for faster, more accountable public service delivery.",
    approach:
      "Groenics streamlines administrative processes, improves oversight, supports digital service delivery, and creates clearer accountability across public-sector operations.",
    outcomes:
      "Faster service delivery, improved transparency, stronger compliance, better operational oversight, and more citizen-focused outcomes.",
  },
];

const summaryItems = [
  "Operational Excellence",
  "AI Readiness",
  "Process Visibility",
  "Scalable Growth",
];

export default function Industries() {
  return (
    <section id="industries" className="px-6 py-28">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65 }}
            className="lg:sticky lg:top-28"
          >
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.3em] text-amber-300">
              Who We Help
            </p>
            <h2 className="text-4xl font-bold leading-tight md:text-5xl">
              Built for organizations with{" "}
              <span className="bg-linear-to-r from-amber-100 to-yellow-700 bg-clip-text text-transparent">
                complex operations
              </span>
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-stone-400">
              Groenics works with leadership teams that need clearer processes,
              stronger visibility, AI-ready operations, and measurable business
              improvement across the organization.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {summaryItems.map((item, index) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: index * 0.06 }}
                  className="rounded-xl border border-amber-300/10 bg-black/20 px-4 py-3"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                    {item}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-2">
            {industries.map((industry, index) => (
              <motion.article
                key={industry.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: index * 0.05 }}
                whileHover={{ y: -5 }}
                className="group relative overflow-hidden rounded-2xl border border-amber-300/10 brand-panel p-6 transition-colors hover:border-amber-300/25"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-amber-300/35 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="mb-6 flex items-start justify-between gap-4">
                  <h3 className="text-xl font-bold text-white">
                    {industry.name}
                  </h3>
                  <span className="font-mono text-sm font-bold text-amber-200/70">
                    {(index + 1).toString().padStart(2, "0")}
                  </span>
                </div>

                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-amber-300/75">
                      Business Challenges
                    </p>
                    <p className="text-sm leading-relaxed text-stone-500">
                      {industry.challenges}
                    </p>
                  </div>
                  <div>
                    <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-amber-300/75">
                      Groenics Approach
                    </p>
                    <p className="text-sm leading-relaxed text-stone-500">
                      {industry.approach}
                    </p>
                  </div>
                  <div>
                    <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-amber-300/75">
                      Outcomes Delivered
                    </p>
                    <p className="text-sm leading-relaxed text-stone-300">
                      {industry.outcomes}
                    </p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
