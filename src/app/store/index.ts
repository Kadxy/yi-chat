import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ChatModel, ChatThread } from "app-types/chat";
import { MCPServerInfo } from "app-types/mcp";

export interface UploadedFile {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
  isUploading?: boolean;
  progress?: number;
  previewUrl?: string;
  abortController?: AbortController;
  dataUrl?: string; // Full data URL format: "data:image/png;base64,..."
}

export interface AppState {
  threadList: (ChatThread & { lastMessageAt?: number })[];
  mcpList: (MCPServerInfo & { id: string })[];
  currentThreadId: ChatThread["id"] | null;
  toolChoice: "auto" | "none" | "manual";
  allowedMcpServers?: string[];
  generatingTitleThreadIds: string[];
  threadFiles: {
    [threadId: string]: UploadedFile[];
  };
  chatModel?: ChatModel;
  openShortcutsPopup: boolean;
  openChatPreferences: boolean;
  openUserSettings: boolean;
}

export interface AppDispatch {
  mutate: (state: Mutate<AppState>) => void;
}

const initialState: AppState = {
  threadList: [],
  generatingTitleThreadIds: [],
  threadFiles: {},
  mcpList: [],
  currentThreadId: null,
  toolChoice: "auto",
  allowedMcpServers: undefined,
  openUserSettings: false,
  chatModel: undefined,
  openShortcutsPopup: false,
  openChatPreferences: false,
};

export const appStore = create<AppState & AppDispatch>()(
  persist(
    (set) => ({
      ...initialState,
      mutate: set,
    }),
    {
      name: "mc-app-store-v3.1.0",
      partialize: (state) => ({
        chatModel: state.chatModel || initialState.chatModel,
        toolChoice: state.toolChoice || initialState.toolChoice,
        allowedMcpServers:
          state.allowedMcpServers || initialState.allowedMcpServers,
      }),
    },
  ),
);
