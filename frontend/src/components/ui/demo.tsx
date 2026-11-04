import { ChatMessages } from "@/components/ui/chat-messages";

export default function Default() {
  return (
    <div className="flex min-h-[620px] w-full items-center justify-center bg-zinc-950 p-6">
      <ChatMessages className="h-[560px] w-full max-w-md" />
    </div>
  );
}
