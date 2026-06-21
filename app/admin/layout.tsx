import AdminGate from "@/components/admin/AdminGate";

export const metadata = {
  title: "NFF Independence Cup 2.0 (Intra) · Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminGate>{children}</AdminGate>;
}
