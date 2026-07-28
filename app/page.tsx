import type { Metadata } from "next";
import { GroenicsHome } from "@/components/GroenicsPages";

export const metadata: Metadata = {
  title: { absolute: "Groenics" },
  description: "Groenics builds practical AI automation, ERP, CRM, dashboards, websites, and custom business systems for schools, clinics, manufacturers, distributors, and growing companies.",
  alternates: { canonical: "/" },
};

export default function Home() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Groenics",
    url: "https://www.groenics.online",
    logo: "https://www.groenics.online/groenics-logo.png",
    founder: { "@type": "Person", name: "Nayab Ahmad", jobTitle: "Founder & CEO" },
    areaServed: "India",
    description: "Business systems, AI automation, ERP, CRM, dashboards, websites and custom software for growing businesses.",
    contactPoint: { "@type": "ContactPoint", telephone: "+91-93342-06953", contactType: "sales" },
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
    <GroenicsHome />
  </>;
}
