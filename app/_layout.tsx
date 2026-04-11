import "../global.css";
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { subscribeToAuthChanges } from "../services/auth";
import { useAuthStore } from "../store/authStore";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { setUser, setLoading, user, isLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inTabsGroup = segments[0] === "(tabs)";

    if (!user && inTabsGroup) {
      // logged out user trying to access tabs → send to landing
      router.replace("/");
    } else if (user && !inTabsGroup) {
      // logged in user → send to dashboard
      router.replace("/(tabs)");
    }
  }, [user, isLoading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
    </Stack>
  );
}