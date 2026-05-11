import { useState, useEffect, useRef } from "react";
import { useCallback } from "react";
import { FlatList } from "react-native";
import {
  View, Text, ScrollView, TouchableOpacity,
  Linking, Modal, TextInput, ActivityIndicator,
  Alert, KeyboardAvoidingView, Platform,
  Animated, Dimensions, Easing,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { StatusBar } from "expo-status-bar";
import { logoutUser } from "../../services/auth";
import * as Location from "expo-location";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebase";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const ALL_SERVICES = [
  { label: "Ambulance",       icon: "🚑", color: "#fff5f5", accent: "#ef4444", route: "/(tabs)/police" },
  { label: "Police",          icon: "🛡️", color: "#f0f4ff", accent: "#3b82f6", route: "/(tabs)/police" },
  { label: "Fire Service",    icon: "🔥", color: "#fff7ed", accent: "#f97316", route: "/(tabs)/police" },
  { label: "Unified Service", icon: "⚡", color: "#fefce8", accent: "#eab308", route: null             },
];

const UNIFIED_SERVICES = [
  { value: "ambulance", label: "Ambulance",    icon: "🚑" },
  { value: "fire",      label: "Fire Service", icon: "🔥" },
  { value: "police",    label: "Police",       icon: "🛡️" },
];

const WEATHER_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
const NEWS_API_KEY    = process.env.EXPO_PUBLIC_NEWS_API_KEY;

type WeatherData = {
  temp: number;
  feels_like: number;
  description: string;
  humidity: number;
  wind_speed: number;
  city: string;
  icon: string;
};

type NewsItem = {
  id: string;
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
};

type CarouselItem =
  | { type: "weather"; data: WeatherData }
  | { type: "news"; data: NewsItem };

const WEATHER_ICON_MAP: Record<string, string> = {
  "01d": "☀️", "01n": "🌙",
  "02d": "⛅", "02n": "⛅",
  "03d": "☁️", "03n": "☁️",
  "04d": "☁️", "04n": "☁️",
  "09d": "🌧️", "09n": "🌧️",
  "10d": "🌦️", "10n": "🌦️",
  "11d": "⛈️", "11n": "⛈️",
  "13d": "❄️", "13n": "❄️",
  "50d": "🌫️", "50n": "🌫️",
};

