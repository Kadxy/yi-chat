import { ChatShareWithUser } from "app-types/chat-share";
import { PreviewMessage } from "../message";
import { Avatar, AvatarFallback, AvatarImage } from "ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";
import { formatDate } from "date-fns";

import Particles from "ui/particles";
import { ContinueConversationButton } from "./continue-conversation-button";

export default function ChatPreview({
  thread,
  shareId,
}: { thread: ChatShareWithUser; shareId: string }) {
  return (
    <div
      className="flex flex-col min-w-0 h-full relative"
      data-testid="share-preview"
    >
      <div className="absolute top-0 left-0 w-full h-full -z-10">
        <Particles particleCount={400} particleBaseSize={10} />
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto pb-24">
        <div className="w-full mx-auto max-w-3xl px-6 py-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="share-title">
            {thread.title}
          </h1>
          <h2 className="sr-only">Shared Conversation</h2>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            {formatDate(thread.sharedAt, "MMM d, yyyy")}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 text-xs">
                  <Avatar className="size-4 rounded-full">
                    <AvatarImage src={thread.sharerImage} />
                    <AvatarFallback>
                      {thread.sharerName?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent>{thread.sharerName}</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <section aria-label="Conversation messages">
          <h3 className="sr-only">Messages</h3>
          {thread.messages.map((message, index) => {
            return (
              <PreviewMessage
                key={message.id}
                message={message}
                isLastMessage={index === thread.messages.length - 1}
                readonly={true}
              />
            );
          })}
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 flex justify-center pb-6 pointer-events-none">
        <div className="pointer-events-auto">
          <ContinueConversationButton shareId={shareId} />
        </div>
      </div>
    </div>
  );
}
