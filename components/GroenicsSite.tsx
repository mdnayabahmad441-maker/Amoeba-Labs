"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, ReactNode, useState } from "react";

export const whatsappUrl = "https://wa.me/919334206953";

const nav = [
  ["Home", "/"], ["Services", "/services"], ["Industries", "/industries"], ["School ERP", "/school-erp"],
  ["Manufacturing", "/manufacturing"], ["Clinics", "/clinics"], ["About", "/about"], ["Contact", "/contact"],
];

export function SiteShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="gb-site">
      <header className="gb-header">
        <Link className="gb-logo" href="/"><Image src="/groenics-logo.png" alt="Groenics" width={42} height={42} /><span><b>Groenics</b><small>Business Systems · AI Automation</small></span></Link>
        <nav className={open ? "gb-nav open" : "gb-nav"} aria-label="Primary navigation">
          {nav.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
          <Link className="gb-portal-nav" href="/auth/login" onClick={() => setOpen(false)}>Portal</Link>
          <Link className="gb-demo-nav" href="/contact#contact-form" onClick={() => setOpen(false)}>Book Demo <span>↗</span></Link>
        </nav>
        <a className="gb-header-wa" href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a>
        <button className="gb-menu" type="button" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? "Close" : "Menu"}</button>
      </header>
      {children}
      <footer className="gb-footer">
        <div className="gb-footer-lead">
          <Link className="gb-logo light" href="/"><Image src="/groenics-logo.png" alt="" width={44} height={44} /><span><b>Groenics</b><small>Business Systems · AI Automation</small></span></Link>
          <p>AI-powered business systems, automation, ERP, CRM, websites, dashboards and custom software for growing businesses.</p>
        </div>
        <div><h3>Company</h3><Link href="/about">About</Link><Link href="/services">Services</Link><Link href="/industries">Industries</Link><Link href="/contact">Contact</Link></div>
        <div><h3>Solutions</h3><Link href="/school-erp">School ERP</Link><Link href="/manufacturing">Manufacturing</Link><Link href="/clinics">Clinics</Link><Link href="/services">Custom software</Link></div>
        <div><h3>Contact</h3><a href={whatsappUrl} target="_blank" rel="noreferrer">+91 93342 06953</a><span>India · Serving remotely</span><Link href="/auth/login">Client portal</Link></div>
        <div className="gb-footer-bottom"><span>© 2026 Groenics. All rights reserved.</span><span>Founded by Nayab Ahmad</span></div>
      </footer>
      <a className="gb-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer" aria-label="WhatsApp Groenics"><b>WA</b><span>Talk on WhatsApp</span></a>
    </div>
  );
}

export function SectionTitle({ eyebrow, title, copy, light = false }: { eyebrow: string; title: string; copy?: string; light?: boolean }) {
  return <div className={`gb-section-title${light ? " light" : ""}`}><p>{eyebrow}</p><h2>{title}</h2>{copy && <div>{copy}</div>}</div>;
}

export function CTA({ title = "Your business may be losing time, leads and money because of weak systems.", copy = "Let Groenics audit your workflow and show what can be automated, improved or rebuilt." }: { title?: string; copy?: string }) {
  return <section className="gb-cta"><div><p>Free business assessment</p><h2>{title}</h2><span>{copy}</span></div><div className="gb-cta-actions"><Link className="gb-button bright" href="/contact#contact-form">Book Free Assessment</Link><a className="gb-button outline" href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp Now</a><Link className="gb-text-link" href="/contact">Request demo →</Link></div></section>;
}

export function FAQ({ items }: { items: [string, string][] }) {
  const [active, setActive] = useState<number | null>(0);
  return <div className="gb-faq">{items.map(([question, answer], index) => <div className="gb-faq-item" key={question}><button type="button" onClick={() => setActive(active === index ? null : index)} aria-expanded={active === index}><span>{question}</span><b>{active === index ? "−" : "+"}</b></button>{active === index && <p>{answer}</p>}</div>)}</div>;
}

export function ContactForm({ detailed = false }: { detailed?: boolean }) {
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setState("sending"); setError("");
    const form = event.currentTarget; const data = new FormData(form); const params = new URLSearchParams(window.location.search);
    const details = [data.get("industry") && `Industry: ${data.get("industry")}`, data.get("message")].filter(Boolean).join("\n\n");
    const payload = { source:"Website Contact", name:String(data.get("name")||""), company:String(data.get("company")||""), email:String(data.get("email")||""), phone:String(data.get("phone")||""), message:details, website:String(data.get("website")||""), landingPage:`${window.location.pathname}${window.location.search}`, referrer:document.referrer, utmSource:params.get("utm_source")||"", utmMedium:params.get("utm_medium")||"", utmCampaign:params.get("utm_campaign")||"" };
    try { const response=await fetch("/api/enquiries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}); const result=await response.json(); if(!response.ok) throw new Error(result?.error||"Unable to send enquiry."); form.reset(); setState("success"); }
    catch(err){setState("error");setError(err instanceof Error?err.message:"Unable to send enquiry.");}
  }
  return <form className="gb-form" id="contact-form" onSubmit={submit}>
    <input className="honeypot" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
    <div className="gb-form-pair"><label>Name *<input name="name" required maxLength={120} placeholder="Your full name" /></label><label>Business name<input name="company" maxLength={200} placeholder="Company or institution" /></label></div>
    <div className="gb-form-pair"><label>Phone / WhatsApp<input name="phone" maxLength={30} placeholder="+91" /></label><label>Email *<input type="email" name="email" required maxLength={254} placeholder="name@company.com" /></label></div>
    {detailed && <label>Industry<select name="industry"><option value="">Select industry</option><option>School / Education</option><option>Clinic / Healthcare</option><option>Manufacturing</option><option>Distribution</option><option>SME / Local business</option><option>Service business</option><option>Other</option></select></label>}
    <label>What problem do you want to solve? *<textarea name="message" required maxLength={5000} rows={5} placeholder="Tell us what is manual, slow, scattered or difficult to track." /></label>
    {state==="success"&&<p className="gb-form-success">Thank you. Your enquiry is saved securely and we will respond within one business day.</p>}
    {state==="error"&&<p className="gb-form-error">{error}</p>}
    <button type="submit" disabled={state==="sending"}>{state==="sending"?"Sending…":"Request Business Assessment"} <span>↗</span></button>
    <small>No generic sales deck. We will ask useful questions about your current workflow.</small>
  </form>;
}
