import { useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform,
  ActivityIndicator, Animated,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { db } from "../../services/firebase";
import {
  collection, query, orderBy, onSnapshot,
  addDoc, serverTimestamp, doc, getDoc,
  updateDoc, setDoc,
} from "firebase/firestore";

type Message = {
  id: string;
  text: string;
  senderUid: string;
  senderName: string;
  createdAt: any;
  read: boolean;
};

export default function ChatScreen() {
  const router = useRouter();
  const { chatId, otherUid, otherName } = useLocalSearchParams<{
    chatId: string;
    otherUid: string;
    otherName: string;
  }>();

  const { user, nickname } = useAuthStore();
  const uid = user?.uid ?? "";

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUserName, setOtherUserName] = useState(otherName ?? "User");

  const flatListRef = useRef<FlatList>(null);
  const inputAnim = useRef(new Animated.Value(1)).current;

  // Fetch other user's name
  useEffect(() => {
    if (!otherUid) return;
    getDoc(doc(db, "users", otherUid)).then((snap) => {
      if (snap.exists()) {
        setOtherUserName(
          snap.data().nickname ?? snap.data().name ?? otherName ?? "User"
        );
      }
    });
  }, [otherUid]);

  // Real-time messages
  useEffect(() => {
    if (!chatId) return;
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: Message[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Message, "id">),
      }));
      setMessages(list);
      setLoading(false);
      // Mark incoming as read
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.senderUid !== uid && !data.read) {
          updateDoc(d.ref, { read: true }).catch(() => {});
        }
      });
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
    return () => unsub();
  }, [chatId]);

  // Send message
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setText("");
    setSending(true);
    Animated.sequence([
      Animated.timing(inputAnim, { toValue: 0.9, duration: 70, useNativeDriver: true }),
      Animated.timing(inputAnim, { toValue: 1, duration: 70, useNativeDriver: true }),
    ]).start();
    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        text: trimmed,
        senderUid: uid,
        senderName: nickname ?? "User",
        createdAt: serverTimestamp(),
        read: false,
      });
      await setDoc(doc(db, "chats", chatId), {
        participants: [uid, otherUid],
        lastMessage: trimmed,
        lastMessageAt: serverTimestamp(),
        lastSenderUid: uid,
      }, { merge: true });
    } catch (err) {
      console.error("Send failed:", err);
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

  const formatDateSeparator = (timestamp: any) => {
    if (!timestamp?.toDate) return "";
    const date: Date = timestamp.toDate();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-BD", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  const shouldShowDateSeparator = (index: number) => {
    if (index === 0) return true;
    const curr = messages[index];
    const prev = messages[index - 1];
    if (!curr.createdAt?.toDate || !prev.createdAt?.toDate) return false;
    return curr.createdAt.toDate().toDateString() !== prev.createdAt.toDate().toDateString();
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMine = item.senderUid === uid;
    return (
      <>
        {shouldShowDateSeparator(index) && (
          <View style={{ alignItems: "center", marginVertical: 12 }}>
            <View style={{
              backgroundColor: "rgba(0,0,0,0.06)", borderRadius: 10,
              paddingHorizontal: 12, paddingVertical: 4,
            }}>
              <Text style={{ color: "#6b7280", fontSize: 11, fontWeight: "600" }}>
                {formatDateSeparator(item.createdAt)}
              </Text>
            </View>
          </View>
        )}
        <View style={{
          flexDirection: "row",
          justifyContent: isMine ? "flex-end" : "flex-start",
          marginBottom: 4, paddingHorizontal: 12,
        }}>
          {!isMine && (
            <View style={{
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: "#f3f4f6", alignItems: "center",
              justifyContent: "center", marginRight: 6,
              marginTop: 2, flexShrink: 0,
            }}>
              <Text style={{ fontSize: 12 }}>👤</Text>
            </View>
          )}
          <View style={{ maxWidth: "72%" }}>
            {!isMine && (
              <Text style={{
                color: "#9ca3af", fontSize: 11,
                marginBottom: 2, marginLeft: 4,
              }}>
                {item.senderName}
              </Text>
            )}
            <View style={{
              backgroundColor: isMine ? "#f97316" : "#fff",
              borderRadius: 18,
              borderBottomRightRadius: isMine ? 4 : 18,
              borderBottomLeftRadius: isMine ? 18 : 4,
              paddingHorizontal: 14, paddingVertical: 10,
              borderWidth: isMine ? 0 : 1, borderColor: "#f3f4f6",
              elevation: 1, shadowColor: "#000",
              shadowOpacity: 0.04, shadowRadius: 2,
              shadowOffset: { width: 0, height: 1 },
            }}>
              <Text style={{
                color: isMine ? "#fff" : "#1f2937",
                fontSize: 14, lineHeight: 20,
              }}>
                {item.text}
              </Text>
            </View>
            <View style={{
              flexDirection: "row",
              justifyContent: isMine ? "flex-end" : "flex-start",
              alignItems: "center", gap: 4,
              marginTop: 3, paddingHorizontal: 4,
            }}>
              <Text style={{ color: "#9ca3af", fontSize: 10 }}>
                {formatTime(item.createdAt)}
              </Text>
              {isMine && (
                <Text style={{
                  fontSize: 10,
                  color: item.read ? "#f97316" : "#9ca3af",
                }}>
                  {item.read ? "✓✓" : "✓"}
                </Text>
              )}
            </View>
          </View>
        </View>
      </>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>

      {/* Header */}
      <View style={{
        backgroundColor: "#f97316", paddingTop: 56,
        paddingBottom: 14, paddingHorizontal: 16,
        flexDirection: "row", alignItems: "center", gap: 12,
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            backgroundColor: "rgba(255,255,255,0.2)",
            width: 36, height: 36, borderRadius: 18,
            alignItems: "center", justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>←</Text>
        </TouchableOpacity>
        <View style={{
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: "rgba(255,255,255,0.25)",
          alignItems: "center", justifyContent: "center",
          borderWidth: 2, borderColor: "rgba(255,255,255,0.4)",
        }}>
          <Text style={{ fontSize: 18 }}>👤</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
            {otherUserName}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 1 }}>
            Lifeline BD Chat
          </Text>
        </View>
      </View>

      {/* Messages list */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={{ color: "#9ca3af", marginTop: 12 }}>Loading messages...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{
            paddingVertical: 12, paddingBottom: 16, flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
          ListEmptyComponent={
            <View style={{
              flex: 1, alignItems: "center",
              justifyContent: "center", paddingTop: 80,
            }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>💬</Text>
              <Text style={{ color: "#374151", fontWeight: "700", fontSize: 16 }}>
                No messages yet
              </Text>
              <Text style={{ color: "#9ca3af", fontSize: 13, marginTop: 6 }}>
                Say hello to {otherUserName}!
              </Text>
            </View>
          }
        />
      )}

      {/* Input bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={{
          backgroundColor: "#fff", borderTopWidth: 1,
          borderTopColor: "#f3f4f6", paddingHorizontal: 12,
          paddingVertical: 10, flexDirection: "row",
          alignItems: "flex-end", gap: 8,
        }}>
          <View style={{
            flex: 1, backgroundColor: "#f9fafb",
            borderRadius: 24, borderWidth: 1,
            borderColor: "#e5e7eb", paddingHorizontal: 16,
            paddingVertical: 10, minHeight: 44,
            maxHeight: 120, justifyContent: "center",
          }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Type a message..."
              placeholderTextColor="#9ca3af"
              multiline
              style={{ fontSize: 14, color: "#1f2937", padding: 0, margin: 0 }}
            />
          </View>
          <Animated.View style={{ transform: [{ scale: inputAnim }] }}>
            <TouchableOpacity
              onPress={handleSend}
              disabled={!text.trim() || sending}
              style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: text.trim() ? "#f97316" : "#e5e7eb",
                alignItems: "center", justifyContent: "center",
                elevation: text.trim() ? 3 : 0,
                shadowColor: "#f97316",
                shadowOpacity: text.trim() ? 0.3 : 0,
                shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
              }}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{
                  fontSize: 16,
                  color: text.trim() ? "#fff" : "#9ca3af",
                }}>
                  ➤
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}