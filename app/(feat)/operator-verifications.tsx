import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { db } from "../../services/firebase";
import {
  collection, query, orderBy,
  getDocs, updateDoc, doc,
} from "firebase/firestore";

type VerificationRequest = {
  id: string;
  uid: string;
  name: string;
  nickname: string;
  nidNumber: string;
  status: "pending" | "verified" | "rejected";
  submittedAt: any;
};

export default function OperatorVerificationsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const q = query(
        collection(db, "verificationRequests"),
        orderBy("submittedAt", "desc")
      );
      const snap = await getDocs(q);
      const list: VerificationRequest[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<VerificationRequest, "id">),
      }));
      setRequests(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleDecision = async (
    requestId: string,
    uid: string,
    decision: "verified" | "rejected"
  ) => {
    Alert.alert(
      decision === "verified" ? "✅ Approve Verification" : "❌ Reject Verification",
      `Are you sure you want to ${decision === "verified" ? "approve" : "reject"} this request?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: decision === "verified" ? "Approve" : "Reject",
          style: decision === "rejected" ? "destructive" : "default",
          onPress: async () => {
            setProcessing(requestId);
            try {
              // update verification request
              await updateDoc(doc(db, "verificationRequests", requestId), {
                status: decision,
              });
              // update user profile
              await updateDoc(doc(db, "users", uid), {
                verificationStatus: decision,
                verifiedAt: decision === "verified" ? new Date().toISOString() : null,
              });
              setRequests((prev) =>
                prev.map((r) => r.id === requestId ? { ...r, status: decision } : r)
              );
              Alert.alert(
                "Done",
                decision === "verified"
                  ? "User has been verified successfully."
                  : "Verification request has been rejected."
              );
            } catch (err) {
              Alert.alert("Error", "Failed to update. Please try again.");
            } finally {
              setProcessing(null);
            }
          },
        },
      ]
    );
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp?.toDate) return "Just now";
    return timestamp.toDate().toLocaleString("en-BD", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>

      {/* Header */}
      <View style={{
        backgroundColor: "#7c3aed", paddingTop: 56, paddingBottom: 20,
        paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 14,
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
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>
            Verification Requests
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 1 }}>
            {pendingCount > 0 ? `${pendingCount} pending` : "All reviewed"}
          </Text>
        </View>
        {pendingCount > 0 && (
          <View style={{
            backgroundColor: "#dc2626", borderRadius: 12,
            paddingHorizontal: 10, paddingVertical: 4,
          }}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
              {pendingCount}
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={{ color: "#9ca3af", marginTop: 12 }}>Loading requests...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchRequests(); }}
              colors={["#7c3aed"]}
            />
          }
        >
          {requests.length === 0 ? (
            <View style={{
              backgroundColor: "#fff", borderRadius: 16, padding: 40,
              alignItems: "center", borderWidth: 1, borderColor: "#f3f4f6",
            }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🪪</Text>
              <Text style={{ color: "#374151", fontWeight: "700", fontSize: 16 }}>
                No verification requests
              </Text>
              <Text style={{ color: "#9ca3af", fontSize: 13, marginTop: 6 }}>
                Citizen verification requests will appear here
              </Text>
            </View>
          ) : (
            requests.map((req) => {
              const isPending = req.status === "pending";
              const isProcessing = processing === req.id;

              return (
                <View key={req.id} style={{
                  backgroundColor: isPending ? "#fdf4ff" : "#fff",
                  borderRadius: 16, padding: 16, marginBottom: 12,
                  borderWidth: 1,
                  borderColor: isPending ? "#e9d5ff" : "#f3f4f6",
                  elevation: isPending ? 2 : 0,
                  shadowColor: "#7c3aed",
                  shadowOpacity: isPending ? 0.08 : 0,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 2 },
                }}>

                  {/* User info */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <View style={{
                      width: 44, height: 44, borderRadius: 22,
                      backgroundColor: "#f5f3ff", alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Text style={{ fontSize: 20 }}>👤</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#1f2937", fontWeight: "700", fontSize: 15 }}>
                        {req.name}
                      </Text>
                      <Text style={{ color: "#6b7280", fontSize: 13 }}>
                        @{req.nickname}
                      </Text>
                    </View>
                    <View style={{
                      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
                      backgroundColor:
                        req.status === "pending" ? "#f5f3ff" :
                        req.status === "verified" ? "#f0fdf4" : "#fef2f2",
                      borderWidth: 1,
                      borderColor:
                        req.status === "pending" ? "#ddd6fe" :
                        req.status === "verified" ? "#86efac" : "#fecaca",
                    }}>
                      <Text style={{
                        fontSize: 11, fontWeight: "700",
                        color:
                          req.status === "pending" ? "#7c3aed" :
                          req.status === "verified" ? "#15803d" : "#dc2626",
                        textTransform: "capitalize",
                      }}>
                        {req.status === "verified" ? "✅ Verified" :
                         req.status === "rejected" ? "❌ Rejected" : "⏳ Pending"}
                      </Text>
                    </View>
                  </View>

                  {/* NID info */}
                  <View style={{
                    backgroundColor: "#f8fafc", borderRadius: 10,
                    padding: 12, marginBottom: 12,
                    borderWidth: 1, borderColor: "#e2e8f0",
                  }}>
                    <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "600", marginBottom: 4 }}>
                      🪪 NID NUMBER
                    </Text>
                    <Text style={{ color: "#1f2937", fontSize: 15, fontWeight: "700", letterSpacing: 1 }}>
                      {req.nidNumber}
                    </Text>
                  </View>

                  <Text style={{ color: "#9ca3af", fontSize: 11, marginBottom: 12 }}>
                    🕐 Submitted {formatTime(req.submittedAt)}
                  </Text>

                  {/* Action buttons — only for pending */}
                  {isPending && (
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <TouchableOpacity
                        onPress={() => handleDecision(req.id, req.uid, "rejected")}
                        disabled={isProcessing}
                        style={{
                          flex: 1, backgroundColor: "#fef2f2",
                          borderRadius: 10, paddingVertical: 12,
                          alignItems: "center", borderWidth: 1, borderColor: "#fecaca",
                        }}
                      >
                        {isProcessing ? <ActivityIndicator color="#dc2626" size="small" /> : (
                          <Text style={{ color: "#dc2626", fontWeight: "700", fontSize: 13 }}>
                            ❌ Reject
                          </Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDecision(req.id, req.uid, "verified")}
                        disabled={isProcessing}
                        style={{
                          flex: 2, backgroundColor: "#7c3aed",
                          borderRadius: 10, paddingVertical: 12,
                          alignItems: "center",
                        }}
                      >
                        {isProcessing ? <ActivityIndicator color="#fff" size="small" /> : (
                          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
                            ✅ Approve Verification
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}