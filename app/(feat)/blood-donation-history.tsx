import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal,
  TextInput, Alert, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { db } from "../../services/firebase";
import { useAuthStore } from "../../store/authStore";
import {
  collection, query, orderBy, getDocs,
  addDoc, serverTimestamp, doc, updateDoc, deleteDoc,
  getDoc, Timestamp,
} from "firebase/firestore";
import DateTimePicker from "@react-native-community/datetimepicker";

// ─── Types ───────────────────────────────────────────────
type DonationRecord = {
  id: string;
  donationDate: any;
  hospital: string;
  notes: string;
  createdAt: any;
};

type BloodGroup = "A+" | "A-" | "B+" | "B-" | "O+" | "O-" | "AB+" | "AB-";

const BLOOD_GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

const BLOOD_GROUP_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "A+":  { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  "A-":  { bg: "#fff1f2", text: "#e11d48", border: "#fda4af" },
  "B+":  { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
  "B-":  { bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" },
  "O+":  { bg: "#f0fdf4", text: "#16a34a", border: "#86efac" },
  "O-":  { bg: "#ecfdf5", text: "#059669", border: "#6ee7b7" },
  "AB+": { bg: "#fdf4ff", text: "#9333ea", border: "#e9d5ff" },
  "AB-": { bg: "#faf5ff", text: "#7c3aed", border: "#ddd6fe" },
};

const EMPTY_FORM = { hospital: "", notes: "" };

// ─── Helpers ─────────────────────────────────────────────
const isFourMonthsAgo = (date: Date): boolean => {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 4);
  return date <= cutoff;
};

const formatDate = (timestamp: any): string => {
  if (!timestamp) return "—";
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("en-BD", {
    day: "2-digit", month: "long", year: "numeric",
  });
};

const formatRelative = (timestamp: any): string => {
  if (!timestamp) return "";
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffMonths === 1) return "1 month ago";
  return `${diffMonths} months ago`;
};

const getNextEligibleDate = (lastDonationDate: any): string => {
  if (!lastDonationDate) return "Eligible now";
  const date = lastDonationDate?.toDate ? lastDonationDate.toDate() : new Date(lastDonationDate);
  const next = new Date(date);
  next.setMonth(next.getMonth() + 4);
  const now = new Date();
  if (next <= now) return "Eligible now";
  return `Eligible from ${next.toLocaleDateString("en-BD", { day: "2-digit", month: "short", year: "numeric" })}`;
};

