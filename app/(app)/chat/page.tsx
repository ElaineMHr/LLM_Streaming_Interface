import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import ChatClient from "./_components/ChatClient";
import { authOptions } from "@/lib/auth";

export default async function ChatPage() {
  // Server-side route guard: verify the session before rendering the page.
  // Unauthenticated users are redirected to the login route so the client
  // chat interface never mounts without a valid session.
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  return <ChatClient />;
}
