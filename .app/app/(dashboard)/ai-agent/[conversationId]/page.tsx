import React from "react";
import ChatWindow from "@/components/ai-agent/ChatWindow";

interface PageProps {
  params: { conversationId: string };
}

export default function ConversationPage({ params }: PageProps) {
  return <ChatWindow conversationId={params.conversationId} />;
}