// ─── Main Screen ─────────────────────────────────────────
export default function BloodDonationHistoryScreen() {
  const router = useRouter();
  const { user, nickname } = useAuthStore();
  const uid = user?.uid ?? "";

  // Data state
  const [records, setRecords] = useState<DonationRecord[]>([]);
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | null>(null);
  const [lastDonationDate, setLastDonationDate] = useState<any>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DonationRecord | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Blood group setup modal
  const [bloodGroupModal, setBloodGroupModal] = useState(false);
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<BloodGroup | null>(null);
  const [savingBloodGroup, setSavingBloodGroup] = useState(false);

  // ── Fetch user profile + donation history ──
  const fetchData = async () => {
    if (!uid) return;
    try {
      // Get user profile for blood group
      const userSnap = await getDoc(doc(db, "users", uid));
      if (userSnap.exists()) {
        const data = userSnap.data();
        setBloodGroup(data.bloodGroup ?? null);
        setLastDonationDate(data.lastDonationDate ?? null);
        setIsAvailable(data.isAvailableToDonate ?? false);
      }

      // Get donation history
      const q = query(
        collection(db, "bloodDonationHistory", uid, "records"),
        orderBy("donationDate", "desc")
      );
      const snap = await getDocs(q);
      const list: DonationRecord[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<DonationRecord, "id">),
      }));
      setRecords(list);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [uid]);

  // ── Update user availability after adding/editing records ──
  const updateUserDonorStatus = async (newDonationDate: Date) => {
    const available = isFourMonthsAgo(newDonationDate);
    const firestoreDate = Timestamp.fromDate(newDonationDate);

    // Only update lastDonationDate if it's the most recent donation
    const currentLast = lastDonationDate?.toDate
      ? lastDonationDate.toDate()
      : lastDonationDate ? new Date(lastDonationDate) : null;

    if (!currentLast || newDonationDate > currentLast) {
      await updateDoc(doc(db, "users", uid), {
        lastDonationDate: firestoreDate,
        isAvailableToDonate: available,
      });
      setLastDonationDate(firestoreDate);
      setIsAvailable(available);
    }
  };

  // ── Recalculate availability from all records ──
  const recalculateAvailability = async (deletedRecordDate?: any) => {
    // Re-fetch all records to find the most recent
    const q = query(
      collection(db, "bloodDonationHistory", uid, "records"),
      orderBy("donationDate", "desc")
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      await updateDoc(doc(db, "users", uid), {
        lastDonationDate: null,
        isAvailableToDonate: true,
      });
      setLastDonationDate(null);
      setIsAvailable(true);
      return;
    }
    const mostRecent = snap.docs[0].data().donationDate;
    const mostRecentDate = mostRecent?.toDate ? mostRecent.toDate() : new Date(mostRecent);
    const available = isFourMonthsAgo(mostRecentDate);
    await updateDoc(doc(db, "users", uid), {
      lastDonationDate: mostRecent,
      isAvailableToDonate: available,
    });
    setLastDonationDate(mostRecent);
    setIsAvailable(available);
  };

  // ── Save blood group ──
  const handleSaveBloodGroup = async () => {
    if (!selectedBloodGroup) {
      Alert.alert("Required", "Please select your blood group.");
      return;
    }
    setSavingBloodGroup(true);
    try {
      await updateDoc(doc(db, "users", uid), { bloodGroup: selectedBloodGroup });
      setBloodGroup(selectedBloodGroup);
      setBloodGroupModal(false);
    } catch (err) {
      Alert.alert("Error", "Could not save blood group.");
    } finally {
      setSavingBloodGroup(false);
    }
  };

  // ── Open add modal ──
  const openAddModal = () => {
    setEditingRecord(null);
    setForm(EMPTY_FORM);
    setSelectedDate(new Date());
    setModalVisible(true);
  };

  // ── Open edit modal ──
  const openEditModal = (record: DonationRecord) => {
    setEditingRecord(record);
    setForm({ hospital: record.hospital, notes: record.notes });
    const date = record.donationDate?.toDate
      ? record.donationDate.toDate()
      : new Date(record.donationDate);
    setSelectedDate(date);
    setModalVisible(true);
  };

  // ── Save donation record ──
  const handleSave = async () => {
    if (!form.hospital.trim()) {
      Alert.alert("Required", "Please enter the hospital or donation center name.");
      return;
    }
    if (selectedDate > new Date()) {
      Alert.alert("Invalid Date", "Donation date cannot be in the future.");
      return;
    }

    setSaving(true);
    try {
      const donationTimestamp = Timestamp.fromDate(selectedDate);

      if (editingRecord) {
        // Update existing record
        await updateDoc(
          doc(db, "bloodDonationHistory", uid, "records", editingRecord.id),
          {
            donationDate: donationTimestamp,
            hospital: form.hospital.trim(),
            notes: form.notes.trim(),
          }
        );
      } else {
        // Add new record
        await addDoc(
          collection(db, "bloodDonationHistory", uid, "records"),
          {
            donationDate: donationTimestamp,
            hospital: form.hospital.trim(),
            notes: form.notes.trim(),
            createdAt: serverTimestamp(),
          }
        );
      }

      // Update user's lastDonationDate + availability
      await updateUserDonorStatus(selectedDate);

      setModalVisible(false);
      await fetchData();
    } catch (err) {
      Alert.alert("Error", "Could not save donation record.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete record ──
  const handleDelete = (record: DonationRecord) => {
    Alert.alert(
      "Delete Record",
      "Are you sure you want to delete this donation record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(
                doc(db, "bloodDonationHistory", uid, "records", record.id)
              );
              await recalculateAvailability(record.donationDate);
              await fetchData();
            } catch (err) {
              Alert.alert("Error", "Could not delete record.");
            }
          },
        },
      ]
    );
  };

  const bgColor = bloodGroup ? BLOOD_GROUP_COLORS[bloodGroup] : null;

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>

      {/* ── Header ── */}
      <View style={{
        backgroundColor: "#f97316",
        paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20,
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
          <TouchableOpacity
            onPress={openAddModal}
            style={{
              backgroundColor: "rgba(255,255,255,0.2)",
              paddingHorizontal: 14, paddingVertical: 7,
              borderRadius: 20, borderWidth: 1,
              borderColor: "rgba(255,255,255,0.35)",
              flexDirection: "row", alignItems: "center", gap: 6,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>+</Text>
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Add Record</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700", marginTop: 2 }}>
          Donation History
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 }}>
          {records.length} donation{records.length !== 1 ? "s" : ""} recorded
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#dc2626" />
          <Text style={{ color: "#9ca3af", marginTop: 12 }}>Loading history...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchData(); }}
              colors={["#dc2626"]}
            />
          }
        >
          {/* ── Blood Group + Status Card ── */}
          <View style={{
            backgroundColor: "#fff", borderRadius: 20,
            padding: 20, marginBottom: 16,
            borderWidth: 1, borderColor: "#f3f4f6",
            elevation: 1, shadowColor: "#000",
            shadowOpacity: 0.04, shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>

              {/* Blood group badge */}
              <TouchableOpacity
                onPress={() => {
                  setSelectedBloodGroup(bloodGroup);
                  setBloodGroupModal(true);
                }}
                style={{
                  width: 72, height: 72, borderRadius: 36,
                  backgroundColor: bgColor?.bg ?? "#fef2f2",
                  borderWidth: 2,
                  borderColor: bgColor?.border ?? "#fecaca",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                {bloodGroup ? (
                  <Text style={{
                    fontSize: 20, fontWeight: "800",
                    color: bgColor?.text ?? "#dc2626",
                  }}>
                    {bloodGroup}
                  </Text>
                ) : (
                  <Text style={{ fontSize: 24 }}>🩸</Text>
                )}
              </TouchableOpacity>

              {/* Status info */}
              <View style={{ flex: 1 }}>
                {bloodGroup ? (
                  <>
                    <Text style={{ color: "#1f2937", fontWeight: "700", fontSize: 15 }}>
                      Blood Group {bloodGroup}
                    </Text>
                    <View style={{
                      flexDirection: "row", alignItems: "center",
                      gap: 6, marginTop: 4,
                    }}>
                      <View style={{
                        width: 8, height: 8, borderRadius: 4,
                        backgroundColor: isAvailable ? "#16a34a" : "#d97706",
                      }} />
                      <Text style={{
                        fontSize: 13, fontWeight: "600",
                        color: isAvailable ? "#16a34a" : "#d97706",
                      }}>
                        {isAvailable ? "Available to donate" : "Not yet eligible"}
                      </Text>
                    </View>
                    <Text style={{ color: "#9ca3af", fontSize: 11, marginTop: 3 }}>
                      {getNextEligibleDate(lastDonationDate)}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={{ color: "#1f2937", fontWeight: "700", fontSize: 15 }}>
                      Blood Group Not Set
                    </Text>
                    <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 2 }}>
                      Tap the circle to set your blood group
                    </Text>
                  </>
                )}
              </View>

              {/* Edit blood group button */}
              <TouchableOpacity
                onPress={() => {
                  setSelectedBloodGroup(bloodGroup);
                  setBloodGroupModal(true);
                }}
                style={{
                  backgroundColor: "#fef2f2", borderRadius: 10,
                  paddingHorizontal: 10, paddingVertical: 6,
                  borderWidth: 1, borderColor: "#fecaca",
                }}
              >
                <Text style={{ color: "#dc2626", fontSize: 11, fontWeight: "700" }}>
                  {bloodGroup ? "Edit" : "Set"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Last donation */}
            {lastDonationDate && (
              <View style={{
                marginTop: 14, paddingTop: 14,
                borderTopWidth: 1, borderTopColor: "#f3f4f6",
                flexDirection: "row", alignItems: "center", gap: 8,
              }}>
                <Text style={{ fontSize: 16 }}>🗓️</Text>
                <View>
                  <Text style={{ color: "#6b7280", fontSize: 11, fontWeight: "600" }}>
                    LAST DONATION
                  </Text>
                  <Text style={{ color: "#374151", fontSize: 13, fontWeight: "600", marginTop: 1 }}>
                    {formatDate(lastDonationDate)} • {formatRelative(lastDonationDate)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* ── Eligibility info banner ── */}
          {!isAvailable && lastDonationDate && (
            <View style={{
              backgroundColor: "#fffbeb", borderRadius: 12, padding: 14,
              marginBottom: 16, flexDirection: "row", gap: 10,
              borderWidth: 1, borderColor: "#fde68a",
            }}>
              <Text style={{ fontSize: 18 }}>⏳</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#92400e", fontWeight: "700", fontSize: 13 }}>
                  Donation cooldown active
                </Text>
                <Text style={{ color: "#b45309", fontSize: 12, marginTop: 2 }}>
                  You must wait 4 months between donations for health safety.
                  {" "}{getNextEligibleDate(lastDonationDate)}.
                </Text>
              </View>
            </View>
          )}

          {isAvailable && records.length > 0 && (
            <View style={{
              backgroundColor: "#f0fdf4", borderRadius: 12, padding: 14,
              marginBottom: 16, flexDirection: "row", gap: 10,
              borderWidth: 1, borderColor: "#86efac",
            }}>
              <Text style={{ fontSize: 18 }}>✅</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#14532d", fontWeight: "700", fontSize: 13 }}>
                  You are eligible to donate!
                </Text>
                <Text style={{ color: "#16a34a", fontSize: 12, marginTop: 2 }}>
                  You appear in the donor list and can receive blood requests.
                </Text>
              </View>
            </View>
          )}

          {/* ── Donation Records List ── */}
          <Text style={{
            color: "#374151", fontSize: 15, fontWeight: "700",
            marginBottom: 12,
          }}>
            Donation Records
          </Text>

          {records.length === 0 ? (
            <View style={{
              backgroundColor: "#fff", borderRadius: 16, padding: 40,
              alignItems: "center", borderWidth: 1, borderColor: "#f3f4f6",
            }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🩸</Text>
              <Text style={{ color: "#374151", fontWeight: "700", fontSize: 16 }}>
                No donations recorded
              </Text>
              <Text style={{ color: "#9ca3af", fontSize: 13, marginTop: 6, textAlign: "center" }}>
                Add your first donation record to start tracking your history
              </Text>
              <TouchableOpacity
                onPress={openAddModal}
                style={{
                  marginTop: 16, backgroundColor: "#dc2626",
                  borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                  + Add First Record
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            records.map((record, index) => (
              <View
                key={record.id}
                style={{
                  backgroundColor: "#fff", borderRadius: 16,
                  marginBottom: 10, borderWidth: 1, borderColor: "#f3f4f6",
                  overflow: "hidden", elevation: 1,
                  shadowColor: "#000", shadowOpacity: 0.03,
                  shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
                }}
              >
                {/* Red left accent for most recent */}
                {index === 0 && (
                  <View style={{
                    position: "absolute", left: 0, top: 0, bottom: 0,
                    width: 4, backgroundColor: "#dc2626",
                  }} />
                )}

                <View style={{ padding: 16, paddingLeft: index === 0 ? 20 : 16 }}>
                  {/* Top row */}
                  <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                    <View style={{
                      width: 40, height: 40, borderRadius: 20,
                      backgroundColor: "#fef2f2", borderWidth: 1,
                      borderColor: "#fecaca", alignItems: "center",
                      justifyContent: "center", marginRight: 12,
                    }}>
                      <Text style={{ fontSize: 18 }}>🩸</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ color: "#1f2937", fontWeight: "700", fontSize: 14, flex: 1 }}>
                          {record.hospital}
                        </Text>
                        {index === 0 && (
                          <View style={{
                            backgroundColor: "#fef2f2", borderRadius: 8,
                            paddingHorizontal: 7, paddingVertical: 2,
                            borderWidth: 1, borderColor: "#fecaca",
                          }}>
                            <Text style={{ color: "#dc2626", fontSize: 10, fontWeight: "700" }}>
                              LATEST
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
                        📅 {formatDate(record.donationDate)} • {formatRelative(record.donationDate)}
                      </Text>
                    </View>
                  </View>

                  {/* Notes */}
                  {record.notes ? (
                    <View style={{
                      marginTop: 10, backgroundColor: "#f9fafb",
                      borderRadius: 8, padding: 10,
                      borderWidth: 1, borderColor: "#f3f4f6",
                    }}>
                      <Text style={{ color: "#6b7280", fontSize: 12, lineHeight: 18 }}>
                        {record.notes}
                      </Text>
                    </View>
                  ) : null}

                  {/* Action buttons */}
                  <View style={{
                    flexDirection: "row", gap: 8, marginTop: 12,
                  }}>
                    <TouchableOpacity
                      onPress={() => openEditModal(record)}
                      style={{
                        flex: 1, backgroundColor: "#eff6ff",
                        borderRadius: 8, paddingVertical: 8,
                        alignItems: "center", borderWidth: 1,
                        borderColor: "#bfdbfe",
                      }}
                    >
                      <Text style={{ color: "#2563eb", fontSize: 12, fontWeight: "600" }}>
                        ✏️ Edit
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(record)}
                      style={{
                        flex: 1, backgroundColor: "#fef2f2",
                        borderRadius: 8, paddingVertical: 8,
                        alignItems: "center", borderWidth: 1,
                        borderColor: "#fecaca",
                      }}
                    >
                      <Text style={{ color: "#dc2626", fontSize: 12, fontWeight: "600" }}>
                        🗑️ Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ── Add / Edit Donation Modal ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{
          flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}>
          <View style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, paddingBottom: 40,
            maxHeight: "90%",
          }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Modal header */}
              <View style={{
                flexDirection: "row", alignItems: "center",
                justifyContent: "space-between", marginBottom: 20,
              }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#1f2937" }}>
                  {editingRecord ? "Edit Donation Record" : "Add Donation Record"}
                </Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={{
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: "#f3f4f6", alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#6b7280", fontSize: 16, fontWeight: "700" }}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Donation Date */}
              <Text style={labelStyle}>Donation Date *</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={{
                  ...inputStyle,
                  flexDirection: "row", alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: "#1f2937", fontSize: 14 }}>
                  {selectedDate.toLocaleDateString("en-BD", {
                    day: "2-digit", month: "long", year: "numeric",
                  })}
                </Text>
                <Text style={{ fontSize: 16 }}>📅</Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  maximumDate={new Date()}
                  onChange={(event, date) => {
                    setShowDatePicker(Platform.OS === "ios");
                    if (date) setSelectedDate(date);
                  }}
                />
              )}

              {/* Hospital */}
              <Text style={[labelStyle, { marginTop: 16 }]}>Hospital / Donation Center *</Text>
              <TextInput
                style={inputStyle as any}
                placeholder="e.g. Dhaka Medical College, Red Crescent..."
                placeholderTextColor="#9ca3af"
                value={form.hospital}
                onChangeText={(t) => setForm({ ...form, hospital: t })}
              />

              {/* Notes */}
              <Text style={[labelStyle, { marginTop: 16 }]}>Notes (optional)</Text>
              <TextInput
                style={{
                  ...(inputStyle as any),
                  height: 80, textAlignVertical: "top",
                }}
                placeholder="Any additional notes about this donation..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                value={form.notes}
                onChangeText={(t) => setForm({ ...form, notes: t })}
              />

              {/* Info note */}
              <View style={{
                backgroundColor: "#eff6ff", borderRadius: 10, padding: 12,
                marginTop: 16, flexDirection: "row", gap: 8,
                borderWidth: 1, borderColor: "#bfdbfe",
              }}>
                <Text style={{ fontSize: 16 }}>ℹ️</Text>
                <Text style={{ color: "#1d4ed8", fontSize: 12, flex: 1, lineHeight: 18 }}>
                  Your availability to donate will be automatically updated based on this date.
                  A 4-month cooldown period applies between donations.
                </Text>
              </View>

              {/* Action buttons */}
              <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={{
                    flex: 1, backgroundColor: "#f3f4f6",
                    borderRadius: 12, paddingVertical: 14, alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#374151", fontWeight: "600" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1, backgroundColor: "#dc2626",
                    borderRadius: 12, paddingVertical: 14, alignItems: "center",
                  }}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: "#fff", fontWeight: "700" }}>
                      {editingRecord ? "Save Changes" : "Add Record"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Blood Group Setup Modal ── */}
      <Modal
        visible={bloodGroupModal}
        animationType="slide"
        transparent
        onRequestClose={() => setBloodGroupModal(false)}
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
            <View style={{
              flexDirection: "row", alignItems: "center",
              justifyContent: "space-between", marginBottom: 8,
            }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: "#1f2937" }}>
                Select Blood Group
              </Text>
              <TouchableOpacity
                onPress={() => setBloodGroupModal(false)}
                style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: "#f3f4f6", alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#6b7280", fontSize: 16, fontWeight: "700" }}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: "#9ca3af", fontSize: 13, marginBottom: 20 }}>
              This helps match you with people who need your blood type
            </Text>

            {/* Blood group grid */}
            <View style={{
              flexDirection: "row", flexWrap: "wrap", gap: 10,
              marginBottom: 24,
            }}>
              {BLOOD_GROUPS.map((bg) => {
                const colors = BLOOD_GROUP_COLORS[bg];
                const isSelected = selectedBloodGroup === bg;
                return (
                  <TouchableOpacity
                    key={bg}
                    onPress={() => setSelectedBloodGroup(bg)}
                    style={{
                      width: "22%",
                      aspectRatio: 1,
                      backgroundColor: isSelected ? colors.bg : "#f9fafb",
                      borderRadius: 14,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? colors.border : "#e5e7eb",
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={{
                      fontSize: 18, fontWeight: "800",
                      color: isSelected ? colors.text : "#9ca3af",
                    }}>
                      {bg}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={handleSaveBloodGroup}
              disabled={savingBloodGroup || !selectedBloodGroup}
              style={{
                backgroundColor: selectedBloodGroup ? "#dc2626" : "#e5e7eb",
                borderRadius: 14, paddingVertical: 16, alignItems: "center",
              }}
            >
              {savingBloodGroup ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{
                  color: selectedBloodGroup ? "#fff" : "#9ca3af",
                  fontWeight: "700", fontSize: 15,
                }}>
                  Save Blood Group
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ── Styles ──
const labelStyle = {
  color: "#374151",
  fontSize: 13,
  fontWeight: "600" as const,
  marginBottom: 6,
};

const inputStyle = {
  backgroundColor: "#f9fafb",
  borderWidth: 1,
  borderColor: "#e5e7eb",
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 14,
  color: "#1f2937",
};
