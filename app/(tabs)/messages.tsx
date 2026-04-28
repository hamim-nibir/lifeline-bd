import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function MessagesTab() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/(feat)/chat-list" as any);
  }, []);

  return null;
}