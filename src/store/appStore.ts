import { create } from 'zustand';

export type AppStatus = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

interface AppState {
  status: AppStatus;
  lastCommand: string;
  lastResponse: string;
  lastAudioUrl: string;
  isMuted: boolean;
  voskPartial: string;

  setStatus: (status: AppStatus) => void;
  setLastCommand: (command: string) => void;
  setLastResponse: (response: string) => void;
  setLastAudioUrl: (url: string) => void;
  toggleMute: () => void;
  setVoskPartial: (text: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  status: 'idle',
  lastCommand: '',
  lastResponse: '',
  lastAudioUrl: '',
  isMuted: false,
  voskPartial: '',

  setStatus: (status) => set({ status }),
  setLastCommand: (lastCommand) => set({ lastCommand }),
  setLastResponse: (lastResponse) => set({ lastResponse }),
  setLastAudioUrl: (lastAudioUrl) => set({ lastAudioUrl }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  setVoskPartial: (voskPartial) => set({ voskPartial }),
}));
