export default function ApplyPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white py-24 px-6">
      <div className="max-w-4xl mx-auto">

        <p className="text-center text-amber-300 uppercase tracking-[0.3em] text-xs font-semibold mb-5">
          Project Intake
        </p>
        <h1 className="text-5xl font-bold text-center mb-6">
          Start A Project With{" "}
          <span className="bg-linear-to-r from-amber-100 to-yellow-700 bg-clip-text text-transparent">
            Groenics
          </span>
        </h1>

        <p className="text-center text-gray-400 mb-12">
          Tell us what you want to solve, build, automate, or grow. We can help with strategy, execution, software, AI, systems, and growth.
        </p>

        <form
          action="https://formspree.io/f/xbdejzzo"
          method="POST"
          className="brand-panel border border-amber-300/15 rounded-3xl p-8 md:p-10 space-y-6"
        >
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            required
            className="w-full p-4 rounded-xl bg-black/25 border border-amber-300/10 focus:outline-none focus:border-amber-300/50"
          />

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            required
            className="w-full p-4 rounded-xl bg-black/25 border border-amber-300/10 focus:outline-none focus:border-amber-300/50"
          />

          <input
            type="text"
            name="company"
            placeholder="Company / Business Name"
            className="w-full p-4 rounded-xl bg-black/25 border border-amber-300/10 focus:outline-none focus:border-amber-300/50"
          />

          <input
            type="text"
            name="industry"
            placeholder="Industry"
            className="w-full p-4 rounded-xl bg-black/25 border border-amber-300/10 focus:outline-none focus:border-amber-300/50"
          />

          <input
            type="text"
            name="revenue"
            placeholder="Current Monthly Revenue"
            className="w-full p-4 rounded-xl bg-black/25 border border-amber-300/10 focus:outline-none focus:border-amber-300/50"
          />

          <input
            type="text"
            name="team"
            placeholder="Team Size"
            className="w-full p-4 rounded-xl bg-black/25 border border-amber-300/10 focus:outline-none focus:border-amber-300/50"
          />

          <textarea
            rows={4}
            name="idea"
            placeholder="Describe your business challenge, project, or idea"
            className="w-full p-4 rounded-xl bg-black/25 border border-amber-300/10 focus:outline-none focus:border-amber-300/50"
          />

          <textarea
            rows={5}
            name="why"
            placeholder="What kind of strategy, execution, or build support do you need?"
            className="w-full p-4 rounded-xl bg-black/25 border border-amber-300/10 focus:outline-none focus:border-amber-300/50"
          />

          <button
            type="submit"
            className="px-8 py-4 bg-amber-300 hover:bg-amber-200 text-black font-semibold rounded-full transition"
          >
            Submit Application
          </button>
        </form>

      </div>
    </main>
  );
}
