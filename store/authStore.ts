import { create } from "zustand";
import { User } from "firebase/auth";
import { AccountType } from "../types";

type AuthStore = {
  user: User | null;
  nickname: string | null;
  accountType: AccountType | null;
  isLoading: boolean;
  showWelcome: boolean;
  setUser: (user: User | null) => void;
  setNickname: (nickname: string | null) => void;
  setAccountType: (accountType: AccountType | null) => void;
  setLoading: (loading: boolean) => void;
  setShowWelcome: (show: boolean) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  nickname: null,
  accountType: null,
  isLoading: true,
  showWelcome: false,
  setUser: (user) => set({ user }),
  setNickname: (nickname) => set({ nickname }),
  setAccountType: (accountType) => set({ accountType }),
  setLoading: (isLoading) => set({ isLoading }),
  setShowWelcome: (showWelcome) => set({ showWelcome }),
}));