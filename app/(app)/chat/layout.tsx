import Sidebar from "@/components/sidebar/Sidebar";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side route guard: verify the session before rendering the page.
  // Unauthenticated users are redirected to the login route so the client
  // chat interface never mounts without a valid session.
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }
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
