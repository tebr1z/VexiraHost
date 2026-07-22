import type { AuthSession } from "@vexira/types";
import { UserRole } from "@vexira/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

function isAdminSession(session: AuthSession | null): session is AuthSession {
  return session?.user?.role === UserRole.ADMIN;
}

export function canReturnToAdmin(adminSession: AuthSession | null): boolean {
  return isAdminSession(adminSession);
}

export function isViewingAsImpersonatedUser(
  adminSession: AuthSession | null,
  currentUserId: string | undefined,
): boolean {
  if (!canReturnToAdmin(adminSession) || !currentUserId) {
    return false;
  }
  return adminSession!.user.id !== currentUserId;
}

interface ImpersonationState {
  adminSession: AuthSession | null;
  adminRememberMe: boolean;
  impersonatedEmail: string | null;
  beginImpersonation: (
    adminSession: AuthSession,
    targetEmail: string,
    rememberMe?: boolean,
  ) => void;
  clearImpersonation: () => void;
  endImpersonation: () => { session: AuthSession; rememberMe: boolean } | null;
}

export const useImpersonationStore = create<ImpersonationState>()(
  persist(
    (set, get) => ({
      adminSession: null,
      adminRememberMe: false,
      impersonatedEmail: null,
      beginImpersonation: (adminSession, targetEmail, rememberMe = false) => {
        if (!isAdminSession(adminSession)) {
          return;
        }
        set({
          adminSession,
          adminRememberMe: rememberMe,
          impersonatedEmail: targetEmail,
        });
      },
      clearImpersonation: () => {
        set({
          adminSession: null,
          adminRememberMe: false,
          impersonatedEmail: null,
        });
      },
      endImpersonation: () => {
        const { adminSession, adminRememberMe } = get();
        if (!isAdminSession(adminSession)) {
          return null;
        }
        set({
          adminSession: null,
          adminRememberMe: false,
          impersonatedEmail: null,
        });
        return { session: adminSession, rememberMe: adminRememberMe };
      },
    }),
    {
      name: "vexira-impersonation",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        adminSession: state.adminSession,
        adminRememberMe: state.adminRememberMe,
        impersonatedEmail: state.impersonatedEmail,
      }),
    },
  ),
);
