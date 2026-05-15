import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ChatWindow from "../../components/chat/ChatWindow";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const token = cookies().get("access_token")?.value;
  if (!token) {
    redirect("/login?next=/chat");
  }

  const apiUrl = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

  return (
    <main className="flex h-screen flex-col bg-gray-50">
      <header className="border-b bg-white px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900">Assistant</h1>
      </header>
      <div className="flex-1 overflow-hidden">
        <ChatWindow apiUrl={apiUrl} token={token!} />
      </div>
    </main>
  );
}
