import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "../../services/firebase";

type IncidentRow = {
  id: string;
  serviceTitle?: string;
  severity?: string;
  userId: string;
};

export default function OperatorFireChatsScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "incidents"),
      where("status", "==", "active"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRows(
          snap.docs.map((d) => ({
            id: d.id,
            serviceTitle: d.data().serviceTitle as string | undefined,
            severity: d.data().severity as string | undefined,
            userId: String(d.data().userId ?? ""),
          }))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  return (
    <View style={styles.root}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Fire Emergency Chats</Text>
      <Text style={styles.sub}>Active incidents — tap to open chat</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#C0392B" />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Text style={styles.empty}>No active fire incidents.</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/emergency-chat",
                  params: { incidentId: item.id },
                })
              }
            >
              <Text style={styles.cardTitle}>{item.serviceTitle ?? "Fire incident"}</Text>
              <Text style={styles.cardMeta}>
                Severity: {item.severity ?? "—"} • ID: {item.id.slice(0, 8)}…
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F6F8", paddingTop: 48 },
  back: { paddingHorizontal: 16, marginBottom: 8 },
  backText: { color: "#666", fontWeight: "600" },
  title: { fontSize: 22, fontWeight: "800", paddingHorizontal: 16 },
  sub: { color: "#888", paddingHorizontal: 16, marginBottom: 8 },
  empty: { textAlign: "center", color: "#888", marginTop: 32 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  cardMeta: { fontSize: 12, color: "#888" },
});
