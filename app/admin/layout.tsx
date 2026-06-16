import AdminGate from "@/components/admin/AdminGate";

export const metadata = {
  title: "NFF Cup · Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminGate>{children}</AdminGate>;
}
