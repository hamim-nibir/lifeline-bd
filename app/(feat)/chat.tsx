import { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { db } from "../../services/firebase";
import {
  collection, addDoc, query, orderBy,
  onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { useAuthStore } from "../../store/authStore";
import { StatusBar } from "expo-status-bar";

type Message = {
  id: string;
  text: string;
  senderUid: string;
  senderName: string;
  senderRole: "citizen" | "operator";
  createdAt: any;
};

export default function ChatScreen() {
  const router = useRouter();
  const { user, nickname } = useAuthStore();
  const uid = user?.uid ?? "";

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText]         = useState("");
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  // Listen to messages in real time
  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "operatorChats", uid, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs: Message[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Message, "id">),
      }));
      setMessages(msgs);
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => unsub();
  }, [uid]);

  const handleSend = async () => {
    if (!text.trim()) return;
    if (!uid) return;
    setSending(true);
    try {
      await addDoc(collection(db, "chats", uid, "messages"), {
        text: text.trim(),
        senderUid: uid,
        senderName: nickname ?? "Citizen",
        senderRole: "citizen",
        createdAt: serverTimestamp(),
      });

      // Notify operators
      await addDoc(collection(db, "notifications"), {
        type: "citizenChat",
        title: "💬 New Message",
        body: `${nickname ?? "A citizen"} sent a message`,
        fromUid: uid,
        fromName: nickname ?? "Citizen",
        read: false,
        createdAt: serverTimestamp(),
      });

      setText("");
    } catch (err) {
      Alert.alert("Error", "Could not send message.");
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

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f0eb" }}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={{
        backgroundColor: "#c4451a",
        paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16,
        flexDirection: "row", alignItems: "center", gap: 12,
      }}>
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
        <View style={{
          width: 38, height: 38, borderRadius: 19,
          backgroundColor: "#c4451a",
          alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ fontSize: 18 }}>🛡️</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
            LifeLine BD Operator
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
            We typically reply within minutes
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" ,}}>
            <ActivityIndicator size="large" color="#1a4a4a" />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: true })
            }
          >
            {messages.length === 0 && (
              <View style={{
                alignItems: "center", marginTop: 60, marginBottom: 20,
              }}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>💬</Text>
                <Text style={{ color: "#374151", fontWeight: "700", fontSize: 16 }}>
                  Chat with an Operator
                </Text>
                <Text style={{ color: "#9ca3af", fontSize: 13, marginTop: 6, textAlign: "center" }}>
                  Send a message and an operator will respond shortly
                </Text>
              </View>
            )}

            {messages.map((msg) => {
              const isMe = msg.senderRole === "citizen";
              return (
                <View key={msg.id} style={{
                  flexDirection: "row",
                  justifyContent: isMe ? "flex-end" : "flex-start",
                  marginBottom: 10,
                }}>
                  {!isMe && (
                    <View style={{
                      width: 30, height: 30, borderRadius: 15,
                      backgroundColor: "#1a4a4a",
                      alignItems: "center", justifyContent: "center",
                      marginRight: 8, alignSelf: "flex-end",
                    }}>
                      <Text style={{ fontSize: 14 }}>🛡️</Text>
                    </View>
                  )}
                  <View style={{ maxWidth: "75%" }}>
                    {!isMe && (
                      <Text style={{
                        color: "#9ca3af", fontSize: 10,
                        marginBottom: 3, marginLeft: 4,
                      }}>
                        {msg.senderName}
                      </Text>
                    )}
                    <View style={{
                      backgroundColor: isMe ? "#c4451a" : "#fff",
                      borderRadius: 16,
                      borderBottomRightRadius: isMe ? 4 : 16,
                      borderBottomLeftRadius: isMe ? 16 : 4,
                      paddingHorizontal: 14, paddingVertical: 10,
                      borderWidth: isMe ? 0 : 1,
                      borderColor: "#e8e4df",
                      elevation: 1,
                    }}>
                      <Text style={{
                        color: isMe ? "#fff" : "#1a1a1a",
                        fontSize: 14, lineHeight: 20,
                      }}>
                        {msg.text}
                      </Text>
                    </View>
                    <Text style={{
                      color: "#9ca3af", fontSize: 10, marginTop: 3,
                      textAlign: isMe ? "right" : "left",
                      marginHorizontal: 4,
                    }}>
                      {formatTime(msg.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Input */}
        <View style={{
          flexDirection: "row", alignItems: "flex-end", gap: 10,
          paddingHorizontal: 16, paddingVertical: 12,
          backgroundColor: "#b64b11",
          borderTopWidth: 1, borderTopColor: "#e8e4df",
        }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
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
            onPress={handleSend}
            disabled={sending || !text.trim()}
            style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: text.trim() ? "#c4451a" : "#e8e4df",
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