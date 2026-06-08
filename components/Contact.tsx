"use client";

import { motion } from "framer-motion";

export default function Contact() {
  return (
    <section id="contact" className="py-28 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-start">

          {/* Left — Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <p className="text-cyan-400 uppercase tracking-[0.3em] text-xs font-semibold mb-5">
              Get In Touch
            </p>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Let&apos;s Build{" "}
              <span className="bg-linear-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Together
              </span>
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed mb-12">
              Whether you need strategy, execution, automation, software,
              growth systems, or a complete business buildout, we&apos;d love to
              start a conversation.
            </p>

            <div className="space-y-6">
              {[
                { icon: "📧", label: "Email", value: "hello@amoebalabs.com" },
                { icon: "🌍", label: "Location", value: "Remote — Global" },
                { icon: "⚡", label: "Response Time", value: "Within 24 hours" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-4 p-4 rounded-xl border border-white/8 bg-white/2 hover:border-white/15 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-white/4 border border-white/8 flex items-center justify-center text-xl shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase tracking-widest mb-0.5">
                      {item.label}
                    </p>
                    <p className="text-white font-medium text-sm">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right — Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="p-px rounded-3xl bg-linear-to-br from-white/12 via-transparent to-cyan-500/10">
              <form
                action="https://formspree.io/f/xeewqrzw"
                method="POST"
                className="rounded-3xl bg-[#071a35] p-8 space-y-5"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Your name"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-white/4 border border-white/8 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/6 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">
                      Company
                    </label>
                    <input
                      type="text"
                      name="company"
                      placeholder="Your company"
                      className="w-full px-4 py-3 rounded-xl bg-white/4 border border-white/8 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/6 transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="your@email.com"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/4 border border-white/8 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/6 transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">
                    Message *
                  </label>
                  <textarea
                    rows={5}
                    name="message"
                    placeholder="Tell us what you want to solve, build, automate, or grow..."
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/4 border border-white/8 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/6 transition-all resize-none text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-full transition-all duration-300 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/30 hover:scale-[1.01] text-sm"
                >
                  Send Message →
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
