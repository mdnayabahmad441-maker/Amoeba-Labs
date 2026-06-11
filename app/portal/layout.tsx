import PortalLayout from "@/components/PortalLayout";

export const metadata = {
  title: "Groenics Portal",
  description: "Operating system for business execution and growth",
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortalLayout>{children}</PortalLayout>;
}
