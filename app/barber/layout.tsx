import BarberSidebar from "@/components/BarberSidebar";

export default function BarberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#000428]">
      <BarberSidebar />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
        {children}
      </main>
    </div>
  );
}
