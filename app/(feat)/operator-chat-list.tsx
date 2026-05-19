import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Alert,
  KeyboardAvoidingView, Platform, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { db } from "../../services/firebase";
import {
  collection, getDocs, addDoc,
  query, orderBy, onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { StatusBar } from "expo-status-bar";

type ChatUser = {
  uid: string;
  name: string;
  lastMessage: string;
  lastTime: any;
  unread: boolean;
};

type Message = {
  id: string;
  text: string;
  senderUid: string;
  senderName: string;
  senderRole: "citizen" | "operator";
  createdAt: any;
};

export default function OperatorChatListScreen() {
  const router = useRouter();
  const [chatUsers, setChatUsers]       = useState<ChatUser[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [selectedUid, setSelectedUid]   = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");
  const [messages, setMessages]         = useState<Message[]>([]);
  const [replyText, setReplyText]       = useState("");
  const [sending, setSending]           = useState(false);

  const fetchChatUsers = async () => {
    try {
      const snap = await getDocs(collection(db, "operatorChats"));
      const users: ChatUser[] = [];
      for (const chatDoc of snap.docs) {
        const uid = chatDoc.id;
        const msgSnap = await getDocs(
          query(
            collection(db, "operatorChats", uid, "messages"),
            orderBy("createdAt", "desc")
          )
        );
        if (msgSnap.docs.length > 0) {
          const last = msgSnap.docs[0].data();
          users.push({
            uid,
            name: last.senderName ?? uid,
            lastMessage: last.text ?? "",
            lastTime: last.createdAt,
            unread: last.senderRole === "citizen",
          });
        }
      }
      users.sort((a, b) =>
        (b.lastTime?.toDate?.() ?? 0) - (a.lastTime?.toDate?.() ?? 0)
      );
      setChatUsers(users);
    } catch (err) {
      console.error("Failed to fetch chats:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchChatUsers(); }, []);

  // Listen to selected chat
  useEffect(() => {
    if (!selectedUid) return;
    const q = query(
      collection(db, "operatorChats", selectedUid, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs: Message[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Message, "id">),
      }));
      setMessages(msgs);
    });
    return () => unsub();
  }, [selectedUid]);

  const handleReply = async () => {
    if (!replyText.trim() || !selectedUid) return;
    setSending(true);
    try {
      await addDoc(
        collection(db, "operatorChats", selectedUid, "messages"),
        {
          text: replyText.trim(),
          senderUid: "operator",
          senderName: "LifeLine Operator",
          senderRole: "operator",
          createdAt: serverTimestamp(),
        }
      );
      setReplyText("");
    } catch (err) {
      Alert.alert("Error", "Could not send reply.");
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp?.toDate) return "";
    return timestamp.toDate().toLocaleTimeString("en-BD", {
      hour: "2-digit", minute: "2-digit",
    });
  };

  // If a chat is selected, show it
  if (selectedUid) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f5f0eb" }}>
        <StatusBar style="light" />
        <View style={{
          backgroundColor: "#1a4a4a",
          paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16,
          flexDirection: "row", alignItems: "center", gap: 12,
        }}>
          <TouchableOpacity
            onPress={() => { setSelectedUid(null); setMessages([]); fetchChatUsers(); }}
            style={{
              width: 34, height: 34, borderRadius: 9,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          <View style={{
            width: 38, height: 38, borderRadius: 19,
            backgroundColor: "#c4451a",
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ fontSize: 18 }}>👤</Text>
          </View>
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700", flex: 1 }}>
            {selectedName}
          </Text>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg) => {
              const isOperator = msg.senderRole === "operator";
              return (
                <View key={msg.id} style={{
                  flexDirection: "row",
                  justifyContent: isOperator ? "flex-end" : "flex-start",
                  marginBottom: 10,
                }}>
                  <View style={{ maxWidth: "75%" }}>
                    {!isOperator && (
                      <Text style={{ color: "#9ca3af", fontSize: 10, marginBottom: 3, marginLeft: 4 }}>
                        {msg.senderName}
                      </Text>
                    )}
                    <View style={{
                      backgroundColor: isOperator ? "#1a4a4a" : "#fff",
                      borderRadius: 16,
                      borderBottomRightRadius: isOperator ? 4 : 16,
                      borderBottomLeftRadius: isOperator ? 16 : 4,
                      paddingHorizontal: 14, paddingVertical: 10,
                      borderWidth: isOperator ? 0 : 1,
                      borderColor: "#e8e4df",
                    }}>
                      <Text style={{
                        color: isOperator ? "#fff" : "#1a1a1a",
                        fontSize: 14, lineHeight: 20,
                      }}>
                        {msg.text}
                      </Text>
                    </View>
                    <Text style={{
                      color: "#9ca3af", fontSize: 10, marginTop: 3,
                      textAlign: isOperator ? "right" : "left",
                      marginHorizontal: 4,
                    }}>
                      {formatTime(msg.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={{
            flexDirection: "row", alignItems: "flex-end", gap: 10,
            paddingHorizontal: 16, paddingVertical: 12,
            backgroundColor: "#fff",
            borderTopWidth: 1, borderTopColor: "#e8e4df",
          }}>
            <TextInput
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Reply to citizen..."
              placeholderTextColor="#9ca3af"
              multiline
              style={{
                flex: 1, backgroundColor: "#f5f5f5",
                borderRadius: 20, paddingHorizontal: 16,
                paddingVertical: 10, fontSize: 14, color: "#1a1a1a",
                maxHeight: 100, borderWidth: 1, borderColor: "#e8e4df",
              }}
            />
            <TouchableOpacity
              onPress={handleReply}
              disabled={sending || !replyText.trim()}
              style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: replyText.trim() ? "#1a4a4a" : "#e8e4df",
                alignItems: "center", justifyContent: "center",
              }}
            >
              {sending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={{ fontSize: 18 }}>➤</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // Chat list view
  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <StatusBar style="light" />
      <View style={{
        backgroundColor: "#1a4a4a",
        paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20,
        flexDirection: "row", alignItems: "center", gap: 14,
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
            Citizen Chats
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 1 }}>
            {chatUsers.length} active conversation(s)
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#1a4a4a" />
          <Text style={{ color: "#9ca3af", marginTop: 12 }}>Loading chats...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchChatUsers(); }}
              colors={["#1a4a4a"]}
            />
          }
        >
          {chatUsers.length === 0 ? (
            <View style={{
              backgroundColor: "#fff", borderRadius: 16, padding: 40,
              alignItems: "center", borderWidth: 1, borderColor: "#f3f4f6",
            }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>💬</Text>
              <Text style={{ color: "#374151", fontWeight: "700", fontSize: 16 }}>
                No chats yet
              </Text>
              <Text style={{ color: "#9ca3af", fontSize: 13, marginTop: 6 }}>
                Citizen messages will appear here
              </Text>
            </View>
          ) : (
            chatUsers.map((cu) => (
              <TouchableOpacity
                key={cu.uid}
                onPress={() => { setSelectedUid(cu.uid); setSelectedName(cu.name); }}
                style={{
                  backgroundColor: "#fff", borderRadius: 14,
                  padding: 14, marginBottom: 10,
                  flexDirection: "row", alignItems: "center", gap: 12,
                  borderWidth: 1,
                  borderColor: cu.unread ? "#fed7aa" : "#f3f4f6",
                  elevation: 1,
                }}
                activeOpacity={0.8}
              >
                <View style={{
                  width: 46, height: 46, borderRadius: 23,
                  backgroundColor: cu.unread ? "#fdf0eb" : "#f3f4f6",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Text style={{ fontSize: 22 }}>👤</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: "#1f2937", fontWeight: "700", fontSize: 14 }}>
                      {cu.name}
                    </Text>
                    <Text style={{ color: "#9ca3af", fontSize: 11 }}>
                      {formatTime(cu.lastTime)}
                    </Text>
                  </View>
                  <Text style={{
                    color: cu.unread ? "#c4451a" : "#9ca3af",
                    fontSize: 12, marginTop: 3,
                    fontWeight: cu.unread ? "600" : "400",
                  }} numberOfLines={1}>
                    {cu.lastMessage}
                  </Text>
                </View>
                {cu.unread && (
                  <View style={{
                    width: 10, height: 10, borderRadius: 5,
                    backgroundColor: "#c4451a",
                  }} />
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}