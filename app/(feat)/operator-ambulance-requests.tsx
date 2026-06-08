import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import {
  pushAmbulanceDispatchNotification,
  updateAmbulanceRequestOperator,
  updateAmbulanceRequestStatus,
} from "../../services/ambulance";
import { useAuthStore } from "../../store/authStore";
import { AmbulanceRequest, AmbulanceRequestStatus } from "../../types";
import { interpolateToward, offsetLatLng } from "../../utils/geo";

const STATUS_FLOW: AmbulanceRequestStatus[] = [
  "pending",
  "accepted",
  "dispatched",
  "completed",
  "cancelled",
];

function pickupCoords(r: AmbulanceRequest): { lat: number; lng: number } | null {
  if (r.latitude != null && r.longitude != null) {
    if (Math.abs(r.latitude) > 1e-8 || Math.abs(r.longitude) > 1e-8) {
      return { lat: r.latitude, lng: r.longitude };
    }
  }
  return null;
}

export default function OperatorAmbulanceRequestsScreen() {
  const router = useRouter();
  const { accountType } = useAuthStore();
  const [items, setItems] = useState<AmbulanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (accountType && accountType !== "operator") {
      router.replace("/(tabs)");
    }
  }, [accountType, router]);

  useEffect(() => {
    const q = query(collection(db, "ambulance_requests"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AmbulanceRequest, "id">),
        }));
        setItems(rows);
        setLoading(false);
        setRefreshing(false);
      },
      () => {
        setLoading(false);
        setRefreshing(false);
      }
    );
    return () => unsub();
  }, []);

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    try {
      await fn();
    } catch (e: any) {
      Alert.alert("Update failed", e?.message ?? "Could not update request.");
    } finally {
      setBusyId(null);
    }
  };

  const notifyCitizen = async (
    r: AmbulanceRequest,
    status: AmbulanceRequestStatus,
    title: string,
    body: string
  ) => {
    if (!r.userId) return;
    await pushAmbulanceDispatchNotification({
      ambulanceRequestId: r.id,
      recipientUserId: r.userId,
      title,
      body,
      ambulanceStatus: status,
    });
  };

  const handleAccept = (r: AmbulanceRequest) =>
    run(r.id, async () => {
      const msg = `Dispatch accepted your request (${r.emergencyType || "Emergency"}). Ambulance crew is being assigned.`;
      await updateAmbulanceRequestOperator(r.id, {
        status: "accepted",
        operatorMessage: msg,
      });
      await notifyCitizen(r, "accepted", "Ambulance request accepted", msg);
    });

  const handleDispatch = (r: AmbulanceRequest) =>
    run(r.id, async () => {
      const p = pickupCoords(r);
      if (!p) {
        Alert.alert(
          "No GPS on file",
          "This request has no pickup coordinates. Ask the user to enable location, or set status manually only."
        );
        const msg =
          "Ambulance dispatched. Open Notifications and tap this update for live tracking when GPS is available.";
        await updateAmbulanceRequestOperator(r.id, {
          status: "dispatched",
          operatorMessage: "Ambulance dispatched. Live tracking is active on the user's app.",
        });
        await notifyCitizen(r, "dispatched", "Ambulance dispatched", msg);
        return;
      }
      const bearing = Math.random() * 360;
      const amb = offsetLatLng(p.lat, p.lng, 4.2, bearing);
      const msg =
        "Ambulance is en route. Open Notifications and tap this update for live GPS tracking, distance, and status.";
      await updateAmbulanceRequestOperator(r.id, {
        status: "dispatched",
        ambulanceLatitude: amb.latitude,
        ambulanceLongitude: amb.longitude,
        operatorMessage:
          "Ambulance is en route. The user can see live distance and map. Use \"Advance unit\" to move the marker closer.",
      });
      await notifyCitizen(r, "dispatched", "Ambulance en route", msg);
    });

  const handleAdvanceUnit = (r: AmbulanceRequest) =>
    run(r.id, async () => {
      const p = pickupCoords(r);
      if (!p || r.ambulanceLatitude == null || r.ambulanceLongitude == null) {
        Alert.alert("Missing positions", "Dispatch the ambulance first or ensure pickup GPS exists.");
        return;
      }
      const next = interpolateToward(
        r.ambulanceLatitude,
        r.ambulanceLongitude,
        p.lat,
        p.lng,
        0.45
      );
      const msg = "Ambulance position updated — moving toward pickup. Check live map from Notifications.";
      await updateAmbulanceRequestOperator(r.id, {
        ambulanceLatitude: next.latitude,
        ambulanceLongitude: next.longitude,
        operatorMessage: "Ambulance position updated — moving toward pickup.",
      });
      await notifyCitizen(
        r,
        r.status,
        "Ambulance location updated",
        msg
      );
    });

  const handleArrived = (r: AmbulanceRequest) =>
    run(r.id, async () => {
      const p = pickupCoords(r);
      if (p) {
        const msg = "Ambulance has arrived at the pickup location.";
        await updateAmbulanceRequestOperator(r.id, {
          status: "completed",
          ambulanceLatitude: p.lat,
          ambulanceLongitude: p.lng,
          operatorMessage: msg,
        });
        await notifyCitizen(r, "completed", "Ambulance arrived", msg);
      } else {
        const msg = "Case marked complete by dispatch.";
        await updateAmbulanceRequestOperator(r.id, {
          status: "completed",
          operatorMessage: msg,
        });
        await notifyCitizen(r, "completed", "Request completed", msg);
      }
    });

  const statusNotifyCopy = (
    status: AmbulanceRequestStatus
  ): { title: string; body: string } => {
    switch (status) {
      case "pending":
        return {
          title: "Status: pending",
          body: "Your ambulance request is pending review by dispatch.",
        };
      case "accepted":
        return {
          title: "Status: accepted",
          body: "Dispatch has accepted your ambulance request.",
        };
      case "dispatched":
        return {
          title: "Status: dispatched",
          body: "Your request is marked dispatched. Open tracking from Notifications when available.",
        };
      case "completed":
        return {
          title: "Status: completed",
          body: "This ambulance request has been marked complete.",
        };
      case "cancelled":
        return {
          title: "Status: cancelled",
          body: "This ambulance request has been cancelled.",
        };
      default:
        return { title: "Ambulance update", body: "Dispatch updated your request status." };
    }
  };

  const setStatusOnly = (item: AmbulanceRequest, status: AmbulanceRequestStatus) =>
    run(item.id, async () => {
      await updateAmbulanceRequestStatus(item.id, status);
      const { title, body } = statusNotifyCopy(status);
      await notifyCitizen(item, status, title, body);
    });

  const formatTime = (timestamp: any) => {
    if (!timestamp?.toDate) return "Just now";
    return timestamp.toDate().toLocaleString("en-BD", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const headerSubtitle = useMemo(() => `${items.length} request(s)`, [items.length]);

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View
        style={{
          backgroundColor: "#7c3aed",
          paddingTop: 56,
          paddingBottom: 20,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            backgroundColor: "rgba(255,255,255,0.2)",
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>Ambulance Requests</Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 }}>
            {headerSubtitle} · Live updates to citizen app
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={{ color: "#9ca3af", marginTop: 10 }}>Loading ambulance requests...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => setRefreshing(true)}
              colors={["#7c3aed"]}
            />
          }
        >
          {items.length === 0 ? (
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 16,
                padding: 30,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#f3f4f6",
              }}
            >
              <Text style={{ fontSize: 40 }}>🚑</Text>
              <Text style={{ marginTop: 8, color: "#374151", fontWeight: "700" }}>No ambulance requests</Text>
            </View>
          ) : (
            items.map((item) => {
              const hasPickup = !!pickupCoords(item);
              const hasAmb =
                item.ambulanceLatitude != null &&
                item.ambulanceLongitude != null &&
                (Math.abs(item.ambulanceLatitude) > 1e-8 || Math.abs(item.ambulanceLongitude) > 1e-8);
              const isBusy = busyId === item.id;
              return (
                <View
                  key={item.id}
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "#f3f4f6",
                    padding: 14,
                    marginBottom: 10,
                  }}
                >
                  <Text style={{ color: "#111827", fontWeight: "800", fontSize: 14 }}>
                    {item.category === "mass_casualty" ? "Mass casualty" : "Ambulance"} · {item.status}
                  </Text>
                  <Text style={{ color: "#4b5563", fontSize: 12, marginTop: 4 }}>
                    By {item.userName} • {formatTime(item.createdAt)}
                  </Text>
                  <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 6 }}>
                    {item.emergencyType || "—"} | {item.ambulanceType || "Vehicle TBD"}
                  </Text>
                  <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 3 }}>
                    Location: {item.locationDetails || "—"}
                  </Text>
                  <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 3 }}>
                    GPS pickup: {hasPickup ? "Yes" : "No"} · Ambulance on map: {hasAmb ? "Yes" : "No"}
                  </Text>
                  {item.operatorMessage ? (
                    <Text style={{ color: "#92400e", fontSize: 12, marginTop: 8, fontWeight: "600" }}>
                      Last message to user: {item.operatorMessage}
                    </Text>
                  ) : null}

                  <View style={{ marginTop: 12, gap: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748b" }}>QUICK ACTIONS</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      <TouchableOpacity
                        disabled={isBusy || item.status === "cancelled" || item.status === "completed"}
                        onPress={() => handleAccept(item)}
                        style={{
                          backgroundColor: "#dcfce7",
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          opacity: isBusy ? 0.6 : 1,
                        }}
                      >
                        <Text style={{ fontWeight: "800", color: "#166534", fontSize: 12 }}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={isBusy || item.status === "cancelled" || item.status === "completed"}
                        onPress={() => handleDispatch(item)}
                        style={{
                          backgroundColor: "#ffedd5",
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          opacity: isBusy ? 0.6 : 1,
                        }}
                      >
                        <Text style={{ fontWeight: "800", color: "#9a3412", fontSize: 12 }}>Dispatch + GPS</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={isBusy || item.status === "cancelled" || item.status === "completed"}
                        onPress={() => handleAdvanceUnit(item)}
                        style={{
                          backgroundColor: "#e0e7ff",
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          opacity: isBusy ? 0.6 : 1,
                        }}
                      >
                        <Text style={{ fontWeight: "800", color: "#3730a3", fontSize: 12 }}>Advance unit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={isBusy || item.status === "cancelled"}
                        onPress={() => handleArrived(item)}
                        style={{
                          backgroundColor: "#ccfbf1",
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                          opacity: isBusy ? 0.6 : 1,
                        }}
                      >
                        <Text style={{ fontWeight: "800", color: "#0f766e", fontSize: 12 }}>Mark arrived</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                    {STATUS_FLOW.map((status) => (
                      <TouchableOpacity
                        key={status}
                        disabled={isBusy}
                        onPress={() => setStatusOnly(item, status)}
                        style={{
                          backgroundColor: item.status === status ? "#ede9fe" : "#f3f4f6",
                          borderWidth: 1,
                          borderColor: item.status === status ? "#c4b5fd" : "#e5e7eb",
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          opacity: isBusy ? 0.5 : 1,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            color: item.status === status ? "#5b21b6" : "#6b7280",
                            fontWeight: "700",
                            textTransform: "capitalize",
                          }}
                        >
                          {status}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}
