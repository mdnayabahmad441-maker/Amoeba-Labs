import Image from "next/image";

export default function Footer() {
  const links = [
    { label: "Services", href: "#services" },
    { label: "Portfolio", href: "#portfolio" },
    { label: "About", href: "#about" },
    { label: "Contact", href: "#contact" },
    { label: "Apply", href: "/apply" },
  ];

  return (
    <footer className="relative border-t border-amber-300/10 py-12 px-6 overflow-hidden">
      <div className="relative max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Image
              src="/nayab-labs-logo.jpeg"
              alt="Nayab Labs"
              width={44}
              height={44}
              className="h-11 w-11 rounded-lg object-cover"
            />
            <div>
              <h3 className="text-xl font-bold tracking-tight">
                NAYAB{" "}
                <span className="bg-linear-to-r from-amber-100 to-yellow-700 bg-clip-text text-transparent">
                  LABS
                </span>
              </h3>
              <p className="text-gray-600 text-sm mt-1">
                Strategy, systems, AI, and execution.
              </p>
            </div>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-6">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-gray-600 hover:text-amber-100 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Copyright */}
          <p className="text-gray-700 text-sm">
            &copy; 2025 Nayab Labs
          </p>
        </div>
      </div>
    </footer>
  );
}
