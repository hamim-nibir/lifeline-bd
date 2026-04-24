import { useState } from "react";
import { useAuthStore } from "../store/authStore";

export function useVerification() {
  const { user } = useAuthStore();
  const [showGuard, setShowGuard] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Call this with a callback — it runs the callback if verified,
  // or shows the popup if not
  const requireVerified = (
    profile: any,
    action: () => void
  ) => {
    if (profile?.verificationStatus === "verified") {
      action();
    } else {
      setShowGuard(true);
    }
  };

  return {
    showGuard,
    setShowGuard,
    requireVerified,
  };
}