import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Alert, Linking, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import { StatusBar } from "expo-status-bar";
import {
  doc, setDoc, addDoc, collection, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { getUserProfile } from "../../services/auth";
import { useAuthStore } from "../../store/authStore";
import VerificationGuard from "../../components/ui/VerificationGuard";
import { useVerification } from "../../hooks/useVerification";

const INCIDENTS = [
  { value: "theft",      label: "Theft / Robbery",           icon: "ℹ️" },
  { value: "harassment", label: "Harassment /\nWomen Safety", icon: "⚠️" },
  { value: "violence",   label: "Violence / Threat",          icon: "⚠️" },
  { value: "missing",    label: "Missing Person",             icon: "ℹ️" },
  { value: "accident",   label: "Accident / Crowd Control",   icon: "ℹ️" },
  { value: "suspicious", label: "Suspicious Activity",        icon: "ℹ️" },
];

const TIPS = [
  "Move to a safe place if possible",
  "Avoid confrontation",
  "Note any identifying details",
  "Stay on the line with emergency services",
];

type NearbyStation = {
  id: number;
  name: string;
  dist: string;
  lat: number;
  lon: number;
  phone?: string | null;
};

// ── Haversine distance in km ──
function getDistanceKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

 // ── Smart fallback — uses user coords so Maps link is still useful ──
  function getLocationBasedFallback(lat: number, lon: number): NearbyStation[] {
    return [
      {
        id: 0,
        name: "Nearest Police Station (tap to find)",
        dist: "Unknown",
        lat,
        lon,
        phone: "999",
      },
    ];
  }

export default function PoliceScreen() {
  const router = useRouter();
  const { user, nickname } = useAuthStore();
  const uid = user?.uid ?? "";

  const [selected, setSelected]               = useState<string | null>(null);
  const [description, setDescription]         = useState("");
  const [uploadedFiles, setUploadedFiles]     = useState<string[]>([]);
  const [submitting, setSubmitting]           = useState(false);
  const [isActivated, setIsActivated]         = useState(false);
  const [activating, setActivating]           = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [location, setLocation]               = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [recording, setRecording]             = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri]       = useState<string | null>(null);
  const [isRecording, setIsRecording]         = useState(false);
  const [profile, setProfile]                 = useState<any>(null);
  const [stations, setStations]               = useState<NearbyStation[]>([]);
  const [stationsLoading, setStationsLoading] = useState(false);
  const { showGuard, setShowGuard, requireVerified } = useVerification();

  // ── Fetch profile ──
  useEffect(() => {
    if (!uid) return;
    getUserProfile(uid).then(setProfile).catch(console.error);
  }, [uid]);

  // ── Fetch location then nearby stations ──
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const coords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        setLocation(coords);
        fetchNearbyStations(coords.latitude, coords.longitude);
      } else {
        Alert.alert("Permission Denied", "Location permission is required.");
      }
      setLocationLoading(false);
    })();
  }, []);

  // ── Overpass API — fetch real nearby police stations ──
 {/*
  const fetchNearbyStations = async (lat: number, lon: number) => {
    setStationsLoading(true);
    try {
      const radius = 5000; // 5km radius
      const query = `
        [out:json][timeout:10];
        (
          node["amenity"="police"](around:${radius},${lat},${lon});
          way["amenity"="police"](around:${radius},${lat},${lon});
        );
        out center 10;
      `;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.elements && data.elements.length > 0) {
        const list: NearbyStation[] = data.elements
          .map((el: any) => {
            const elLat = el.lat ?? el.center?.lat;
            const elLon = el.lon ?? el.center?.lon;
            if (!elLat || !elLon) return null;
            const dist = getDistanceKm(lat, lon, elLat, elLon);
            return {
              id: el.id,
              name: el.tags?.name ?? el.tags?.["name:en"] ?? "Police Station",
              dist: dist < 1
                ? `${Math.round(dist * 1000)} m`
                : `${dist.toFixed(1)} km`,
              lat: elLat,
              lon: elLon,
            };
          })
          .filter(Boolean)
          .sort((a: NearbyStation, b: NearbyStation) => {
            const da = parseFloat(a.dist);
            const db2 = parseFloat(b.dist);
            return da - db2;
          })
          .slice(0, 5);
        setStations(list);
      } else {
        // Fallback if no results
        setStations([
          { id: 1, name: "Dhaka Metro Police Station", dist: "1.2 km", lat, lon },
          { id: 2, name: "Gulshan Police Station",     dist: "2.5 km", lat, lon },
          { id: 3, name: "Banani Police Station",      dist: "3.1 km", lat, lon },
        ]);
      }
    } catch {
      // Fallback on error
      setStations([
        { id: 1, name: "Dhaka Metro Police Station", dist: "1.2 km", lat, lon },
        { id: 2, name: "Gulshan Police Station",     dist: "2.5 km", lat, lon },
        { id: 3, name: "Banani Police Station",      dist: "3.1 km", lat, lon },//ISSUES IN THIS PART
      ]);
    } finally {
      setStationsLoading(false);
    }
  };
  */}

  const fetchNearbyStations = async (lat: number, lon: number) => {
    setStationsLoading(true);
    try {
      // Increased radius to 10km and added timeout buffer
      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="police"](around:10000,${lat},${lon});
          way["amenity"="police"](around:10000,${lat},${lon});
          relation["amenity"="police"](around:10000,${lat},${lon});
        );
        out center 10;
      `;

      const res = await fetch(
        `https://overpass-api.de/api/interpreter`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `data=${encodeURIComponent(query)}`,
        }
      );

      const data = await res.json();

      if (data.elements && data.elements.length > 0) {
        const list: NearbyStation[] = data.elements
          .map((el: any) => {
            const elLat = el.lat ?? el.center?.lat;
            const elLon = el.lon ?? el.center?.lon;
            if (!elLat || !elLon) return null;
            const dist = getDistanceKm(lat, lon, elLat, elLon);
            return {
              id: el.id,
              name:
                el.tags?.["name:en"] ??
                el.tags?.name ??
                "Police Station",
              dist:
                dist < 1
                  ? `${Math.round(dist * 1000)} m`
                  : `${dist.toFixed(1)} km`,
              lat: elLat,
              lon: elLon,
              phone: el.tags?.phone ?? el.tags?.["contact:phone"] ?? null,
            };
          })
          .filter(Boolean)
          .sort((a: NearbyStation, b: NearbyStation) => {
            const distA = parseFloat(a.dist);
            const distB = parseFloat(b.dist);
            return distA - distB;
          })
          .slice(0, 5);

        setStations(list);
      } else {
        // Only use fallback if API returns truly empty
        setStations(getLocationBasedFallback(lat, lon));
      }
    } catch (err) {
      console.error("Overpass API error:", err);
      setStations(getLocationBasedFallback(lat, lon));
    } finally {
      setStationsLoading(false);
    }
  };
 

  // ── Urgent Activate ──
  const handleUrgentActivate = async () => {
    console.log("UID:", uid);
    console.log("Location:", location);
    console.log("Profile:", profile);
    if (!location) {
      Alert.alert("Location not ready", "Please wait for your location to load.");
      return;
    }
    setActivating(true);
    try {
      const mapsLink = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
      if (!isActivated) {
        await setDoc(doc(db, "policeAlerts", uid), {
          uid,
          nickname: nickname ?? "Unknown",
          latitude: location.latitude,
          longitude: location.longitude,
          mapsLink,
          activatedAt: serverTimestamp(),
          active: true,
          status: "active",
          type: "police_panic",
        });
        await addDoc(collection(db, "notifications"), {
          type: "policePanic",
          title: "🚨 Police Panic Alert",
          body: `${nickname ?? "Someone"} has activated Police Panic Mode!`,
          reportedBy: nickname ?? "Unknown",
          reportedByUid: uid,
          location: { latitude: location.latitude, longitude: location.longitude, mapsLink },
          severity: "high",
          read: false,
          createdAt: serverTimestamp(),
        });
        setIsActivated(true);
        Alert.alert("🚨 Urgent Alert Activated", "Police operators have been alerted with your live location!");
      } else {
        await setDoc(doc(db, "policeAlerts", uid), {
          uid, active: false, status: "resolved",
          deactivatedAt: serverTimestamp(),
        });
        setIsActivated(false);
        Alert.alert("Deactivated", "Urgent alert has been turned off.");
      }
    } catch (err) {
      Alert.alert("Error", "Could not send alert. Please call 999 directly.");
      console.error(err);
    } finally {
      setActivating(false);
    }
  };

  // ── Request Security Guard ──
  const handleSecurityRequest = async () => {
    if (!location) {
      Alert.alert("Location not ready", "Please wait for your location to load.");
      return;
    }
    setSecurityLoading(true);
    try {
      const mapsLink = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
      await addDoc(collection(db, "securityRequests"), {
        uid,
        requestedBy: nickname ?? "Unknown",
        latitude: location.latitude,
        longitude: location.longitude,
        mapsLink,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, "notifications"), {
        type: "securityRequest",
        title: "🔒 Security Guard Request",
        body: `${nickname ?? "Someone"} has requested a security/protection guard.`,
        reportedBy: nickname ?? "Unknown",
        reportedByUid: uid,
        location: { latitude: location.latitude, longitude: location.longitude, mapsLink },
        severity: "normal",
        read: false,
        createdAt: serverTimestamp(),
      });
      Alert.alert("✅ Request Sent", "Your security guard request has been sent to operators.");
    } catch (err) {
      Alert.alert("Error", "Could not send request. Please try again.");
      console.error(err);
    } finally {
      setSecurityLoading(false);
    }
  };

  // ── Voice Recording ──
  const handleToggleRecording = async () => {
    if (isRecording && recording) {
      try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecordingUri(uri);
        setRecording(null);
        setIsRecording(false);
        Alert.alert("✅ Recording saved", "Voice note attached to your report.");
      } catch {
        Alert.alert("Error", "Could not stop recording.");
      }
    } else {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Denied", "Microphone permission is required.");
          return;
        }
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(newRecording);
        setIsRecording(true);
      } catch (err) {
        Alert.alert("Error", "Could not start recording.");
        console.error(err);
      }
    }
  };

  // ── File Upload ──
  const handleUploadFile = async () => {
    Alert.alert("Upload Evidence", "Choose source", [
      {
        text: "Camera / Gallery",
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permission Denied", "Gallery permission is required.");
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsMultipleSelection: true,
            quality: 0.8,
          });
          if (!result.canceled) {
            const uris = result.assets.map((a) => a.uri);
            setUploadedFiles((prev) => [...prev, ...uris]);
            Alert.alert("✅ Files attached", `${uris.length} file(s) added.`);
          }
        },
      },
      {
        text: "Document",
        onPress: async () => {
          const result = await DocumentPicker.getDocumentAsync({
            type: "*/*", multiple: true,
          });
          if (!result.canceled) {
            const uris = result.assets.map((a) => a.uri);
            setUploadedFiles((prev) => [...prev, ...uris]);
            Alert.alert("✅ Files attached", `${uris.length} file(s) added.`);
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // ── Submit Report ──
  // Voice OR text — if voice given, text is optional
  const handleSubmit = async () => {
    if (!selected)
      return Alert.alert("Missing field", "Please select an incident type (*).");
    if (!description.trim() && !recordingUri)
      return Alert.alert("Missing field", "Please describe the incident or record a voice note (*).");
    if (!location)
      return Alert.alert("GPS unavailable", "Please enable location services.");
    if (!uid) return;

    setSubmitting(true);
    try {
      const mapsLink = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
      const reportRef = await addDoc(collection(db, "policeReports"), {
        uid,
        reportedBy: nickname ?? "Unknown",
        type: selected,
        description: description.trim() || "(Voice note provided)",
        location: { latitude: location.latitude, longitude: location.longitude, mapsLink },
        evidenceFiles: uploadedFiles,
        voiceNoteUri: recordingUri ?? null,
        status: "pending",
        isSOS: false,
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, "notifications"), {
        type: "policeReport",
        reportId: reportRef.id,
        title: "🚔 New Police Report",
        body: `${nickname ?? "Someone"} reported a ${selected} incident`,
        reportedBy: nickname ?? "Unknown",
        reportedByUid: uid,
        location: { latitude: location.latitude, longitude: location.longitude, mapsLink },
        severity: selected === "violence" || selected === "harassment" ? "high" : "normal",
        read: false,
        createdAt: serverTimestamp(),
      });
      Alert.alert("✅ Report Submitted", "Your report has been sent to the operators.", [{ text: "OK" }]);
      setSelected(null);
      setDescription("");
      setUploadedFiles([]);
      setRecordingUri(null);
    } catch (err) {
      Alert.alert("Error", "Submission failed. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f0eb" }}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={{
        backgroundColor: "#1a4a4a",
        paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16,
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 34, height: 34, borderRadius: 9,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>অভয়</Text>
            <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>LifeLine BD</Text>
          </View>
        </View>
        <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 18 }}>☰</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={{
          backgroundColor: "#c4451a", margin: 12, borderRadius: 16, padding: 16,
        }}>
          <View style={{
            width: 38, height: 38, borderRadius: 9,
            backgroundColor: "rgba(255,255,255,0.2)",
            alignItems: "center", justifyContent: "center", marginBottom: 8,
          }}>
            <Text style={{ fontSize: 18 }}>🛡️</Text>
          </View>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "900", lineHeight: 24 }}>
            Police{"\n"}Emergency
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 4 }}>
            Emergency law enforcement assistance
          </Text>
        </View>

        <View style={{ paddingHorizontal: 12 }}>

          {/* Verification warning */}
          {profile && profile.verificationStatus !== "verified" && (
            <View style={{
              backgroundColor: "#fff7ed", borderWidth: 1, borderColor: "#fed7aa",
              borderRadius: 12, padding: 12, marginBottom: 16,
              flexDirection: "row", alignItems: "center", gap: 10,
            }}>
              <Text style={{ fontSize: 18 }}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#92400e", fontWeight: "700", fontSize: 13 }}>
                  Account not verified
                </Text>
                <Text style={{ color: "#b45309", fontSize: 12, marginTop: 2 }}>
                  Verify your account to activate urgent alert
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/profile" as any)}
                style={{
                  backgroundColor: "#c4451a", borderRadius: 8,
                  paddingHorizontal: 10, paddingVertical: 5,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>Verify</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Urgent Activate */}
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#1a1a1a", marginBottom: 8 }}>
            Urgent Alert
          </Text>
          <View style={{ alignItems: "center", marginBottom: 8 }}>
            <TouchableOpacity
              onPress={() => requireVerified(profile, handleUrgentActivate)}
              disabled={activating || locationLoading}
              style={{
                backgroundColor: isActivated ? "#dc2626" : "#2d3748",
                width: 140, height: 140, borderRadius: 70,
                alignItems: "center", justifyContent: "center",
                elevation: 8,
                shadowColor: isActivated ? "#dc2626" : "#2d3748",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4, shadowRadius: 10,
                borderWidth: 4,
                borderColor: isActivated ? "#fca5a5" : "#4a5568",
                opacity: profile?.verificationStatus !== "verified" ? 0.6 : 1,
              }}
              activeOpacity={0.85}
            >
              {activating ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : (
                <>
                  <Text style={{ fontSize: 36 }}>
                    {profile?.verificationStatus !== "verified"
                      ? "🔒" : isActivated ? "🚨" : "🛡️"}
                  </Text>
                  <Text style={{
                    color: "#fff", fontWeight: "800", fontSize: 13,
                    marginTop: 6, textAlign: "center",
                  }}>
                    {isActivated ? "DEACTIVATE" : "URGENT\nACTIVATE"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={{
            color: isActivated ? "#dc2626" : "#6b7280",
            fontWeight: "600", fontSize: 12,
            textAlign: "center", marginBottom: 16,
          }}>
            {isActivated
              ? "🚨 Alert is ACTIVE — operators notified!"
              : profile?.verificationStatus !== "verified"
                ? "🔒 Verify your account to use urgent alert"
                : "Tap to send urgent alert to police operators"}
          </Text>

          {/* Security Guard Request Button */}
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#1a1a1a", marginBottom: 8 }}>
            Request Protection
          </Text>
          <TouchableOpacity
            onPress={handleSecurityRequest}
            disabled={securityLoading || locationLoading}
            style={{
              backgroundColor: "#1a4a4a", borderRadius: 12,
              paddingVertical: 14, alignItems: "center",
              flexDirection: "row", justifyContent: "center", gap: 8,
              marginBottom: 20,
              opacity: securityLoading ? 0.7 : 1,
            }}
          >
            {securityLoading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Text style={{ fontSize: 18 }}>🔒</Text>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                    Request Security / Protection Guard
                  </Text>
                </>
            }
          </TouchableOpacity>

          {/* Location */}
          <View style={{
            backgroundColor: "#f0faf5", borderWidth: 1, borderColor: "#bbf0d8",
            borderRadius: 12, padding: 12, alignItems: "center", marginBottom: 16,
          }}>
            <Text style={{ fontSize: 20 }}>📍</Text>
            {locationLoading ? (
              <ActivityIndicator size="small" color="#1a7a4a" style={{ marginTop: 4 }} />
            ) : location ? (
              <>
                <Text style={{ fontSize: 12, color: "#1a7a4a", marginTop: 4 }}>
                  Dhaka, Bangladesh
                </Text>
                <Text style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                  {location.latitude.toFixed(4)}° N, {location.longitude.toFixed(4)}° E
                </Text>
              </>
            ) : (
              <Text style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>
                Location unavailable
              </Text>
            )}
          </View>

          {/* Incident Type * */}
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#1a1a1a", marginBottom: 8 }}>
            Incident Type <Text style={{ color: "#dc2626" }}>*</Text>
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {INCIDENTS.map((inc) => (
              <TouchableOpacity
                key={inc.value}
                onPress={() => setSelected(inc.value)}
                style={{
                  width: "47.5%",
                  backgroundColor: selected === inc.value ? "#fdf0eb" : "#fff",
                  borderRadius: 12, borderWidth: 1,
                  borderColor: selected === inc.value ? "#c4451a" : "#e8e4df",
                  paddingVertical: 14, alignItems: "center", gap: 6,
                }}
                activeOpacity={0.85}
              >
                <Text style={{ fontSize: 20 }}>{inc.icon}</Text>
                <Text style={{
                  fontSize: 11, fontWeight: "500",
                  color: "#1a1a1a", textAlign: "center",
                }}>
                  {inc.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Description * (optional if voice given) */}
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#1a1a1a", marginBottom: 4 }}>
            Description{" "}
            {!recordingUri && <Text style={{ color: "#dc2626" }}>*</Text>}
            {recordingUri && (
              <Text style={{ color: "#6b7280", fontSize: 11, fontWeight: "400" }}>
                {" "}(optional — voice note provided)
              </Text>
            )}
          </Text>
          <View style={{ position: "relative", marginBottom: 6 }}>
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder={
                recordingUri
                  ? "Add text details (optional)..."
                  : "Describe what happened... *"
              }
              placeholderTextColor="#9ca3af"
              style={{
                backgroundColor: "#fff", borderWidth: 1,
                borderColor: recordingUri ? "#bbf0d8" : "#e8e4df",
                borderRadius: 12, padding: 12, paddingRight: 48,
                fontSize: 13, color: "#1a1a1a",
                minHeight: 100, textAlignVertical: "top",
              }}
            />
            <TouchableOpacity
              onPress={handleToggleRecording}
              style={{
                position: "absolute", bottom: 10, right: 10,
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: isRecording ? "#dc2626" : "#c4451a",
                alignItems: "center", justifyContent: "center",
                elevation: 3,
              }}
            >
              <Text style={{ fontSize: 16 }}>{isRecording ? "⏹️" : "🎤"}</Text>
            </TouchableOpacity>
          </View>

          {isRecording && (
            <Text style={{
              color: "#dc2626", fontSize: 12, fontWeight: "600",
              marginBottom: 8, textAlign: "center",
            }}>
              🔴 Recording... tap mic to stop
            </Text>
          )}
          {recordingUri && (
            <View style={{
              flexDirection: "row", alignItems: "center", gap: 6,
              backgroundColor: "#f0faf5", borderRadius: 8,
              padding: 8, marginBottom: 8,
            }}>
              <Text style={{ fontSize: 14 }}>🎤</Text>
              <Text style={{ fontSize: 12, color: "#1a7a4a", fontWeight: "600" }}>
                Voice note attached
              </Text>
              <TouchableOpacity
                onPress={() => setRecordingUri(null)}
                style={{ marginLeft: "auto" as any }}
              >
                <Text style={{ fontSize: 12, color: "#dc2626" }}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Upload */}
          <Text style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8, marginTop: 8 }}>
            Evidence — photos, videos, or documents
          </Text>
          <TouchableOpacity
            onPress={handleUploadFile}
            style={{
              borderWidth: 1.5, borderStyle: "dashed", borderColor: "#d1d5db",
              borderRadius: 12, paddingVertical: 24, alignItems: "center",
              backgroundColor: "#fff", gap: 6, marginBottom: 8,
            }}
          >
            <Text style={{ fontSize: 26 }}>⬆️</Text>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#1a1a1a" }}>
              Tap to upload evidence
            </Text>
            <Text style={{ fontSize: 11, color: "#9ca3af" }}>
              Images, videos, or documents
            </Text>
          </TouchableOpacity>

          {uploadedFiles.length > 0 && (
            <View style={{
              backgroundColor: "#f0faf5", borderRadius: 10,
              padding: 10, marginBottom: 16,
            }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#1a7a4a", marginBottom: 6 }}>
                ✅ {uploadedFiles.length} file(s) attached
              </Text>
              {uploadedFiles.map((f, i) => (
                <View key={i} style={{
                  flexDirection: "row", alignItems: "center",
                  justifyContent: "space-between", marginBottom: 4,
                }}>
                  <Text style={{ fontSize: 11, color: "#374151", flex: 1 }} numberOfLines={1}>
                    📎 {f.split("/").pop()}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setUploadedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Text style={{ fontSize: 11, color: "#dc2626" }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Nearby Stations */}
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#1a1a1a", marginBottom: 10 }}>
            📍 Nearby Police Stations
          </Text>
          {stationsLoading ? (
            <View style={{
              backgroundColor: "#fff", borderRadius: 12, padding: 24,
              alignItems: "center", marginBottom: 8,
            }}>
              <ActivityIndicator color="#c4451a" />
              <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 8 }}>
                Finding nearby stations...
              </Text>
            </View>
          ) : (
            stations.map((s) => (
              <View key={s.id} style={{
                backgroundColor: "#fff", borderRadius: 12, borderWidth: 1,
                borderColor: "#e8e4df", padding: 12, marginBottom: 8,
              }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#1a1a1a" }}>
                  {s.name}
                </Text>
                <View style={{
                  flexDirection: "row", justifyContent: "space-between", marginVertical: 6,
                }}>
                  <Text style={{ fontSize: 11, color: "#9ca3af" }}>Distance:</Text>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#c4451a" }}>
                    {s.dist}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(`https://maps.google.com/?q=${s.lat},${s.lon}`)
                    }
                    style={{
                      flex: 1, backgroundColor: "#1a4a4a", borderRadius: 8,
                      paddingVertical: 9, alignItems: "center",
                      flexDirection: "row", justifyContent: "center", gap: 4,
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
                      🗺️ Maps
                    </Text>
                  </TouchableOpacity>

                  {s.phone ? (
                    <TouchableOpacity
                      onPress={() =>
                        Linking.openURL(`tel:${s.phone!.replace(/\s/g, "")}`)
                      }
                      style={{
                        flex: 1, backgroundColor: "#c4451a", borderRadius: 8,
                        paddingVertical: 9, alignItems: "center",
                        flexDirection: "row", justifyContent: "center", gap: 4,
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
                        📞 Call
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))
          )}
          {/* Tips */}
          <View style={{
            backgroundColor: "#fff8e8", borderWidth: 1, borderColor: "#f5d78a",
            borderRadius: 12, padding: 14, marginBottom: 16, marginTop: 8,
          }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#8a6a00", marginBottom: 10 }}>
              ⚠️ Emergency Tips
            </Text>
            {TIPS.map((tip, i) => (
              <View key={i} style={{
                flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8,
              }}>
                <View style={{
                  width: 20, height: 20, borderRadius: 10, backgroundColor: "#c4451a",
                  alignItems: "center", justifyContent: "center", marginTop: 1,
                }}>
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{i + 1}</Text>
                </View>
                <Text style={{ fontSize: 12, color: "#1a1a1a", flex: 1, lineHeight: 18 }}>
                  {tip}
                </Text>
              </View>
            ))}
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            style={{
              backgroundColor: "#c4451a", borderRadius: 10,
              paddingVertical: 14, alignItems: "center", marginBottom: 30,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                  📋 Submit Report to Operator
                </Text>
            }
          </TouchableOpacity>

        </View>
      </ScrollView>

      <VerificationGuard
        visible={showGuard}
        onClose={() => setShowGuard(false)}
        featureName="Police Urgent Alert"
      />
    </View>
  );
}