import Sidebar from "@/components/sidebar/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-neutral-100">
      {/* Sidebar */}
      <aside className="w-64 shrink-0">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
