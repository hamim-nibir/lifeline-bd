import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal,
  TextInput, Alert, FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { db } from "../../services/firebase";
import { useAuthStore } from "../../store/authStore";
import {
  collection, query, where, getDocs,
  addDoc, serverTimestamp, doc, getDoc,
} from "firebase/firestore";

// ─── Types ───────────────────────────────────────────────
type BloodGroup = "A+" | "A-" | "B+" | "B-" | "O+" | "O-" | "AB+" | "AB-";

type Donor = {
  uid: string;
  nickname: string;
  bloodGroup: BloodGroup;
  lastDonationDate: any;
  isAvailableToDonate: boolean;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  distance?: number; // km, calculated client-side
};

// ─── Constants ───────────────────────────────────────────
const ALL_BLOOD_GROUPS: BloodGroup[] = [
  "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-",
];

// Who can donate to whom
const COMPATIBLE_DONORS: Record<BloodGroup, BloodGroup[]> = {
  "A+": ["A+", "A-", "O+", "O-"],
  "A-": ["A-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "O+": ["O+", "O-"],
  "O-": ["O-"],
  "AB+": ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"],
  "AB-": ["A-", "B-", "O-", "AB-"],
};

const BLOOD_GROUP_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "A+": { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  "A-": { bg: "#fff1f2", text: "#e11d48", border: "#fda4af" },
  "B+": { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
  "B-": { bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" },
  "O+": { bg: "#f0fdf4", text: "#16a34a", border: "#86efac" },
  "O-": { bg: "#ecfdf5", text: "#059669", border: "#6ee7b7" },
  "AB+": { bg: "#fdf4ff", text: "#9333ea", border: "#e9d5ff" },
  "AB-": { bg: "#faf5ff", text: "#7c3aed", border: "#ddd6fe" },
};

// ─── Haversine distance formula ──────────────────────────
const getDistanceKm = (
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)}m away`;
  if (km < 10) return `${km.toFixed(1)}km away`;
  return `${Math.round(km)}km away`;
};

const formatLastDonation = (timestamp: any): string => {
  if (!timestamp) return "Never donated";
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  const diffMonths = Math.floor(diffDays / 30);
  if (diffDays < 30) return `Donated ${diffDays}d ago`;
  if (diffMonths === 1) return "Donated 1 month ago";
  return `Donated ${diffMonths} months ago`;
};

// ─── Main Screen ─────────────────────────────────────────
export default function BloodBanksScreen() {
  const router = useRouter();
  const { user, nickname } = useAuthStore();
  const uid = user?.uid ?? "";

  // My profile
  const [myBloodGroup, setMyBloodGroup] = useState<BloodGroup | null>(null);
  const [myLocation, setMyLocation] = useState<{
    latitude: number; longitude: number;
  } | null>(null);

  // Donors
  const [donors, setDonors] = useState<Donor[]>([]);
  const [filteredDonors, setFilteredDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);

  // Filters
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<BloodGroup | "ALL" | "COMPATIBLE">("COMPATIBLE");
  const [searchText, setSearchText] = useState("");
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true);

  // Request modal
  const [requestModal, setRequestModal] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [sending, setSending] = useState(false);

  // ── Get current location ──
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Location needed",
            "Allow location access to see nearby donors sorted by distance."
          );
          setLocationLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setMyLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch (err) {
        console.error("Location error:", err);
      } finally {
        setLocationLoading(false);
      }
    })();
  }, []);

  // ── Fetch my profile (blood group) ──
  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, "users", uid)).then((snap) => {
      if (snap.exists()) {
        setMyBloodGroup(snap.data().bloodGroup ?? null);
      }
    });
  }, [uid]);

  // ── Fetch all available donors ──
  const fetchDonors = useCallback(async () => {
    try {
      // Fetch users who have blood group set and are available
      const baseQuery = showOnlyAvailable
        ? query(
          collection(db, "users"),
          where("isAvailableToDonate", "==", true),
          where("bloodGroup", "!=", null)
        )
        : query(
          collection(db, "users"),
          where("bloodGroup", "!=", null)
        );

      const snap = await getDocs(baseQuery);
      const list: Donor[] = [];

      snap.docs.forEach((d) => {
        // Exclude self
        if (d.id === uid) return;
        const data = d.data();
        if (!data.bloodGroup) return;

        const donor: Donor = {
          uid: d.id,
          nickname: data.nickname ?? "Anonymous",
          bloodGroup: data.bloodGroup,
          lastDonationDate: data.lastDonationDate ?? null,
          isAvailableToDonate: data.isAvailableToDonate ?? false,
          location: data.location ?? null,
        };

        // Calculate distance if we have both locations
        if (myLocation && data.location?.latitude && data.location?.longitude) {
          donor.distance = getDistanceKm(
            myLocation.latitude,
            myLocation.longitude,
            data.location.latitude,
            data.location.longitude
          );
        }

        list.push(donor);
      });

      // Sort: donors with known distance first (by distance asc), then unknown distance
      list.sort((a, b) => {
        if (a.distance !== undefined && b.distance !== undefined)
          return a.distance - b.distance;
        if (a.distance !== undefined) return -1;
        if (b.distance !== undefined) return 1;
        return 0;
      });

      setDonors(list);
    } catch (err) {
      console.error("Failed to fetch donors:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [uid, myLocation, showOnlyAvailable]);

  useEffect(() => {
    if (!locationLoading) fetchDonors();
  }, [locationLoading, fetchDonors]);

  // ── Apply filters ──
  useEffect(() => {
    let result = [...donors];

    // Blood group filter
    if (selectedBloodGroup === "COMPATIBLE" && myBloodGroup) {
      const compatible = COMPATIBLE_DONORS[myBloodGroup] ?? [];
      result = result.filter((d) => compatible.includes(d.bloodGroup));
    } else if (selectedBloodGroup !== "ALL" && selectedBloodGroup !== "COMPATIBLE") {
      result = result.filter((d) => d.bloodGroup === selectedBloodGroup);
    }

    // Search filter (by nickname or address)
    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      result = result.filter(
        (d) =>
          d.nickname.toLowerCase().includes(lower) ||
          d.location?.address?.toLowerCase().includes(lower)
      );
    }

    setFilteredDonors(result);
  }, [donors, selectedBloodGroup, searchText, myBloodGroup]);

  // ── Send blood request ──
  const handleSendRequest = async () => {
    if (!selectedDonor) return;
    if (!requestMessage.trim()) {
      Alert.alert("Required", "Please write a message explaining your need.");
      return;
    }

    setSending(true);
    try {
      await addDoc(collection(db, "bloodRequests"), {
        requestedBy: uid,
        requestedByName: nickname ?? "Unknown",
        requesterBloodGroup: myBloodGroup ?? "Unknown",
        targetDonorUid: selectedDonor.uid,
        targetDonorName: selectedDonor.nickname,
        targetBloodGroup: selectedDonor.bloodGroup,
        message: requestMessage.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      });

      // Also write a notification for the donor
      await addDoc(collection(db, "notifications"), {
        type: "bloodRequest",
        title: "🩸 Blood Donation Request",
        body: `${nickname ?? "Someone"} needs ${selectedDonor.bloodGroup} blood and has requested your help.`,
        reportedBy: nickname ?? "Unknown",
        reportedByUid: uid,
        requesterId: uid,
        requesterName: nickname ?? "Unknown",
        forUid: selectedDonor.uid,
        severity: "high",
        read: false,
        createdAt: serverTimestamp(),
      });

      setRequestModal(false);
      setRequestMessage("");
      Alert.alert(
        "✅ Request Sent!",
        `Your blood request has been sent to ${selectedDonor.nickname}. They will be notified.`
      );
    } catch (err) {
      Alert.alert("Error", "Could not send request. Please try again.");
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const openRequestModal = (donor: Donor) => {
    setSelectedDonor(donor);
    setRequestMessage("");
    setRequestModal(true);
  };

  const compatibleCount = myBloodGroup
    ? donors.filter((d) =>
      (COMPATIBLE_DONORS[myBloodGroup] ?? []).includes(d.bloodGroup)
    ).length
    : 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>

      {/* ── Header ── */}
      <View style={{
        backgroundColor: "#dc2626",
        paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20,
      }}>
        <View style={{
          flexDirection: "row", alignItems: "center",
          justifyContent: "space-between", marginBottom: 16,
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: "rgba(255,255,255,0.2)", width: 36, height: 36,
              borderRadius: 18, alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>←</Text>
          </TouchableOpacity>

          {/* Available / All toggle */}
          <TouchableOpacity
            onPress={() => {
              setShowOnlyAvailable(!showOnlyAvailable);
              setLoading(true);
            }}
            style={{
              backgroundColor: showOnlyAvailable
                ? "rgba(255,255,255,0.25)"
                : "rgba(255,255,255,0.1)",
              paddingHorizontal: 12, paddingVertical: 6,
              borderRadius: 20, borderWidth: 1,
              borderColor: "rgba(255,255,255,0.35)",
              flexDirection: "row", alignItems: "center", gap: 5,
            }}
          >
            <View style={{
              width: 7, height: 7, borderRadius: 4,
              backgroundColor: showOnlyAvailable ? "#4ade80" : "#fbbf24",
            }} />
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
              {showOnlyAvailable ? "Available only" : "Show all"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>
          Blood Donors
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 }}>
          {locationLoading
            ? "Getting your location..."
            : myLocation
              ? "Sorted by distance from you"
              : "Enable location for distance sorting"}
        </Text>

        {/* My blood group pill */}
        {myBloodGroup && (
          <View style={{
            flexDirection: "row", alignItems: "center",
            gap: 6, marginTop: 10,
          }}>
            <View style={{
              backgroundColor: "rgba(255,255,255,0.2)",
              paddingHorizontal: 10, paddingVertical: 4,
              borderRadius: 12, flexDirection: "row",
              alignItems: "center", gap: 5,
            }}>
              <Text style={{ fontSize: 12 }}>🩸</Text>
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
                Your group: {myBloodGroup}
              </Text>
            </View>
            <View style={{
              backgroundColor: "rgba(255,255,255,0.15)",
              paddingHorizontal: 10, paddingVertical: 4,
              borderRadius: 12,
            }}>
              <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }}>
                {compatibleCount} compatible donor{compatibleCount !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Search bar ── */}
      <View style={{
        backgroundColor: "#fff", paddingHorizontal: 16,
        paddingVertical: 12, borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
      }}>
        <View style={{
          flexDirection: "row", alignItems: "center",
          backgroundColor: "#f9fafb", borderRadius: 12,
          paddingHorizontal: 12, paddingVertical: 10,
          borderWidth: 1, borderColor: "#e5e7eb", gap: 8,
        }}>
          <Text style={{ fontSize: 16 }}>🔍</Text>
          <TextInput
            style={{ flex: 1, fontSize: 14, color: "#1f2937" }}
            placeholder="Search by name or area..."
            placeholderTextColor="#9ca3af"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Text style={{ color: "#9ca3af", fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Blood Group Filter Chips ── */}
      <View style={{
        backgroundColor: "#fff", borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
      }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16, paddingVertical: 10, gap: 8,
          }}
        >
          {/* Compatible chip */}
          <TouchableOpacity
            onPress={() => setSelectedBloodGroup("COMPATIBLE")}
            style={{
              paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
              backgroundColor: selectedBloodGroup === "COMPATIBLE" ? "#dc2626" : "#f9fafb",
              borderWidth: 1,
              borderColor: selectedBloodGroup === "COMPATIBLE" ? "#dc2626" : "#e5e7eb",
              flexDirection: "row", alignItems: "center", gap: 4,
            }}
          >
            <Text style={{ fontSize: 12 }}>💉</Text>
            <Text style={{
              fontSize: 12, fontWeight: "700",
              color: selectedBloodGroup === "COMPATIBLE" ? "#fff" : "#6b7280",
            }}>
              Compatible
            </Text>
          </TouchableOpacity>

          {/* All chip */}
          <TouchableOpacity
            onPress={() => setSelectedBloodGroup("ALL")}
            style={{
              paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
              backgroundColor: selectedBloodGroup === "ALL" ? "#dc2626" : "#f9fafb",
              borderWidth: 1,
              borderColor: selectedBloodGroup === "ALL" ? "#dc2626" : "#e5e7eb",
            }}
          >
            <Text style={{
              fontSize: 12, fontWeight: "700",
              color: selectedBloodGroup === "ALL" ? "#fff" : "#6b7280",
            }}>
              All Groups
            </Text>
          </TouchableOpacity>

          {/* Individual blood group chips */}
          {ALL_BLOOD_GROUPS.map((bg) => {
            const colors = BLOOD_GROUP_COLORS[bg];
            const isSelected = selectedBloodGroup === bg;
            return (
              <TouchableOpacity
                key={bg}
                onPress={() => setSelectedBloodGroup(bg)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor: isSelected ? colors.bg : "#f9fafb",
                  borderWidth: 1,
                  borderColor: isSelected ? colors.border : "#e5e7eb",
                }}
              >
                <Text style={{
                  fontSize: 12, fontWeight: "700",
                  color: isSelected ? colors.text : "#6b7280",
                }}>
                  {bg}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Donor List ── */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#dc2626" />
          <Text style={{ color: "#9ca3af", marginTop: 12 }}>
            Finding donors near you...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchDonors();
              }}
              colors={["#dc2626"]}
            />
          }
        >
          {/* Result count */}
          <Text style={{
            color: "#6b7280", fontSize: 12, fontWeight: "600",
            marginBottom: 12,
          }}>
            {filteredDonors.length} donor{filteredDonors.length !== 1 ? "s" : ""} found
            {selectedBloodGroup === "COMPATIBLE" && myBloodGroup
              ? ` · Compatible with ${myBloodGroup}`
              : selectedBloodGroup !== "ALL" && selectedBloodGroup !== "COMPATIBLE"
                ? ` · Blood group ${selectedBloodGroup}`
                : ""}
          </Text>

          {/* No blood group warning */}
          {!myBloodGroup && (
            <View style={{
              backgroundColor: "#fffbeb", borderRadius: 12, padding: 14,
              marginBottom: 16, flexDirection: "row", gap: 10,
              borderWidth: 1, borderColor: "#fde68a",
            }}>
              <Text style={{ fontSize: 18 }}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#92400e", fontWeight: "700", fontSize: 13 }}>
                  Blood group not set
                </Text>
                <Text style={{ color: "#b45309", fontSize: 12, marginTop: 2 }}>
                  Set your blood group in Donation History to see compatible donors.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/(feat)/blood-donation-history" as any)}
                style={{
                  backgroundColor: "#f59e0b", borderRadius: 8,
                  paddingHorizontal: 10, paddingVertical: 6,
                  alignSelf: "flex-start",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>Set</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Empty state */}
          {filteredDonors.length === 0 ? (
            <View style={{
              backgroundColor: "#fff", borderRadius: 16, padding: 40,
              alignItems: "center", borderWidth: 1, borderColor: "#f3f4f6",
            }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🩸</Text>
              <Text style={{ color: "#374151", fontWeight: "700", fontSize: 16 }}>
                No donors found
              </Text>
              <Text style={{ color: "#9ca3af", fontSize: 13, marginTop: 6, textAlign: "center" }}>
                {showOnlyAvailable
                  ? "Try showing all donors including those in cooldown period"
                  : "No donors match your current filters"}
              </Text>
              {showOnlyAvailable && (
                <TouchableOpacity
                  onPress={() => {
                    setShowOnlyAvailable(false);
                    setLoading(true);
                  }}
                  style={{
                    marginTop: 14, backgroundColor: "#fef2f2",
                    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8,
                    borderWidth: 1, borderColor: "#fecaca",
                  }}
                >
                  <Text style={{ color: "#dc2626", fontWeight: "600", fontSize: 13 }}>
                    Show all donors
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredDonors.map((donor, index) => {
              const bgColor = BLOOD_GROUP_COLORS[donor.bloodGroup];
              const isCompatible = myBloodGroup
                ? (COMPATIBLE_DONORS[myBloodGroup] ?? []).includes(donor.bloodGroup)
                : false;

              return (
                <View
                  key={donor.uid}
                  style={{
                    backgroundColor: "#fff", borderRadius: 16,
                    marginBottom: 10, borderWidth: 1,
                    borderColor: isCompatible ? "#fecaca" : "#f3f4f6",
                    overflow: "hidden", elevation: 1,
                    shadowColor: "#000", shadowOpacity: 0.03,
                    shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
                  }}
                >
                  {/* Compatible accent */}
                  {isCompatible && (
                    <View style={{
                      position: "absolute", left: 0, top: 0, bottom: 0,
                      width: 4, backgroundColor: "#dc2626",
                    }} />
                  )}

                  <View style={{ padding: 14, paddingLeft: isCompatible ? 18 : 14 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>

                      {/* Blood group badge */}
                      <View style={{
                        width: 52, height: 52, borderRadius: 26,
                        backgroundColor: bgColor.bg,
                        borderWidth: 2, borderColor: bgColor.border,
                        alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <Text style={{
                          fontSize: 16, fontWeight: "800", color: bgColor.text,
                        }}>
                          {donor.bloodGroup}
                        </Text>
                      </View>

                      {/* Info */}
                      <View style={{ flex: 1 }}>
                        <View style={{
                          flexDirection: "row", alignItems: "center",
                          gap: 6, marginBottom: 2,
                        }}>
                          <Text style={{
                            color: "#1f2937", fontWeight: "700",
                            fontSize: 15, flex: 1,
                          }} numberOfLines={1}>
                            {donor.nickname}
                          </Text>

                          {/* Availability dot */}
                          <View style={{
                            flexDirection: "row", alignItems: "center", gap: 3,
                          }}>
                            <View style={{
                              width: 7, height: 7, borderRadius: 4,
                              backgroundColor: donor.isAvailableToDonate
                                ? "#16a34a" : "#d97706",
                            }} />
                            <Text style={{
                              fontSize: 10, fontWeight: "600",
                              color: donor.isAvailableToDonate ? "#16a34a" : "#d97706",
                            }}>
                              {donor.isAvailableToDonate ? "Available" : "Cooldown"}
                            </Text>
                          </View>
                        </View>

                        {/* Last donation */}
                        <Text style={{ color: "#9ca3af", fontSize: 11 }}>
                          🩸 {formatLastDonation(donor.lastDonationDate)}
                        </Text>

                        {/* Location */}
                        {donor.location?.address && (
                          <Text style={{
                            color: "#6b7280", fontSize: 11, marginTop: 2,
                          }} numberOfLines={1}>
                            📍 {donor.location.address}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Distance + compatible tags + Request button */}
                    <View style={{
                      flexDirection: "row", alignItems: "center",
                      gap: 8, marginTop: 12,
                    }}>
                      {/* Distance pill */}
                      {donor.distance !== undefined && (
                        <View style={{
                          backgroundColor: "#f0fdf4", borderRadius: 8,
                          paddingHorizontal: 8, paddingVertical: 4,
                          borderWidth: 1, borderColor: "#86efac",
                        }}>
                          <Text style={{
                            color: "#16a34a", fontSize: 11, fontWeight: "700",
                          }}>
                            📍 {formatDistance(donor.distance)}
                          </Text>
                        </View>
                      )}

                      {/* Compatible pill */}
                      {isCompatible && (
                        <View style={{
                          backgroundColor: "#fef2f2", borderRadius: 8,
                          paddingHorizontal: 8, paddingVertical: 4,
                          borderWidth: 1, borderColor: "#fecaca",
                        }}>
                          <Text style={{
                            color: "#dc2626", fontSize: 11, fontWeight: "700",
                          }}>
                            ✓ Compatible
                          </Text>
                        </View>
                      )}

                      {/* Spacer */}
                      <View style={{ flex: 1 }} />

                      {/* Request button */}
                      <TouchableOpacity
                        onPress={() => openRequestModal(donor)}
                        style={{
                          backgroundColor: donor.isAvailableToDonate
                            ? "#dc2626" : "#f3f4f6",
                          borderRadius: 10, paddingHorizontal: 14,
                          paddingVertical: 8, flexDirection: "row",
                          alignItems: "center", gap: 5,
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontSize: 13 }}>🩸</Text>
                        <Text style={{
                          fontSize: 12, fontWeight: "700",
                          color: donor.isAvailableToDonate ? "#fff" : "#9ca3af",
                        }}>
                          Request
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ── Blood Request Modal ── */}
      <Modal
        visible={requestModal}
        animationType="slide"
        transparent
        onRequestClose={() => setRequestModal(false)}
      >
        <View style={{
          flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}>
          <View style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, paddingBottom: 40,
          }}>
            {/* Modal header */}
            <View style={{
              flexDirection: "row", alignItems: "center",
              justifyContent: "space-between", marginBottom: 20,
            }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1f2937" }}>
                  Request Blood
                </Text>
                {selectedDonor && (
                  <Text style={{ color: "#9ca3af", fontSize: 13, marginTop: 2 }}>
                    Sending to {selectedDonor.nickname}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setRequestModal(false)}
                style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: "#f3f4f6", alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#6b7280", fontSize: 16, fontWeight: "700" }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Donor summary card */}
            {selectedDonor && (
              <View style={{
                backgroundColor: "#fef2f2", borderRadius: 14,
                padding: 14, marginBottom: 20,
                borderWidth: 1, borderColor: "#fecaca",
                flexDirection: "row", alignItems: "center", gap: 12,
              }}>
                <View style={{
                  width: 48, height: 48, borderRadius: 24,
                  backgroundColor: BLOOD_GROUP_COLORS[selectedDonor.bloodGroup].bg,
                  borderWidth: 2,
                  borderColor: BLOOD_GROUP_COLORS[selectedDonor.bloodGroup].border,
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Text style={{
                    fontSize: 15, fontWeight: "800",
                    color: BLOOD_GROUP_COLORS[selectedDonor.bloodGroup].text,
                  }}>
                    {selectedDonor.bloodGroup}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#1f2937", fontWeight: "700", fontSize: 14 }}>
                    {selectedDonor.nickname}
                  </Text>
                  <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 1 }}>
                    {selectedDonor.location?.address ?? "Location not shared"}
                  </Text>
                  {selectedDonor.distance !== undefined && (
                    <Text style={{ color: "#16a34a", fontSize: 11, marginTop: 1, fontWeight: "600" }}>
                      📍 {formatDistance(selectedDonor.distance)}
                    </Text>
                  )}
                </View>
                <View style={{
                  backgroundColor: selectedDonor.isAvailableToDonate ? "#f0fdf4" : "#fffbeb",
                  borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: selectedDonor.isAvailableToDonate ? "#86efac" : "#fde68a",
                }}>
                  <Text style={{
                    fontSize: 10, fontWeight: "700",
                    color: selectedDonor.isAvailableToDonate ? "#16a34a" : "#d97706",
                  }}>
                    {selectedDonor.isAvailableToDonate ? "✓ Available" : "Cooldown"}
                  </Text>
                </View>
              </View>
            )}

            {/* Cooldown warning */}
            {selectedDonor && !selectedDonor.isAvailableToDonate && (
              <View style={{
                backgroundColor: "#fffbeb", borderRadius: 10, padding: 12,
                marginBottom: 16, flexDirection: "row", gap: 8,
                borderWidth: 1, borderColor: "#fde68a",
              }}>
                <Text style={{ fontSize: 16 }}>⚠️</Text>
                <Text style={{ color: "#92400e", fontSize: 12, flex: 1, lineHeight: 18 }}>
                  This donor is in their cooldown period but you can still send a request.
                  They will be notified and can choose to respond.
                </Text>
              </View>
            )}

            {/* Message input */}
            <Text style={{
              color: "#374151", fontSize: 13, fontWeight: "600",
              marginBottom: 8,
            }}>
              Your Message *
            </Text>
            <TextInput
              style={{
                backgroundColor: "#f9fafb", borderWidth: 1,
                borderColor: "#e5e7eb", borderRadius: 12,
                paddingHorizontal: 14, paddingVertical: 12,
                fontSize: 14, color: "#1f2937",
                height: 100, textAlignVertical: "top",
                marginBottom: 16,
              }}
              placeholder={`Hi, I urgently need ${selectedDonor?.bloodGroup ?? ""} blood for a patient at [hospital name]. Please contact me if you can help. Thank you.`}
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              value={requestMessage}
              onChangeText={setRequestMessage}
            />

            {/* Action buttons */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => setRequestModal(false)}
                style={{
                  flex: 1, backgroundColor: "#f3f4f6",
                  borderRadius: 12, paddingVertical: 14, alignItems: "center",
                }}
              >
                <Text style={{ color: "#374151", fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSendRequest}
                disabled={sending}
                style={{
                  flex: 2, backgroundColor: "#dc2626",
                  borderRadius: 12, paddingVertical: 14,
                  alignItems: "center", flexDirection: "row",
                  justifyContent: "center", gap: 8,
                }}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={{ fontSize: 16 }}>🩸</Text>
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                      Send Request
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}
