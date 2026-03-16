import ClientSidebar from "../../components/ClientSidebar";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // AICI E SECRETUL: flex-col pe mobil, flex-row pe desktop
    <div className="flex flex-col md:flex-row h-screen bg-[#050505] overflow-hidden">
      <ClientSidebar />
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar relative">
        <div className="absolute top-0 left-0 w-full h-96 bg-cyan-500/5 blur-[100px] -z-10 rounded-full"></div>
        {children}
      </main>
    </div>
  );
}
