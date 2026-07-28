import type { MetadataRoute } from "next";
export default function robots():MetadataRoute.Robots{return {rules:{userAgent:"*",allow:"/",disallow:["/portal/","/auth/","/api/"]},sitemap:"https://www.groenics.online/sitemap.xml",host:"https://www.groenics.online"}}
