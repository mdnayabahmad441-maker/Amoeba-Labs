import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Stats from "../components/Stats";
import HowWeHelp from "../components/HowWeHelp";
import Services from "../components/Services";
import Portfolio from "../components/Portfolio";
import FounderProgram from "../components/FounderProgram";
import Contact from "../components/Contact";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <Stats />
      <HowWeHelp />
      <Services />
      <Portfolio />
      <FounderProgram />
      <Contact />
      <Footer />
    </>
  );
}
