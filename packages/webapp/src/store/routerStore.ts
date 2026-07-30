import { create } from 'zustand';

export type TabId = 'home' | 'play' | 'shop' | 'leaderboard' | 'profile';
export type ModalId = string | null;

interface RouterState {
  tab: TabId;
  currentModal: ModalId;
  modalProps: Record<string, unknown>;
  setTab: (t: TabId) => void;
  openModal: (name: string, props?: Record<string, unknown>) => void;
  closeModal: () => void;
}

export const useRouter = create<RouterState>((set) => ({
  tab: 'play',
  currentModal: null,
  modalProps: {},
  setTab: (tab) => set({ tab, currentModal: null }),
  openModal: (currentModal, modalProps = {}) => set({ currentModal, modalProps }),
  closeModal: () => set({ currentModal: null, modalProps: {} }),
}));
