import { Avatar, Drawer, EmptyState } from "@/ui";
import type { ConversationSummary } from "../types";

export function HistoryDrawer({
  open,
  onClose,
  conversations,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  conversations: ConversationSummary[];
  onSelect: (conversationId: string) => void;
}) {
  return (
    <Drawer open={open} onClose={onClose} title="History">
      {conversations.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          description="Start chatting to see history here."
        />
      ) : (
        <ul className="flex flex-col gap-1">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <button
                type="button"
                onClick={() => onSelect(conversation.id)}
                className="hover:bg-bg-subtle flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors"
              >
                <Avatar name={conversation.employeeName} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="text-text block truncate text-sm font-medium">
                    {conversation.title}
                  </span>
                  <span className="text-text-faint block truncate text-xs">
                    {conversation.employeeName} · {conversation.date}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}
