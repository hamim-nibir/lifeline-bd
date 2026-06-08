import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../hooks/useTranslation";
import { db } from "../../services/firebase";
import {
  collection, query, where,
  onSnapshot, orderBy, getDoc, doc,
} from "firebase/firestore";

type ChatPreview = {
  chatId: string;
  otherUid: string;
  otherName: string;
  lastMessage: string;
  lastMessageAt: any;
  unreadCount: number;
};

export default function ChatListScreen() {
  const router = useRouter();
  const { user, nickname } = useAuthStore();
  const { t } = useTranslation();
  const uid = user?.uid ?? "";

  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!uid) return;

    // Listen to all chats where current user is a participant
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", uid),
      orderBy("lastMessageAt", "desc")
    );

    const unsub = onSnapshot(q, async (snap) => {
      const chatPreviews: ChatPreview[] = [];

      for (const d of snap.docs) {
        const data = d.data();
        const participants: string[] = data.participants ?? [];
        const otherUid = participants.find((p) => p !== uid) ?? "";

        // Fetch other user's name
        let otherName = t("messages.user");
        if (otherUid) {
          try {
            const userSnap = await getDoc(doc(db, "users", otherUid));
            if (userSnap.exists()) {
              const userData = userSnap.data();
              otherName = userData.nickname ?? userData.name ?? t("messages.user");
            }
          } catch {}
        }

        // Count unread messages
        let unreadCount = 0;
        try {
          const msgQ = query(
            collection(db, "chats", d.id, "messages"),
            where("senderUid", "!=", uid),
            where("read", "==", false)
          );
          const msgSnap = await (await import("firebase/firestore")).getDocs(msgQ);
          unreadCount = msgSnap.size;
        } catch {}

        chatPreviews.push({
          chatId: d.id,
          otherUid,
          otherName,
          lastMessage: data.lastMessage ?? "",
          lastMessageAt: data.lastMessageAt,
          unreadCount,
        });
      }

      setChats(chatPreviews);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsub();
  }, [uid]);

  const formatTime = (timestamp: any) => {
    if (!timestamp?.toDate) return "";
    const date: Date = timestamp.toDate();
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return t("messages.now");
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return date.toLocaleDateString("en-BD", { day: "2-digit", month: "short" });
  };

  const totalUnread = chats.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>

      {/* Header */}
      <View style={{
        backgroundColor: "#1a4a4a",
        paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20,
      }}>
        <View style={{
          flexDirection: "row", justifyContent: "space-between",
          alignItems: "center",
        }}>
          <TouchableOpacity
            onPress={() => router.replace("/dashboard")}
            style={{
              backgroundColor: "rgba(255,255,255,0.2)", width: 36, height: 36,
              borderRadius: 18, alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700" }}>
                {t("messages.title")}
              </Text>
              {totalUnread > 0 && (
                <View style={{
                  backgroundColor: "#dc2626", borderRadius: 10,
                  paddingHorizontal: 8, paddingVertical: 3,
                }}>
                  <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>
                    {totalUnread}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={{ color: "#9ca3af", marginTop: 12 }}>{t("messages.loading")}</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => setRefreshing(true)}
              colors={["#f97316"]}
            />
          }
        >
          {chats.length === 0 ? (
            <View style={{
              alignItems: "center", justifyContent: "center",
              paddingTop: 80, paddingHorizontal: 32,
            }}>
              <Text style={{ fontSize: 52, marginBottom: 16 }}>💬</Text>
              <Text style={{ color: "#374151", fontWeight: "700", fontSize: 18 }}>
                {t("messages.emptyTitle")}
              </Text>
              <Text style={{ color: "#9ca3af", fontSize: 14, marginTop: 8, textAlign: "center", lineHeight: 20 }}>
                {t("messages.emptyHint")}
              </Text>
            </View>
          ) : (
            chats.map((chat, index) => (
              <TouchableOpacity
                key={chat.chatId}
                onPress={() =>
                  router.push({
                    pathname: "/(feat)/chat",
                    params: {
                      chatId: chat.chatId,
                      otherUid: chat.otherUid,
                      otherName: chat.otherName,
                    },
                  } as any)
                }
                activeOpacity={0.7}
                style={{
                  backgroundColor: chat.unreadCount > 0 ? "#fffbeb" : "#fff",
                  flexDirection: "row", alignItems: "center",
                  paddingHorizontal: 16, paddingVertical: 14,
                  borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
                }}
              >
                {/* Avatar */}
                <View style={{
                  width: 50, height: 50, borderRadius: 25,
                  backgroundColor: chat.unreadCount > 0 ? "#fff7ed" : "#f3f4f6",
                  alignItems: "center", justifyContent: "center",
                  borderWidth: chat.unreadCount > 0 ? 2 : 1,
                  borderColor: chat.unreadCount > 0 ? "#fed7aa" : "#e5e7eb",
                  marginRight: 12, flexShrink: 0,
                }}>
                  <Text style={{ fontSize: 22 }}>👤</Text>
                </View>

                {/* Chat info */}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{
                    flexDirection: "row", justifyContent: "space-between",
                    alignItems: "center", marginBottom: 4,
                  }}>
                    <Text style={{
                      color: "#1f2937", fontWeight: chat.unreadCount > 0 ? "800" : "600",
                      fontSize: 15, flex: 1, marginRight: 8,
                    }}
                      numberOfLines={1}
                    >
                      {chat.otherName}
                    </Text>
                    <Text style={{
                      color: chat.unreadCount > 0 ? "#f97316" : "#9ca3af",
                      fontSize: 11, fontWeight: chat.unreadCount > 0 ? "700" : "400",
                      flexShrink: 0,
                    }}>
                      {formatTime(chat.lastMessageAt)}
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text
                      style={{
                        color: chat.unreadCount > 0 ? "#374151" : "#9ca3af",
                        fontSize: 13, flex: 1, marginRight: 8,
                        fontWeight: chat.unreadCount > 0 ? "600" : "400",
                      }}
                      numberOfLines={1}
                    >
                      {chat.lastMessage || t("messages.startConversation")}
                    </Text>

                    {/* Unread badge */}
                    {chat.unreadCount > 0 && (
                      <View style={{
                        backgroundColor: "#f97316", borderRadius: 10,
                        minWidth: 20, height: 20,
                        alignItems: "center", justifyContent: "center",
                        paddingHorizontal: 5, flexShrink: 0,
                      }}>
                        <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>
                          {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}