export default function HomeScreen() {
  const router = useRouter();
  const { user, nickname } = useAuthStore();
  const uid = user?.uid ?? "";

  // Search
  const [searchQuery, setSearchQuery]     = useState("");
  const [searchVisible, setSearchVisible] = useState(false);
  const searchAnim = useRef(new Animated.Value(0)).current;

  // Sidebar
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const sidebarAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  // Unified modal
  const [showUnified, setShowUnified]           = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [emergencyType, setEmergencyType]       = useState("");
  const [locationText, setLocationText]         = useState("");
  const [description, setDescription]           = useState("");
  const [contactNumber, setContactNumber]       = useState("");
  const [submitting, setSubmitting]             = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  // ── Entrance animations ──
  const headerAnim    = useRef(new Animated.Value(-40)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const welcomeAnim   = useRef(new Animated.Value(30)).current;
  const welcomeOpacity = useRef(new Animated.Value(0)).current;
  const sosAnim       = useRef(new Animated.Value(30)).current;
  const sosOpacity    = useRef(new Animated.Value(0)).current;
  const servicesAnim  = useRef(new Animated.Value(30)).current;
  const servicesOpacity = useRef(new Animated.Value(0)).current;
  const cardAnims     = useRef(ALL_SERVICES.map(() => new Animated.Value(40))).current;
  const cardOpacities = useRef(ALL_SERVICES.map(() => new Animated.Value(0))).current;
  const cardScales    = useRef(ALL_SERVICES.map(() => new Animated.Value(0.92))).current;

  // SOS pulse rings
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;
  const sosBtnScale = useRef(new Animated.Value(1)).current;

  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([]);
  const [carouselLoading, setCarouselLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const autoSlideRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Header
    Animated.parallel([
      Animated.timing(headerAnim,    { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    // Welcome card
    Animated.parallel([
      Animated.timing(welcomeAnim,    { toValue: 0, duration: 480, delay: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(welcomeOpacity, { toValue: 1, duration: 480, delay: 180, useNativeDriver: true }),
    ]).start();

    // SOS button
    Animated.parallel([
      Animated.timing(sosAnim,    { toValue: 0, duration: 480, delay: 360, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
      Animated.timing(sosOpacity, { toValue: 1, duration: 480, delay: 360, useNativeDriver: true }),
    ]).start();

    // Services label
    Animated.parallel([
      Animated.timing(servicesAnim,    { toValue: 0, duration: 400, delay: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(servicesOpacity, { toValue: 1, duration: 400, delay: 480, useNativeDriver: true }),
    ]).start();

    // Service cards stagger
    ALL_SERVICES.forEach((_, i) => {
      Animated.parallel([
        Animated.timing(cardAnims[i],     { toValue: 0, duration: 440, delay: 560 + i * 90, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(cardOpacities[i], { toValue: 1, duration: 440, delay: 560 + i * 90, useNativeDriver: true }),
        Animated.spring(cardScales[i],    { toValue: 1, delay: 560 + i * 90, useNativeDriver: true, tension: 80, friction: 8 }),
      ]).start();
    });

    // SOS pulse rings loop
    const runPulse = () => {
      pulse1.setValue(0);
      pulse2.setValue(0);
      pulse3.setValue(0);
      Animated.stagger(300, [
        Animated.timing(pulse1, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse2, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse3, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start(() => runPulse());
    };
    const timer = setTimeout(runPulse, 900);
    return () => clearTimeout(timer);
  }, []);

  // ── SOS press breathe ──
  const handleSOSPressIn  = () => Animated.spring(sosBtnScale, { toValue: 0.96, useNativeDriver: true, tension: 200, friction: 8 }).start();
  const handleSOSPressOut = () => Animated.spring(sosBtnScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }).start();

  // ── Search bar ──
  const toggleSearch = () => {
    if (searchVisible) {
      Animated.timing(searchAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => {
        setSearchVisible(false);
        setSearchQuery("");
      });
    } else {
      setSearchVisible(true);
      Animated.timing(searchAnim, { toValue: 1, duration: 280, useNativeDriver: false }).start();
    }
  };

  // ── Sidebar ──
  const openSidebar = () => {
    setSidebarVisible(true);
    Animated.timing(sidebarAnim, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };
  const closeSidebar = () => {
    Animated.timing(sidebarAnim, { toValue: SCREEN_WIDTH, duration: 280, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setSidebarVisible(false));
  };

  const handleLogout = async () => {
    closeSidebar();
    await logoutUser();
    router.replace("/login");
  };

  const filteredServices = ALL_SERVICES.filter((s) =>
    s.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleService = (value: string) => {
    setSelectedServices((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const handleFetchLocation = async () => {
    setFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { Alert.alert("Permission Denied", "Location permission is required."); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocationText(`${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`);
    } catch { Alert.alert("Error", "Could not fetch location."); }
    finally { setFetchingLocation(false); }
  };

  const fetchWeatherAndNews = useCallback(async (lat: number, lon: number) => {
    setCarouselLoading(true);
    const items: CarouselItem[] = [];

    // Fetch weather
    try {
      const weatherRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`
      );
      const weatherData = await weatherRes.json();
      if (weatherData.main) {
        items.push({
          type: "weather",
          data: {
            temp: Math.round(weatherData.main.temp),
            feels_like: Math.round(weatherData.main.feels_like),
            description: weatherData.weather[0]?.description ?? "Clear",
            humidity: weatherData.main.humidity,
            wind_speed: weatherData.wind?.speed ?? 0,
            city: weatherData.name ?? "Your Location",
            icon: weatherData.weather[0]?.icon ?? "01d",
          },
        });
      }
    } catch (err) {
      console.error("Weather fetch failed:", err);
    }

    // Fetch news
    try {
      const newsRes = await fetch(
        `https://newsapi.org/v2/everything?q=accident+Bangladesh+emergency&language=en&sortBy=publishedAt&pageSize=5&apiKey=${NEWS_API_KEY}`
      );
      const newsData = await newsRes.json();
      if (newsData.articles) {
        newsData.articles
          .filter((a: any) => a.title && a.title !== "[Removed]")
          .slice(0, 5)
          .forEach((article: any, index: number) => {
            items.push({
              type: "news",
              data: {
                id: `news_${index}`,
                title: article.title,
                description: article.description ?? "",
                url: article.url,
                publishedAt: article.publishedAt,
                source: article.source?.name ?? "News",
              },
            });
          });
      }
    } catch (err) {
      console.error("News fetch failed:", err);
    }

    setCarouselItems(items);
    setCarouselLoading(false);
  }, []);

  // Auto slide
  const startAutoSlide = useCallback(() => {
    if (autoSlideRef.current) clearInterval(autoSlideRef.current);
    autoSlideRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = carouselItems.length > 0
          ? (prev + 1) % carouselItems.length
          : 0;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4000);
  }, [carouselItems.length]);

  useEffect(() => {
    if (carouselItems.length > 0) {
      startAutoSlide();
    }
    return () => {
      if (autoSlideRef.current) clearInterval(autoSlideRef.current);
    };
  }, [carouselItems.length, startAutoSlide]);

  useEffect(() => {
  (async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        fetchWeatherAndNews(loc.coords.latitude, loc.coords.longitude);
      } else {
        // Fallback to Dhaka coords
        fetchWeatherAndNews(23.8103, 90.4125);
      }
    } catch {
      fetchWeatherAndNews(23.8103, 90.4125);
      }
    })();
  }, []);

  const formatNewsTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-BD", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
      });
    } catch { return ""; }
  };

  const handleSubmitUnified = async () => {
    if (selectedServices.length === 0) return Alert.alert("Missing field", "Please select at least one service.");
    if (!emergencyType.trim()) return Alert.alert("Missing field", "Please enter the emergency type.");
    if (!locationText.trim()) return Alert.alert("Missing field", "Please enter your location.");
    if (!description.trim()) return Alert.alert("Missing field", "Please describe the emergency.");
    if (!contactNumber.trim()) return Alert.alert("Missing field", "Please enter a contact number.");

    setSubmitting(true);
    try {
      const reportRef = await addDoc(collection(db, "unifiedRequests"), {
        uid, requestedBy: nickname ?? "Unknown",
        services: selectedServices, emergencyType,
        location: locationText, description,
        contactNumber, status: "pending",
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, "notifications"), {
        type: "unifiedRequest", reportId: reportRef.id,
        title: "⚡ Unified Emergency Request",
        body: `${nickname ?? "Someone"} requested ${selectedServices.join(", ")} services`,
        reportedBy: nickname ?? "Unknown",
        reportedByUid: uid, severity: "high",
        read: false, createdAt: serverTimestamp(),
      });
      Alert.alert("✅ Request Submitted", "Your unified emergency request has been sent to operators.",
        [{ text: "OK", onPress: () => {
          setShowUnified(false);
          setSelectedServices([]); setEmergencyType("");
          setLocationText(""); setDescription(""); setContactNumber("");
        }}]
      );
    } catch { Alert.alert("Error", "Submission failed. Please try again."); }
    finally { setSubmitting(false); }
  };

  const searchBarHeight  = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 50] });
  const searchBarOpacity = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  // Pulse ring interpolations
  const makePulseStyle = (anim: Animated.Value) => ({
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
    opacity: anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.55, 0.3, 0] }),
  });

  const renderCarouselItem = ({ item }: { item: CarouselItem }) => {
    if (item.type === "weather") {
      const w = item.data;
      const emoji = WEATHER_ICON_MAP[w.icon] ?? "🌤️";
      return (
        <View style={{
          width: SCREEN_WIDTH - 32,
          backgroundColor: "#1a4a4a",
          borderRadius: 16, padding: 16, marginHorizontal: 0,
          flexDirection: "row", alignItems: "center", gap: 12,
        }}>
          <View style={{
            width: 64, height: 64, borderRadius: 32,
            backgroundColor: "rgba(255,255,255,0.1)",
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ fontSize: 32 }}>{emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "600" }}>
              📍 {w.city}
            </Text>
            <Text style={{ color: "#fff", fontSize: 28, fontWeight: "900", marginTop: 2 }}>
              {w.temp}°C
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, textTransform: "capitalize" }}>
              {w.description}
            </Text>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
              <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>
                💧 {w.humidity}%
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>
                💨 {w.wind_speed} m/s
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>
                🌡️ Feels {w.feels_like}°C
              </Text>
            </View>
          </View>
        </View>
      );
    }

    if (item.type === "news") {
      const n = item.data;
      return (
        <TouchableOpacity
          onPress={() => Linking.openURL(n.url)}
          activeOpacity={0.85}
          style={{
            width: SCREEN_WIDTH - 32,
            backgroundColor: "#fff",
            borderRadius: 16, padding: 16, marginHorizontal: 0,
            borderWidth: 1, borderColor: "#e8e4df",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <View style={{
              backgroundColor: "#fef2f2", borderRadius: 6,
              paddingHorizontal: 8, paddingVertical: 3,
            }}>
              <Text style={{ color: "#dc2626", fontSize: 10, fontWeight: "700" }}>
                🚨 EMERGENCY NEWS
              </Text>
            </View>
            <Text style={{ color: "#9ca3af", fontSize: 10 }}>{n.source}</Text>
          </View>
          <Text style={{
            color: "#1a1a1a", fontSize: 13, fontWeight: "700",
            lineHeight: 18, marginBottom: 6,
          }} numberOfLines={2}>
            {n.title}
          </Text>
          {n.description ? (
            <Text style={{ color: "#6b7280", fontSize: 11, lineHeight: 16 }} numberOfLines={2}>
              {n.description}
            </Text>
          ) : null}
          <Text style={{ color: "#9ca3af", fontSize: 10, marginTop: 8 }}>
            🕐 {formatNewsTime(n.publishedAt)} · Tap to read more
          </Text>
        </TouchableOpacity>
      );
    }

    return null;
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f4f0eb" }}>
      <StatusBar style="light" />

      {/* ══ HEADER ══ */}
      <Animated.View style={{
        transform: [{ translateY: headerAnim }],
        opacity: headerOpacity,
        backgroundColor: "#c4451a",
        paddingTop: 54, paddingBottom: 14, paddingHorizontal: 18,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
        elevation: 8,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{
            width: 38, height: 38, borderRadius: 10,
            backgroundColor: "#c4451a",
            alignItems: "center", justifyContent: "center",
            shadowColor: "#c4451a", shadowOpacity: 0.5, shadowRadius: 6, elevation: 4,
          }}>
            <Text style={{ fontSize: 18 }}>🛡️</Text>
          </View>
          <View>
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "900", letterSpacing: 0.5 }}>অভয়</Text>
            <Text style={{ color: "rgba(255, 255, 255, 0.61)", fontSize: 10, letterSpacing: 1 }}>LIFELINE BD</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity
            onPress={() => Linking.openURL("tel:999")}
            style={{
              backgroundColor: "#c4451a", borderRadius: 22,
              paddingHorizontal: 14, paddingVertical: 7,
              flexDirection: "row", alignItems: "center", gap: 5,
              shadowColor: "#c4451a", shadowOpacity: 0.45, shadowRadius: 6, elevation: 4,
            }}
          >
            <Text style={{ fontSize: 12 }}>📞</Text>
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800", letterSpacing: 0.5 }}>999</Text>
          </TouchableOpacity>
          {/* <TouchableOpacity onPress={() => router.push("/(tabs)/notifications" as any)}
            style={{ padding: 4 }}>
            <Text style={{ fontSize: 20 }}>🔔</Text>
          </TouchableOpacity> */}
          <TouchableOpacity onPress={openSidebar} style={{ gap: 5, padding: 4 }}>
            <View style={{ width: 20, height: 2.5, backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 2 }} />
            <View style={{ width: 14, height: 2.5, backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 2 }} />
            <View style={{ width: 20, height: 2.5, backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 2 }} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ══ WELCOME CARD ══ */}
        <Animated.View style={{
          transform: [{ translateY: welcomeAnim }],
          opacity: welcomeOpacity,
          backgroundColor: "#fff",
          borderRadius: 20,
          padding: 18,
          marginBottom: 16,
          borderWidth: 1, borderColor: "#e8e3dd",
          shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
          elevation: 4,
          borderStartColor:"#305762",
          borderStartWidth: 5,
        }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: "#aaa", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>
                Welcome to
              </Text>
              <Text style={{ fontSize: 36, fontWeight: "900", color: "#c4451a", lineHeight: 38, marginBottom: 2 }}>
                অভয়
              </Text>
              <Text style={{ fontSize: 15, fontWeight: "800", color: "#111", letterSpacing: 0.3 }}>LifeLine BD</Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, gap: 8 }}>
                <View style={{ width: 3, height: 20, backgroundColor: "#c4451a", borderRadius: 2 }} />
                <Text style={{ fontSize: 12, color: "#305762", fontStyle: "italic" }}>Your Safety, Our Priority</Text>
              </View>

              {/* User badge */}
              <View style={{
                marginTop: 12,
                flexDirection: "row", alignItems: "center", gap: 6,
                backgroundColor: "#f0fdf4", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
                alignSelf: "flex-start",
                borderWidth: 1, borderColor: "#bbf7d0",
              }}>
                <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#22c55e" }} />
                <Text style={{ fontSize: 11, color: "#166534", fontWeight: "700" }}>
                  {nickname ?? "Member"} — Active
                </Text>
              </View>
            </View>

            {/* Search icon */}
            {/* <TouchableOpacity
              onPress={toggleSearch}
              style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: searchVisible ? "#fdf0eb" : "#f5f5f5",
                alignItems: "center", justifyContent: "center",
                borderWidth: 1.5,
                borderColor: searchVisible ? "#c4451a" : "#e0dbd5",
                marginTop: 2,
              }}
            >
              <Text style={{ fontSize: 17 }}>🔍</Text>
            </TouchableOpacity> */}
          </View>

          {/* Animated search bar */}
          <Animated.View style={{ height: searchBarHeight, opacity: searchBarOpacity, overflow: "hidden", marginTop: searchVisible ? 14 : 0 }}>
            <View style={{
              flexDirection: "row", alignItems: "center",
              backgroundColor: "#fafafa", borderRadius: 12,
              paddingHorizontal: 14, paddingVertical: 10,
              borderWidth: 1.5, borderColor: "#e8e3dd",
            }}>
              <Text style={{ fontSize: 14, color: "#bbb", marginRight: 8 }}>🔍</Text>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search emergency services..."
                placeholderTextColor="#bbb"
                style={{ flex: 1, fontSize: 13, color: "#111", padding: 0 }}
                autoFocus={searchVisible}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Text style={{ fontSize: 14, color: "#bbb" }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </Animated.View>

        {/* ── Weather & News Carousel ── */}
      <View style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#1a1a1a" }}>
            Live Updates
          </Text>
          {carouselItems.length > 0 && (
            <View style={{ flexDirection: "row", gap: 4 }}>
              {carouselItems.map((_, i) => (
                <View key={i} style={{
                  width: i === currentIndex ? 16 : 6,
                  height: 6, borderRadius: 3,
                  backgroundColor: i === currentIndex ? "#c4451a" : "#e8e4df",
                }} />
              ))}
            </View>
          )}
        </View>

        {carouselLoading ? (
          <View style={{
            backgroundColor: "#fff", borderRadius: 16, height: 110,
            alignItems: "center", justifyContent: "center",
            borderWidth: 1, borderColor: "#e8e4df",
          }}>
            <ActivityIndicator color="#c4451a" />
            <Text style={{ color: "#9ca3af", fontSize: 11, marginTop: 8 }}>
              Fetching weather & news...
            </Text>
          </View>
          ) : carouselItems.length === 0 ? (
            <View style={{
              backgroundColor: "#fff", borderRadius: 16, height: 110,
              alignItems: "center", justifyContent: "center",
              borderWidth: 1, borderColor: "#e8e4df",
            }}>
              <Text style={{ fontSize: 24, marginBottom: 6 }}>📡</Text>
              <Text style={{ color: "#9ca3af", fontSize: 12 }}>No updates available</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={carouselItems}
              renderItem={renderCarouselItem}
              keyExtractor={(_, i) => `carousel_${i}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEnabled={false}
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH - 32,
                offset: (SCREEN_WIDTH - 32) * index,
                index,
              })}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(
                  e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 32)
                );
                setCurrentIndex(index);
              }}
            />
          )}
        </View>

        {/* ══ EMERGENCY SERVICES GRID ══ */}
        <Animated.View style={{ transform: [{ translateY: servicesAnim }], opacity: servicesOpacity, marginBottom: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 4, height: 18, backgroundColor: "#c4451a", borderRadius: 2 }} />
            <Text style={{ fontSize: 15, fontWeight: "800", color: "#111", letterSpacing: 0.3 }}>
              Emergency Services
            </Text>
          </View>
        </Animated.View>

        

        {filteredServices.length === 0 ? (
          <View style={{
            backgroundColor: "#fff", borderRadius: 16, padding: 28,
            alignItems: "center", borderWidth: 1, borderColor: "#e8e3dd", marginBottom: 16,
          }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
            <Text style={{ color: "#aaa", fontSize: 13 }}>No results for "{searchQuery}"</Text>
          </View>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
            {filteredServices.map((s, i) => (
              <Animated.View
                key={s.label}
                style={{
                  width: "47%",
                  transform: [{ translateY: cardAnims[i] }, { scale: cardScales[i] }],
                  opacity: cardOpacities[i],
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    if (s.label === "Unified Service") setShowUnified(true);
                    else if (s.route) router.push(s.route as any);
                  }}
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 18,
                    borderWidth: 1.5, borderColor: "#e8e3dd",
                    paddingVertical: 22, paddingHorizontal: 12,
                    alignItems: "center", gap: 10,
                    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
                    elevation: 3,
                  }}
                  activeOpacity={0.82}
                >
                  <View style={{
                    width: 54, height: 54, borderRadius: 27,
                    backgroundColor: s.color,
                    alignItems: "center", justifyContent: "center",
                    borderWidth: 1.5, borderColor: `${s.accent}25`,
                    shadowColor: s.accent, shadowOpacity: 0.2, shadowRadius: 6, elevation: 2,
                  }}>
                    <Text style={{ fontSize: 26 }}>{s.icon}</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#111", textAlign: "center" }}>{s.label}</Text>
                  <View style={{
                    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12,
                    backgroundColor: s.color, borderWidth: 1, borderColor: `${s.accent}30`,
                  }}>
                    <Text style={{ fontSize: 10, color: s.accent, fontWeight: "700" }}>TAP TO CALL</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}

        {/* ══ SOS BUTTON — s ══ */}
        
        
        <TouchableOpacity
          onPress={() => Alert.alert(
            "🚨 Send SOS?",
            "This will immediately alert all operators with your location.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Send SOS", style: "destructive", onPress: () => Linking.openURL("tel:999") },
            ]
          )}
          activeOpacity={0.85}
          style={{
            position: "absolute",
            bottom: 50,
            right: 16,
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: "#c4451a",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#c4451a",
            shadowOpacity: 0.55,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 10,
            
          }}
        >
          <Text style={{ fontSize: 35, color: "rgba(255,255,255,0.8)", letterSpacing:0, rowGap: 0, width:35, height:40 }}>▲</Text>
          <Text style={{ color: "#fffefe", fontSize: 10, fontWeight: "900", letterSpacing: 0 , rowGap:0}}>SOS</Text>
        </TouchableOpacity>
        

      </ScrollView>

      {/* ══ SIDEBAR ══ */}
      {sidebarVisible && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}>
          <TouchableOpacity
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)" }}
            onPress={closeSidebar}
            activeOpacity={1}
          />
          <Animated.View style={{
            position: "absolute", top: 0, right: 0, bottom: 0,
            width: SCREEN_WIDTH * 0.74,
            backgroundColor: "#aa411e39",
            transform: [{ translateX: sidebarAnim }],
            paddingTop: 62, paddingHorizontal: 22,
            shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, elevation: 14,
            borderTopLeftRadius: 24, borderBottomLeftRadius: 24,
          }}>
            <TouchableOpacity
              onPress={closeSidebar}
              style={{
                position: "absolute", top: 54, right: 18,
                width: 34, height: 34, borderRadius: 17,
                backgroundColor: "#f5f5f5",
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 16, color: "#959595" }}>✕</Text>
            </TouchableOpacity>

            {/* Profile area */}
            <View style={{
              alignItems: "center", marginBottom: 24,
              paddingBottom: 22, borderBottomWidth: 1.5, borderBottomColor: "#f0f0f0",
            }}>
              <View style={{
                width: 70, height: 70, borderRadius: 35,
                backgroundColor: "#fdf0eb",
                alignItems: "center", justifyContent: "center", marginBottom: 10,
                borderWidth: 2, borderColor: "#c4451a30",
                shadowColor: "#c4451a", shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
              }}>
                <Text style={{ fontSize: 30 }}>👤</Text>
              </View>
              <Text style={{ color: "#111", fontSize: 16, fontWeight: "800" }}>
                {nickname ?? "User"}
              </Text>
              <View style={{
                marginTop: 5, paddingHorizontal: 10, paddingVertical: 3,
                backgroundColor: "#f0fdf4", borderRadius: 20, borderWidth: 1, borderColor: "#bbf7d0",
              }}>
                <Text style={{ color: "#166534", fontSize: 11, fontWeight: "700" }}>LifeLine BD Member</Text>
              </View>
            </View>

            {[
              { icon: "👤", label: "Profile",       bg: "#fdf0eb", onPress: () => { closeSidebar(); router.push("/(tabs)/profile" as any); } },
              { icon: "🔔", label: "Notifications",  bg: "#fffbeb", onPress: () => { closeSidebar(); router.push("/(tabs)/notifications" as any); } },
              { icon: "📋", label: "History",        bg: "#f0f4ff", onPress: () => { closeSidebar(); router.push("/(feat)/history" as any); } },
              { icon: "📊", label: "Dashboard",      bg: "#f0fdf4", onPress: () => { closeSidebar(); router.push("/(tabs)/dashboard" as any); } },
              { icon: "💬", label: "Chat with Operator", onPress: () => { closeSidebar(); router.push("/(feat)/chat" as any); } },
            ].map((item, i) => (
              <TouchableOpacity
                key={i} onPress={item.onPress}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 14,
                  paddingVertical: 13, paddingHorizontal: 10,
                  borderRadius: 14, marginBottom: 4,
                  backgroundColor: "transparent",
                }}
                activeOpacity={0.7}
              >
                <View style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: item.bg,
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                </View>
                <Text style={{ color: "#faf7f7", fontSize: 15, fontWeight: "600" }}>{item.label}</Text>
                <Text style={{ color: "#ccc", marginLeft: "auto", fontSize: 16 }}>›</Text>
              </TouchableOpacity>
            ))}

            <View style={{ height: 1.5, backgroundColor: "#f0f0f0", marginVertical: 14 }} />

            <TouchableOpacity
              onPress={handleLogout}
              style={{
                flexDirection: "row", alignItems: "center", gap: 14,
                paddingVertical: 13, paddingHorizontal: 10, borderRadius: 14,
                backgroundColor: "#fff5f5",
              }}
              activeOpacity={0.7}
            >
              <View style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: "#fee2e2",
                alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ fontSize: 18 }}>🚪</Text>
              </View>
              <Text style={{ color: "#dc2626", fontSize: 15, fontWeight: "700" }}>Logout</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* ══ UNIFIED MODAL ══ */}
      <Modal visible={showUnified} animationType="slide" transparent onRequestClose={() => setShowUnified(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" }}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 28, borderTopRightRadius: 28,
              overflow: "hidden", maxHeight: "92%",
            }}>
              {/* Modal header */}
              <View style={{
                backgroundColor: "#c4451a",
                paddingHorizontal: 20, paddingTop: 22, paddingBottom: 18,
                flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{
                    width: 40, height: 40, borderRadius: 20,
                    backgroundColor: "rgba(255,255,255,0.2)",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Text style={{ fontSize: 22 }}>⚡</Text>
                  </View>
                  <View>
                    <Text style={{ color: "#fff", fontSize: 17, fontWeight: "900" }}>Unified Emergency</Text>
                    <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 1 }}>
                      Request multiple services at once
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setShowUnified(false)}
                  style={{
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: "rgba(255,255,255,0.2)",
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
                <Text style={modalLabel}>Select Required Services <Text style={{ color: "#dc2626" }}>*</Text></Text>
                <View style={{
                  borderWidth: 1.5, borderColor: "#e8e3dd",
                  borderRadius: 14, marginBottom: 16, overflow: "hidden",
                }}>
                  {UNIFIED_SERVICES.map((svc, index) => (
                    <TouchableOpacity
                      key={svc.value}
                      onPress={() => toggleService(svc.value)}
                      style={{
                        flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
                        borderBottomWidth: index < UNIFIED_SERVICES.length - 1 ? 1 : 0,
                        borderBottomColor: "#f3f4f6",
                        backgroundColor: selectedServices.includes(svc.value) ? "#fdf0eb" : "#fff",
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={{
                        width: 22, height: 22, borderRadius: 4, borderWidth: 2,
                        borderColor: selectedServices.includes(svc.value) ? "#c4451a" : "#d1d5db",
                        backgroundColor: selectedServices.includes(svc.value) ? "#c4451a" : "#fff",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        {selectedServices.includes(svc.value) && (
                          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "900" }}>✓</Text>
                        )}
                      </View>
                      <Text style={{ fontSize: 20 }}>{svc.icon}</Text>
                      <Text style={{
                        fontSize: 14, fontWeight: "600",
                        color: selectedServices.includes(svc.value) ? "#c4451a" : "#111",
                      }}>
                        {svc.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={modalLabel}>Emergency Type <Text style={{ color: "#dc2626" }}>*</Text></Text>
                <TextInput value={emergencyType} onChangeText={setEmergencyType}
                  placeholder="e.g. Road accident, Building fire..."
                  placeholderTextColor="#bbb" style={inputStyle} />

                <Text style={modalLabel}>Your Location <Text style={{ color: "#dc2626" }}>*</Text></Text>
                <View style={{ position: "relative", marginBottom: 14 }}>
                  <TextInput value={locationText} onChangeText={setLocationText}
                    placeholder="Enter location or tap 📍 to detect"
                    placeholderTextColor="#bbb"
                    style={[inputStyle, { paddingRight: 52, marginBottom: 0 }]} />
                  <TouchableOpacity onPress={handleFetchLocation} disabled={fetchingLocation}
                    style={{
                      position: "absolute", right: 10, top: 10,
                      width: 32, height: 32, borderRadius: 16,
                      backgroundColor: "#fdf0eb",
                      alignItems: "center", justifyContent: "center",
                    }}>
                    {fetchingLocation
                      ? <ActivityIndicator size="small" color="#c4451a" />
                      : <Text style={{ fontSize: 18 }}>📍</Text>}
                  </TouchableOpacity>
                </View>

                <Text style={modalLabel}>Description <Text style={{ color: "#dc2626" }}>*</Text></Text>
                <TextInput value={description} onChangeText={setDescription}
                  placeholder="Describe the emergency situation..."
                  placeholderTextColor="#bbb" multiline
                  style={[inputStyle, { minHeight: 90, textAlignVertical: "top" }]} />

                <Text style={modalLabel}>Contact Number <Text style={{ color: "#dc2626" }}>*</Text></Text>
                <TextInput value={contactNumber} onChangeText={setContactNumber}
                  placeholder="Your phone number"
                  placeholderTextColor="#bbb" keyboardType="phone-pad" style={inputStyle} />

                <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
                  <TouchableOpacity onPress={() => setShowUnified(false)}
                    style={{
                      flex: 1, borderWidth: 1.5, borderColor: "#e8e3dd",
                      borderRadius: 12, paddingVertical: 14, alignItems: "center",
                    }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#888" }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSubmitUnified} disabled={submitting}
                    style={{
                      flex: 2, backgroundColor: "#c4451a", borderRadius: 12,
                      paddingVertical: 14, alignItems: "center", opacity: submitting ? 0.7 : 1,
                      shadowColor: "#c4451a", shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
                    }}>
                    {submitting
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={{ fontSize: 14, fontWeight: "800", color: "#fff", letterSpacing: 0.5 }}>Submit Emergency</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      
    </View>
    
  );
}

const modalLabel = { fontSize: 13, fontWeight: "700" as const, color: "#111", marginBottom: 6, marginTop: 2 };
const inputStyle = {
  borderWidth: 1.5, borderColor: "#e8e3dd", borderRadius: 12,
  padding: 13, fontSize: 13, color: "#111",
  backgroundColor: "#fafafa", marginBottom: 14,
};


/*

*/