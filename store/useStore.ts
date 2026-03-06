import { create } from "zustand";

interface AppState {
  scanCount: number;
  incrementScanCount: () => void;
  resetScanCount: () => void;
}

export const useStore = create<AppState>((set) => ({
  scanCount: 0,
  incrementScanCount: () => set((state) => ({ scanCount: state.scanCount + 1 })),
  resetScanCount: () => set({ scanCount: 0 }),
}));
