export default function About() {
  return (
    <section id="about" className="py-28 px-6 border-y border-amber-300/10">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-5xl font-bold mb-8">
          About{" "}
          <span className="bg-linear-to-r from-amber-100 to-yellow-700 bg-clip-text text-transparent">
            Nayab Labs
          </span>
        </h2>

        <p className="text-xl text-stone-300 leading-relaxed">
          Nayab Labs is a business solutions company for teams that need both
          thinking and execution. We help with strategy, operations, software,
          automation, AI adoption, growth systems, and the day-to-day buildout
          required to move a business forward.
        </p>
      </div>
    </section>
  );
}
