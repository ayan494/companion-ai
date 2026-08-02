import type { ChatSettings } from "@/components/chat/settings-dialog";
import type { Attachment } from "@/components/chat/composer";

/** Small cross-route store for chat UI state that shouldn't live in the URL. */
export const chatUiStore: {
  refreshConversations: () => void | Promise<void>;
  openSettings: () => void;
  toggleSidebar: () => void;
  pendingSettings: ChatSettings | null;
  pendingMessage: { conversationId: string; text: string; files: Attachment[] } | null;
} = {
  refreshConversations: () => {},
  openSettings: () => {},
  toggleSidebar: () => {},
  pendingSettings: null,
  pendingMessage: null,
};
