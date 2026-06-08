export default function Footer() {
  const links = [
    { label: "Services", href: "#services" },
    { label: "Portfolio", href: "#portfolio" },
    { label: "About", href: "#about" },
    { label: "Contact", href: "#contact" },
    { label: "Apply", href: "/apply" },
  ];

  return (
    <footer className="relative border-t border-white/8 py-12 px-6 overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-24 bg-cyan-500/4 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-xl font-bold tracking-tight">
              AMOEBA{" "}
              <span className="bg-linear-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                LABS
              </span>
            </h3>
            <p className="text-gray-600 text-sm mt-1">
              Building AI ventures for the next decade.
            </p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-6">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-gray-600 hover:text-gray-300 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Copyright */}
          <p className="text-gray-700 text-sm">
            © 2025 Amoeba Labs
          </p>
        </div>
      </div>
    </footer>
  );
}
