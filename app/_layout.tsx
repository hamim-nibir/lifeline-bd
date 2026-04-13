import "../global.css";
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { subscribeToAuthChanges, getUserProfile } from "../services/auth";
import { useAuthStore } from "../store/authStore";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const {
    setUser,
    setLoading,
    setNickname,
    setAccountType,
    setShowWelcome,
    user,
    isLoading,
  } = useAuthStore();

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid);
        if (profile) {
          setNickname(profile.nickname);
          setAccountType(profile.accountType);
          setShowWelcome(true);
        }
      } else {
        setNickname(null);
        setAccountType(null);
        setShowWelcome(false);
      }
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
      router.replace("/");
    } else if (user && !inTabsGroup) {
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