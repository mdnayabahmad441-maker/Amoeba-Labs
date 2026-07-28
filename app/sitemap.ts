import type { MetadataRoute } from "next";
const routes=["","/services","/industries","/school-erp","/manufacturing","/clinics","/about","/contact"];
export default function sitemap():MetadataRoute.Sitemap{return routes.map(route=>({url:`https://www.groenics.online${route}`,lastModified:new Date(),changeFrequency:route===""?"weekly":"monthly",priority:route===""?1:.8}))}
