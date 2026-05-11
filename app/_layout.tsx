import "../global.css";
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { subscribeToAuthChanges, getUserProfile } from "../services/auth";
import { useAuthStore } from "../store/authStore";
import { LanguageProvider } from "../contexts/LanguageContext";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const {
    setUser, setLoading, setNickname,
    setAccountType, setShowWelcome,
    user, isLoading,
  } = useAuthStore();

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          if (profile) {
            setNickname(profile.nickname ?? firebaseUser.displayName ?? "User");
            setAccountType(profile.accountType ?? null);
          } else {
            setNickname(firebaseUser.displayName ?? "User");
            setAccountType(null);
          }
        } catch {
          setNickname(firebaseUser.displayName ?? "User");
          setAccountType(null);
        }
        setShowWelcome(true);
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
    const inTabsGroup = segments[0] === "(tabs)";
    const inAuthGroup = segments[0] === "(auth)";
    const inFeatGroup = segments[0] === "(feat)";

    if (!user && inTabsGroup) {
      router.replace("/");
    } else if (!user && inFeatGroup) {
      router.replace("/");
    } else if (user && !inTabsGroup && !inAuthGroup && !inFeatGroup) {
      router.replace("/(tabs)");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [user, isLoading, segments]);

  return (
    <LanguageProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(feat)" />
      </Stack>
    </LanguageProvider>
  );
}