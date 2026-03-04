import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import ChatClient from "./_components/ChatClient";
import { authOptions } from "@/lib/auth";

export default async function ChatPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  return <ChatClient />;
}
