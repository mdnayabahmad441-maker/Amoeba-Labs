"use client";

import { motion } from "framer-motion";

function WhatsAppIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      className="h-6 w-6"
      fill="currentColor"
    >
      <path d="M16.03 3.5A12.42 12.42 0 0 0 5.36 25.3l-1.1 4.2 4.31-1.07A12.42 12.42 0 1 0 16.03 3.5Zm0 22.7c-2.05 0-3.95-.6-5.56-1.65l-.4-.25-2.56.64.66-2.48-.27-.41a10.17 10.17 0 1 1 8.13 4.15Zm5.74-7.62c-.31-.16-1.86-.92-2.15-1.02-.29-.11-.5-.16-.71.16-.21.31-.81 1.02-.99 1.23-.18.21-.37.24-.68.08-.31-.16-1.32-.49-2.51-1.55-.93-.83-1.56-1.86-1.74-2.17-.18-.31-.02-.48.14-.64.14-.14.31-.37.47-.55.16-.18.21-.31.31-.52.1-.21.05-.39-.03-.55-.08-.16-.71-1.71-.97-2.34-.26-.61-.52-.53-.71-.54h-.6c-.21 0-.55.08-.84.39-.29.31-1.1 1.08-1.1 2.62s1.13 3.04 1.29 3.25c.16.21 2.22 3.39 5.38 4.75.75.32 1.34.52 1.8.66.76.24 1.45.21 1.99.13.61-.09 1.86-.76 2.12-1.5.26-.73.26-1.36.18-1.5-.08-.13-.29-.21-.61-.37Z" />
    </svg>
  );
}

export default function Contact() {
  const contactItems = [
    {
      icon: <WhatsAppIcon />,
      label: "WhatsApp Contact",
      value: "9334206953",
      action: "Message directly",
      href: "https://wa.me/919334206953",
    },
    { icon: "IN", label: "Location", value: "Remote - Global", action: "" },
    { icon: "24h", label: "Response Time", value: "Within 24 hours", action: "" },
  ];

  return (
    <section id="contact" className="py-28 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <p className="text-amber-300 uppercase tracking-[0.3em] text-xs font-semibold mb-5">
              Get In Touch
            </p>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Let&apos;s Build{" "}
              <span className="bg-linear-to-r from-amber-200 to-yellow-600 bg-clip-text text-transparent">
                Together
              </span>
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed mb-12">
              Whether you need strategy, execution, automation, software,
              growth systems, or a complete business buildout, we&apos;d love to
              start a conversation.
            </p>

            <div className="space-y-6">
              {contactItems.map((item) => {
                const content = (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-amber-300/5 border border-amber-300/10 flex items-center justify-center text-amber-200 text-sm font-bold shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs uppercase tracking-widest mb-0.5">
                        {item.label}
                      </p>
                      <p className="text-white font-medium text-sm">{item.value}</p>
                    </div>
                  </>
                );

                if (item.href) {
                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Message Groenics on WhatsApp"
                      className="group flex items-center gap-4 p-4 rounded-xl border border-[#25D366]/25 bg-[#25D366]/10 hover:border-[#25D366]/55 hover:bg-[#25D366]/15 transition-all duration-300"
                    >
                      <div className="w-12 h-12 rounded-xl bg-[#25D366] text-black flex items-center justify-center shrink-0 shadow-lg shadow-[#25D366]/15 group-hover:scale-105 transition-transform">
                        {item.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[#8ff0b4] text-xs uppercase tracking-widest mb-0.5">
                          {item.label}
                        </p>
                        <p className="text-white font-semibold text-base">{item.value}</p>
                        <p className="text-[#8ff0b4]/75 text-xs mt-1">{item.action}</p>
                      </div>
                      <span className="h-9 w-9 rounded-full border border-[#25D366]/25 flex items-center justify-center text-[#8ff0b4] group-hover:bg-[#25D366] group-hover:text-black transition-colors">
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7M9 7h8v8" />
                        </svg>
                      </span>
                    </a>
                  );
                }

                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-4 p-4 rounded-xl border border-amber-300/10 bg-black/20 hover:border-amber-300/25 transition-colors"
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="p-px rounded-3xl bg-linear-to-br from-amber-300/20 via-transparent to-white/5">
              <form
                action="https://formspree.io/f/xeewqrzw"
                method="POST"
                className="rounded-3xl brand-panel p-8 space-y-5"
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
                      className="w-full px-4 py-3 rounded-xl bg-black/25 border border-amber-300/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-300/50 focus:bg-amber-300/5 transition-all text-sm"
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
                      className="w-full px-4 py-3 rounded-xl bg-black/25 border border-amber-300/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-300/50 focus:bg-amber-300/5 transition-all text-sm"
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
                    className="w-full px-4 py-3 rounded-xl bg-black/25 border border-amber-300/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-300/50 focus:bg-amber-300/5 transition-all text-sm"
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
                    className="w-full px-4 py-3 rounded-xl bg-black/25 border border-amber-300/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-300/50 focus:bg-amber-300/5 transition-all resize-none text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-amber-300 hover:bg-amber-200 text-black font-bold rounded-full transition-all duration-300 shadow-lg shadow-amber-900/20 hover:shadow-amber-300/30 hover:scale-[1.01] text-sm"
                >
                  Send Message
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
