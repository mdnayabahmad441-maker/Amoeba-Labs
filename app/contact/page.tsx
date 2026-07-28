import type { Metadata } from "next";
import { ContactPage } from "@/components/GroenicsPages";
export const metadata:Metadata={title:"Contact Groenics | Book a Demo or Business Assessment",description:"Tell Groenics what is manual, slow or scattered in your business. Request a demo, system audit or free business assessment.",alternates:{canonical:"/contact"}};
export default function Page(){return <ContactPage/>}
