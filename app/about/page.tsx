import type { Metadata } from "next";
import { AboutPage } from "@/components/GroenicsPages";
export const metadata:Metadata={title:"About Groenics & Founder Nayab Ahmad",description:"Groenics is a business systems company founded by Nayab Ahmad, building practical AI automation, ERP, CRM and software from India.",alternates:{canonical:"/about"}};
export default function Page(){return <AboutPage/>}
