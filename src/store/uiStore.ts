import { create } from 'zustand';

interface UIState {
  // Whether the AI Brain Dump panel is open
  isChatOpen: boolean;
  // Availability of the local LLM API (null = still checking)
  isLLMAvailable: boolean | null;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  setLLMAvailable: (value: boolean | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isChatOpen: false,
  isLLMAvailable: null,
  openChat: () => set({ isChatOpen: true }),
  closeChat: () => set({ isChatOpen: false }),
  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
  setLLMAvailable: (value) => set({ isLLMAvailable: value }),
}));
