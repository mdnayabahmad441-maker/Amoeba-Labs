"use client";

import { motion } from "framer-motion";

const problemAreas = [
  {
    number: "01",
    title: "Sales Problems",
    common: "Leads fall through the cracks, follow-ups are inconsistent, pipelines are unclear, and sales teams spend too much time updating tools instead of closing.",
    impact: "Lost revenue, longer sales cycles, poor forecasting, and missed opportunities hiding inside your existing demand.",
    solution: "We map the sales journey, fix handoffs, automate follow-ups, build CRM workflows, and add AI support for lead scoring, notes, reminders, and reporting.",
    results: "Faster response times, higher conversion, cleaner pipelines, and better visibility into revenue leaks.",
  },
  {
    number: "02",
    title: "Marketing Problems",
    common: "Campaigns run without clear attribution, content is inconsistent, leads are low quality, and marketing data sits across disconnected tools.",
    impact: "Wasted spend, weak positioning, slow learning cycles, and poor alignment between marketing and sales.",
    solution: "We clarify the growth funnel, connect campaign data, automate nurturing, and use AI to improve research, segmentation, content operations, and performance reporting.",
    results: "Better qualified leads, lower waste, clearer campaign decisions, and a marketing system tied to revenue.",
  },
  {
    number: "03",
    title: "Customer Support Problems",
    common: "Support teams repeat the same answers, tickets move slowly, knowledge is scattered, and customer context is hard to find.",
    impact: "Poor customer experience, overloaded teams, slow resolution, and avoidable churn.",
    solution: "We redesign support workflows, build knowledge systems, automate ticket routing, and create AI assistants that help customers and agents resolve issues faster.",
    results: "Shorter resolution times, fewer repetitive tasks, stronger service quality, and happier customers.",
  },
  {
    number: "04",
    title: "Operations Problems",
    common: "Processes depend on people remembering steps, work moves through spreadsheets, and managers lack real-time visibility.",
    impact: "Delays, rework, inconsistent execution, higher costs, and leadership decisions based on stale information.",
    solution: "We document workflows, remove bottlenecks, build internal tools, automate approvals, and create dashboards that show what is happening now.",
    results: "Smoother execution, lower operational drag, clearer ownership, and measurable time savings.",
  },
  {
    number: "05",
    title: "HR Problems",
    common: "Hiring, onboarding, leave, performance, and employee requests are handled manually or across disconnected systems.",
    impact: "Slow onboarding, poor employee experience, compliance risk, and managers spending time on administration.",
    solution: "We streamline HR workflows, automate routine requests, build onboarding journeys, and use AI to support screening, documentation, and employee self-service.",
    results: "Faster hiring support, smoother onboarding, less admin work, and better employee visibility.",
  },
  {
    number: "06",
    title: "Finance Problems",
    common: "Invoices, approvals, reconciliations, expense tracking, and cash visibility rely on manual work and delayed reporting.",
    impact: "Payment delays, errors, weak cost control, poor forecasting, and leadership uncertainty around financial health.",
    solution: "We automate finance workflows, connect data sources, create approval systems, and build reporting that highlights cash flow, leakage, and exceptions.",
    results: "Fewer errors, faster approvals, stronger controls, and clearer financial decisions.",
  },
  {
    number: "07",
    title: "Reporting & Analytics Problems",
    common: "Reports are built manually, metrics do not match across teams, and leadership cannot quickly see what is working.",
    impact: "Slow decisions, hidden problems, duplicated reporting effort, and strategy based on opinion instead of data.",
    solution: "We define the right metrics, connect systems, build dashboards, and add AI analysis that turns raw data into practical management insight.",
    results: "Reliable reporting, faster decisions, clearer priorities, and better measurement of business improvement.",
  },
  {
    number: "08",
    title: "Manual Workflow Problems",
    common: "Teams copy data between tools, send repeated emails, chase approvals, and maintain processes that should be automated.",
    impact: "Expensive time waste, avoidable mistakes, low morale, and growth that requires adding people before fixing systems.",
    solution: "We identify repetitive work, calculate savings, automate the right steps, and build custom software where off-the-shelf tools cannot solve the problem.",
    results: "Reduced manual work, fewer errors, faster cycle times, and more capacity without adding complexity.",
  },
];

function ProblemGraphic({ index }: { index: number }) {
  return (
    <div className="relative h-20 overflow-hidden rounded-xl border border-amber-300/10 bg-black/20">
      <div className="absolute inset-0 opacity-[0.13] bg-[linear-gradient(rgba(244,213,138,0.45)_1px,transparent_1px),linear-gradient(to_right,rgba(244,213,138,0.45)_1px,transparent_1px)] bg-[size:18px_18px]" />
      <motion.div
        animate={{ x: ["-20%", "120%"] }}
        transition={{ duration: 3.2 + index * 0.2, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/2 h-px w-24 bg-linear-to-r from-transparent via-amber-200/70 to-transparent"
      />
      <div className="absolute inset-4 grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((bar) => (
          <motion.span
            key={bar}
            animate={{ scaleY: [0.42, 1, 0.58], opacity: [0.35, 0.9, 0.45] }}
            transition={{ duration: 2.2, delay: bar * 0.16 + index * 0.05, repeat: Infinity, ease: "easeInOut" }}
            className="origin-bottom self-end rounded-sm border border-amber-300/10 bg-amber-300/10"
          />
        ))}
      </div>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        className="absolute right-4 top-4 h-9 w-9 rounded-full border border-dashed border-amber-300/25"
      />
    </div>
  );
}

export default function Services() {
  return (
    <section id="services" className="py-28 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl mb-20"
        >
          <p className="text-amber-300 uppercase tracking-[0.3em] text-xs font-semibold mb-4">
            Business Problems We Solve
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">
            We do not sell AI. We solve{" "}
            <span className="bg-linear-to-r from-amber-200 to-yellow-600 bg-clip-text text-transparent">
              business problems
            </span>
            .
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            We start with what is costing the business money, time, customers,
            or management clarity. Then we use AI, automation, and custom
            software only where they create measurable improvement.
          </p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2">
          {problemAreas.map((area, i) => (
            <motion.article
              key={area.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.04 }}
              whileHover={{ y: -6 }}
            >
              <div className="p-px rounded-2xl bg-linear-to-br from-amber-300/22 via-white/5 to-transparent h-full">
                <div className="group rounded-2xl brand-panel hover:bg-[#15120c] transition-all duration-300 p-6 h-full relative overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-amber-300/35 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="relative z-10">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <h3 className="text-xl font-bold text-white">{area.title}</h3>
                      <span className="font-mono text-sm font-bold text-amber-200/75">
                        {area.number}
                      </span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-amber-300/75">
                          Common Problems
                        </p>
                        <p className="text-sm leading-relaxed text-stone-500">{area.common}</p>
                      </div>
                      <div>
                        <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-amber-300/75">
                          Business Impact
                        </p>
                        <p className="text-sm leading-relaxed text-stone-500">{area.impact}</p>
                      </div>
                      <div>
                        <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-amber-300/75">
                          How Groenics Solves It
                        </p>
                        <p className="text-sm leading-relaxed text-stone-500">{area.solution}</p>
                      </div>
                      <div>
                        <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-amber-300/75">
                          Expected Results
                        </p>
                        <p className="text-sm leading-relaxed text-stone-300">{area.results}</p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <ProblemGraphic index={i} />
                    </div>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
