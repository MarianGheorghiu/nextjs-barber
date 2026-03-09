import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Pe mobil elementele curg de sus în jos (bară sus, conținut jos)
    // Pe ecrane medii+ (md) stau unul lângă altul (stânga-dreapta)
    <div className="flex flex-col md:flex-row min-h-screen bg-[#000428]">
      <AdminSidebar />

      {/* Main Content - pe mobil ocupă tot spațiul, pe desktop se ajustează */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
        {children}
      </main>
    </div>
  );
}
