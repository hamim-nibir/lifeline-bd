import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  Switch, ActivityIndicator, Alert, Modal,
  TextInput, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import {
  getUserProfile, updateUserProfile,
  submitVerificationRequest, logoutUser,
} from "../../services/auth";
import {
  BloodGroup, BloodPressure,
  TrackingAccuracy, VerificationStatus,
} from "../../types";
import Logo from "../../components/ui/logo";

import { db } from "../../services/firebase";

const BLOOD_GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const BP_OPTIONS: BloodPressure[] = ["High", "Low", "Normal"];
const TRACKING_OPTIONS: TrackingAccuracy[] = ["High Accuracy", "Balanced", "Battery Saving"];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, nickname, accountType } = useAuthStore();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // modals
  const [editModal, setEditModal] = useState(false);
  const [nidModal, setNidModal] = useState(false);

  // edit form state
  const [editForm, setEditForm] = useState({
    name: "", dateOfBirth: "", phone: "",
    bloodGroup: "" as BloodGroup, bloodPressure: "" as BloodPressure,
    height: "", weight: "", knownDiseases: "",
    allergies: "", currentMedications: "",
  });

  // NID form state
  const [nidNumber, setNidNumber] = useState("");
  const [nidSubmitting, setNidSubmitting] = useState(false);

  const fetchProfile = async () => {
    setRefreshing(false);
  };

  useEffect(() => {
    if (!user?.uid) return;

    setLoading(true);

    const { doc, onSnapshot } = require("firebase/firestore");

    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (snap: any) => {
        if (snap.exists()) {
          setProfile(snap.data());
        }
        setLoading(false);
        setRefreshing(false);
      },
      (err: any) => {
        console.error("Profile listener error:", err);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => { fetchProfile(); }, [user?.uid]);

  const handleLogout = async () => {
    await logoutUser();
    router.replace("/login");
  };

  // ── Toggle helpers ──
  const handleToggle = async (field: string, value: boolean) => {
    if (!user?.uid) return;
    setProfile((prev: any) => ({ ...prev, [field]: value }));
    try {
      await updateUserProfile(user.uid, { [field]: value });
    } catch {
      setProfile((prev: any) => ({ ...prev, [field]: !value }));
    }
  };

  const handleTrackingChange = async (value: TrackingAccuracy) => {
    if (!user?.uid) return;
    setProfile((prev: any) => ({ ...prev, trackingAccuracy: value }));
    await updateUserProfile(user.uid, { trackingAccuracy: value });
  };

  // ── Open edit modal ──
  const openEditModal = () => {
    setEditForm({
      name: profile?.name ?? "",
      dateOfBirth: profile?.dateOfBirth ?? "",
      phone: profile?.phone ?? "",
      bloodGroup: profile?.bloodGroup ?? "",
      bloodPressure: profile?.bloodPressure ?? "",
      height: profile?.height ?? "",
      weight: profile?.weight ?? "",
      knownDiseases: profile?.knownDiseases ?? "",
      allergies: profile?.allergies ?? "",
      currentMedications: profile?.currentMedications ?? "",
    });
    setEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      await updateUserProfile(user.uid, editForm);
      setProfile((prev: any) => ({ ...prev, ...editForm }));
      setEditModal(false);
      Alert.alert("✅ Saved", "Your profile has been updated.");
    } catch {
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── NID verification ──
  const handleSubmitVerification = async () => {
    if (!nidNumber.trim()) {
      Alert.alert("Required", "Please enter your NID number.");
      return;
    }
    if (nidNumber.trim().length < 10) {
      Alert.alert("Invalid", "NID number must be at least 10 digits.");
      return;
    }
    if (!user?.uid) return;
    setNidSubmitting(true);
    try {
      await submitVerificationRequest(
        user.uid,
        profile?.name ?? "",
        profile?.nickname ?? nickname ?? "",
        nidNumber.trim()
      );
      setProfile((prev: any) => ({ ...prev, verificationStatus: "pending" }));
      setNidModal(false);
      Alert.alert(
        "✅ Request Submitted",
        "Your verification request has been sent to operators. You will be notified once reviewed."
      );
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to submit. Please try again.");
    } finally {
      setNidSubmitting(false);
    }
  };

  const verificationStatus: VerificationStatus = profile?.verificationStatus ?? "unverified";

  const VerificationBadge = () => {
    const config = {
      verified: { bg: "#f0fdf4", border: "#86efac", text: "#15803d", icon: "✅", label: "Verified Citizen" },
      pending: { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c", icon: "⏳", label: "Verification Pending" },
      rejected: { bg: "#fef2f2", border: "#fecaca", text: "#dc2626", icon: "❌", label: "Verification Rejected" },
      unverified: { bg: "#f9fafb", border: "#e5e7eb", text: "#6b7280", icon: "⚠️", label: "Not Verified" },
    }[verificationStatus];

    return (
      <View style={{
        backgroundColor: config.bg, borderWidth: 1, borderColor: config.border,
        borderRadius: 12, padding: 14, marginBottom: 16,
        flexDirection: "row", alignItems: "center", gap: 10,
      }}>
        <Text style={{ fontSize: 20 }}>{config.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: config.text, fontWeight: "700", fontSize: 14 }}>
            {config.label}
          </Text>
          <Text style={{ color: config.text, fontSize: 12, marginTop: 2, opacity: 0.8 }}>
            {verificationStatus === "unverified" && "Verify your NID to access all features and submit reports."}
            {verificationStatus === "pending" && "Your request is under review by an operator."}
            {verificationStatus === "verified" && "Your identity has been verified successfully."}
            {verificationStatus === "rejected" && "Your verification was rejected. Please resubmit."}
          </Text>
        </View>
        {(verificationStatus === "unverified" || verificationStatus === "rejected") && (
          <TouchableOpacity
            onPress={() => setNidModal(true)}
            style={{
              backgroundColor: "#f97316", borderRadius: 8,
              paddingHorizontal: 12, paddingVertical: 6,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
              Verify
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb" }}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={{ color: "#9ca3af", marginTop: 12 }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>

      {/* ── Header ── */}
      <View style={{
        backgroundColor: "#f97316",
        paddingTop: 56,
        paddingBottom: 24,
        paddingHorizontal: 20,
      }}>
        {/* Top row — logo + logout */}
        <View style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}>
          {/* Logo — clickable → home */}
          <Logo onPress={() => router.push("/(tabs)")} />

          {/* Logout button */}
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              backgroundColor: "rgba(255,255,255,0.2)",
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.35)",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dashboard title */}
        <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "500" }}>
          Welcome back, {nickname ?? "User"}
        </Text>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700", marginTop: 2 }}>
          Profile Settings
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchProfile(); }}
            colors={["#f97316"]}
          />
        }
      >

        {/* Verification badge */}
        <VerificationBadge />

        {/* ── Personal Information ── */}
        <View style={cardStyle}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Text style={sectionTitle}>👤 Personal Information</Text>
            <TouchableOpacity
              onPress={openEditModal}
              style={{
                backgroundColor: "#fff7ed", borderRadius: 8,
                paddingHorizontal: 12, paddingVertical: 6,
                borderWidth: 1, borderColor: "#fed7aa",
              }}
            >
              <Text style={{ color: "#f97316", fontSize: 13, fontWeight: "700" }}>✏️ Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Avatar */}
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <View style={{
              width: 80, height: 80, borderRadius: 40,
              backgroundColor: "#fff7ed", alignItems: "center",
              justifyContent: "center", borderWidth: 2, borderColor: "#fed7aa",
            }}>
              <Text style={{ fontSize: 36 }}>👤</Text>
            </View>
            {verificationStatus === "verified" && (
              <View style={{
                marginTop: 6, backgroundColor: "#f0fdf4",
                borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
              }}>
                <Text style={{ color: "#15803d", fontSize: 11, fontWeight: "700" }}>
                  ✅ Verified
                </Text>
              </View>
            )}
          </View>

          <InfoRow label="Full Name" value={profile?.name} />
          <InfoRow label="Nickname" value={profile?.nickname} />
          <InfoRow label="Date of Birth" value={profile?.dateOfBirth} />
          <InfoRow label="Phone" value={profile?.phone} />
          <InfoRow label="Email" value={profile?.email} last />
        </View>

        {/* ── Health Information ── */}
        <View style={cardStyle}>
          <Text style={sectionTitle}>🩺 Health Information</Text>
          <View style={{ marginTop: 12 }}>
            <InfoRow label="Blood Group" value={profile?.bloodGroup || "—"} />
            <InfoRow label="Blood Pressure" value={profile?.bloodPressure || "—"} />
            <InfoRow label="Height" value={profile?.height ? `${profile.height} cm` : "—"} />
            <InfoRow label="Weight" value={profile?.weight ? `${profile.weight} kg` : "—"} />
            <InfoRow label="Known Diseases" value={profile?.knownDiseases || "None"} />
            <InfoRow label="Allergies" value={profile?.allergies || "None"} />
            <InfoRow label="Medications" value={profile?.currentMedications || "None"} last />
          </View>
        </View>

        {/* ── Emergency Contacts ── */}
        <View style={cardStyle}>
          <Text style={sectionTitle}>📞 Emergency Contacts</Text>
          <TouchableOpacity
            onPress={() => router.push("/(feat)/women-safety" as any)}
            style={{
              marginTop: 12, backgroundColor: "#fff7ed",
              borderRadius: 12, padding: 14,
              borderWidth: 1, borderColor: "#fed7aa",
              flexDirection: "row", alignItems: "center", gap: 10,
            }}
          >
            <Text style={{ fontSize: 20 }}>👥</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#374151", fontWeight: "700", fontSize: 13 }}>
                Manage Emergency Contacts
              </Text>
              <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 2 }}>
                Add up to 3 contacts for panic alerts
              </Text>
            </View>
            <Text style={{ color: "#f97316", fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        </View>

        {/* ── Privacy & Security ── */}
        <View style={cardStyle}>
          <Text style={sectionTitle}>🔒 Privacy & Security</Text>
          <View style={{ marginTop: 12 }}>
            <ToggleRow
              label="Show Health Information"
              desc="Display your health profile to emergency responders"
              value={profile?.showHealthInfo ?? true}
              onToggle={(v) => handleToggle("showHealthInfo", v)}
            />
            <ToggleRow
              label="Show Contact Information"
              desc="Make your contact details visible to verified services"
              value={profile?.showContactInfo ?? true}
              onToggle={(v) => handleToggle("showContactInfo", v)}
            />
            <ToggleRow
              label="Data Sharing"
              desc="Share anonymous data to improve emergency services"
              value={profile?.dataSharing ?? false}
              onToggle={(v) => handleToggle("dataSharing", v)}
            />
            <ToggleRow
              label="Two-Factor Authentication"
              desc="Add an extra layer of security to your account"
              value={profile?.twoFactorAuth ?? false}
              onToggle={(v) => handleToggle("twoFactorAuth", v)}
            />
            <ToggleRow
              label="Emergency Access"
              desc="Allow emergency services to access your data during emergencies"
              value={profile?.emergencyAccess ?? true}
              onToggle={(v) => handleToggle("emergencyAccess", v)}
              last
            />
          </View>
          <SaveBadge />
        </View>

        {/* ── Location & Tracking ── */}
        <View style={cardStyle}>
          <Text style={sectionTitle}>📍 Location & Tracking</Text>
          <View style={{ marginTop: 12 }}>
            <ToggleRow
              label="Share Real-time Location"
              desc="Share your live location with emergency services during active requests"
              value={profile?.shareRealtimeLocation ?? true}
              onToggle={(v) => handleToggle("shareRealtimeLocation", v)}
            />
            <ToggleRow
              label="Location History"
              desc="Save your location history for better emergency response"
              value={profile?.locationHistory ?? true}
              onToggle={(v) => handleToggle("locationHistory", v)}
              last
            />
          </View>

          {/* Tracking accuracy */}
          <View style={{ marginTop: 16 }}>
            <Text style={{ color: "#374151", fontWeight: "700", fontSize: 14, marginBottom: 12 }}>
              Tracking Accuracy
            </Text>
            {TRACKING_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => handleTrackingChange(opt)}
                style={{
                  flexDirection: "row", alignItems: "flex-start",
                  gap: 12, marginBottom: 12,
                }}
              >
                <View style={{
                  width: 20, height: 20, borderRadius: 10,
                  borderWidth: 2, marginTop: 1,
                  borderColor: profile?.trackingAccuracy === opt ? "#f97316" : "#d1d5db",
                  alignItems: "center", justifyContent: "center",
                }}>
                  {profile?.trackingAccuracy === opt && (
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#f97316" }} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontWeight: "600", fontSize: 14,
                    color: profile?.trackingAccuracy === opt ? "#f97316" : "#374151",
                  }}>
                    {opt}
                  </Text>
                  <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 2 }}>
                    {opt === "High Accuracy" && "Best for emergencies, uses more battery"}
                    {opt === "Balanced" && "Moderate accuracy with reasonable battery use"}
                    {opt === "Battery Saving" && "Saves battery, lower accuracy"}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          <SaveBadge />
        </View>
      </ScrollView>

      {/* ── Edit Profile Modal ── */}
      <Modal
        visible={editModal}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: "#fff", borderTopLeftRadius: 24,
            borderTopRightRadius: 24, padding: 24, paddingBottom: 40,
            maxHeight: "90%",
          }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1f2937", marginBottom: 20 }}>
              ✏️ Edit Profile
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>

              <Text style={modalSectionTitle}>Personal Information</Text>

              <EditField label="Full Name" value={editForm.name}
                onChange={(v) => setEditForm({ ...editForm, name: v })} />
              <EditField label="Date of Birth" value={editForm.dateOfBirth}
                onChange={(v) => setEditForm({ ...editForm, dateOfBirth: v })}
                placeholder="DD/MM/YYYY" />
              <EditField label="Phone Number" value={editForm.phone}
                onChange={(v) => setEditForm({ ...editForm, phone: v })}
                keyboardType="phone-pad" />

              <Text style={[modalSectionTitle, { marginTop: 16 }]}>Health Information</Text>

              {/* Blood Group */}
              <Text style={modalLabel}>Blood Group</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                {BLOOD_GROUPS.map((bg) => (
                  <TouchableOpacity
                    key={bg}
                    onPress={() => setEditForm({ ...editForm, bloodGroup: bg })}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                      borderWidth: 1,
                      backgroundColor: editForm.bloodGroup === bg ? "#fff7ed" : "#f9fafb",
                      borderColor: editForm.bloodGroup === bg ? "#f97316" : "#e5e7eb",
                    }}
                  >
                    <Text style={{
                      fontWeight: "700", fontSize: 13,
                      color: editForm.bloodGroup === bg ? "#f97316" : "#6b7280",
                    }}>
                      {bg}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Blood Pressure */}
              <Text style={modalLabel}>Blood Pressure</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                {BP_OPTIONS.map((bp) => (
                  <TouchableOpacity
                    key={bp}
                    onPress={() => setEditForm({ ...editForm, bloodPressure: bp })}
                    style={{
                      flex: 1, paddingVertical: 10, borderRadius: 10,
                      borderWidth: 1, alignItems: "center",
                      backgroundColor: editForm.bloodPressure === bp ? "#fff7ed" : "#f9fafb",
                      borderColor: editForm.bloodPressure === bp ? "#f97316" : "#e5e7eb",
                    }}
                  >
                    <Text style={{
                      fontWeight: "700", fontSize: 13,
                      color: editForm.bloodPressure === bp ? "#f97316" : "#6b7280",
                    }}>
                      {bp}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <EditField label="Height (cm)" value={editForm.height}
                    onChange={(v) => setEditForm({ ...editForm, height: v })}
                    keyboardType="numeric" placeholder="e.g. 170" />
                </View>
                <View style={{ flex: 1 }}>
                  <EditField label="Weight (kg)" value={editForm.weight}
                    onChange={(v) => setEditForm({ ...editForm, weight: v })}
                    keyboardType="numeric" placeholder="e.g. 65" />
                </View>
              </View>

              <EditField label="Known Diseases" value={editForm.knownDiseases}
                onChange={(v) => setEditForm({ ...editForm, knownDiseases: v })}
                placeholder="e.g. Diabetes, Asthma" multiline />
              <EditField label="Allergies" value={editForm.allergies}
                onChange={(v) => setEditForm({ ...editForm, allergies: v })}
                placeholder="e.g. Penicillin, Peanuts" multiline />
              <EditField label="Current Medications" value={editForm.currentMedications}
                onChange={(v) => setEditForm({ ...editForm, currentMedications: v })}
                placeholder="e.g. Metformin 500mg" multiline />

              <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                <TouchableOpacity
                  onPress={() => setEditModal(false)}
                  style={{
                    flex: 1, backgroundColor: "#f3f4f6", borderRadius: 12,
                    paddingVertical: 14, alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#374151", fontWeight: "700" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveProfile}
                  disabled={saving}
                  style={{
                    flex: 1, backgroundColor: "#f97316", borderRadius: 12,
                    paddingVertical: 14, alignItems: "center",
                  }}
                >
                  {saving ? <ActivityIndicator color="#fff" /> : (
                    <Text style={{ color: "#fff", fontWeight: "700" }}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── NID Verification Modal ── */}
      <Modal
        visible={nidModal}
        animationType="slide"
        transparent
        onRequestClose={() => setNidModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: "#fff", borderTopLeftRadius: 24,
            borderTopRightRadius: 24, padding: 24, paddingBottom: 40,
          }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1f2937", marginBottom: 8 }}>
              🪪 Identity Verification
            </Text>
            <Text style={{ color: "#6b7280", fontSize: 13, marginBottom: 20, lineHeight: 20 }}>
              Enter your National ID number. An operator will review and verify your account.
              Your NID is stored securely and never shared publicly.
            </Text>

            <Text style={modalLabel}>NID Number <Text style={{ color: "#dc2626" }}>*</Text></Text>
            <TextInput
              style={{
                backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb",
                borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
                fontSize: 15, color: "#1f2937", marginBottom: 20,
                letterSpacing: 1,
              }}
              placeholder="Enter your 10-17 digit NID number"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={nidNumber}
              onChangeText={setNidNumber}
              maxLength={17}
            />

            <View style={{
              backgroundColor: "#fff7ed", borderRadius: 12,
              padding: 12, marginBottom: 20,
              borderWidth: 1, borderColor: "#fed7aa",
            }}>
              <Text style={{ color: "#92400e", fontSize: 12, lineHeight: 18 }}>
                ⚠️ Make sure your full name matches your NID exactly. Operators will cross-check
                this information before approving.
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => setNidModal(false)}
                style={{
                  flex: 1, backgroundColor: "#f3f4f6", borderRadius: 12,
                  paddingVertical: 14, alignItems: "center",
                }}
              >
                <Text style={{ color: "#374151", fontWeight: "700" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmitVerification}
                disabled={nidSubmitting}
                style={{
                  flex: 1, backgroundColor: "#f97316", borderRadius: 12,
                  paddingVertical: 14, alignItems: "center",
                }}
              >
                {nidSubmitting ? <ActivityIndicator color="#fff" /> : (
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Reusable components ──

const InfoRow = ({
  label, value, last = false,
}: { label: string; value?: string; last?: boolean }) => (
  <View style={{
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", paddingVertical: 10,
    borderBottomWidth: last ? 0 : 1, borderBottomColor: "#f3f4f6",
  }}>
    <Text style={{ color: "#9ca3af", fontSize: 13, flex: 1 }}>{label}</Text>
    <Text style={{ color: "#1f2937", fontSize: 13, fontWeight: "600", flex: 2, textAlign: "right" }}>
      {value || "—"}
    </Text>
  </View>
);

const ToggleRow = ({
  label, desc, value, onToggle, last = false,
}: {
  label: string; desc: string; value: boolean;
  onToggle: (v: boolean) => void; last?: boolean;
}) => (
  <View style={{
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: last ? 0 : 1, borderBottomColor: "#f3f4f6",
    gap: 12,
  }}>
    <View style={{ flex: 1 }}>
      <Text style={{ color: "#1f2937", fontWeight: "600", fontSize: 14 }}>{label}</Text>
      <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 2, lineHeight: 16 }}>{desc}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: "#e5e7eb", true: "#fed7aa" }}
      thumbColor={value ? "#f97316" : "#fff"}
    />
  </View>
);

const SaveBadge = () => (
  <View style={{
    marginTop: 12, backgroundColor: "#f0fdf4", borderRadius: 8,
    padding: 8, alignItems: "center",
  }}>
    <Text style={{ color: "#15803d", fontSize: 11, fontWeight: "600" }}>
      ✓ Changes save automatically
    </Text>
  </View>
);

const EditField = ({
  label, value, onChange, placeholder, keyboardType, multiline,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboardType?: any; multiline?: boolean;
}) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={modalLabel}>{label}</Text>
    <TextInput
      style={[
        {
          backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb",
          borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
          fontSize: 14, color: "#1f2937",
        },
        multiline && { minHeight: 80, textAlignVertical: "top" },
      ]}
      placeholder={placeholder ?? `Enter ${label.toLowerCase()}`}
      placeholderTextColor="#9ca3af"
      value={value}
      onChangeText={onChange}
      keyboardType={keyboardType ?? "default"}
      multiline={multiline}
    />
  </View>
);

// ── Styles ──
const cardStyle = {
  backgroundColor: "#fff", borderRadius: 16, padding: 16,
  marginBottom: 12, borderWidth: 1, borderColor: "#f3f4f6",
  shadowColor: "#000", shadowOpacity: 0.04,
  shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1,
};
const sectionTitle = { fontSize: 15, fontWeight: "700" as const, color: "#1f2937" };
const modalSectionTitle = { fontSize: 14, fontWeight: "700" as const, color: "#374151", marginBottom: 12 };
const modalLabel = { color: "#374151", fontSize: 13, fontWeight: "600" as const, marginBottom: 6 };