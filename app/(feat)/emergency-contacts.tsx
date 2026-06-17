import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import {
  addEmergencyContact,
  deleteEmergencyContact,
  getEmergencyContacts,
  updateEmergencyContact,
} from "../../services/sos";
import { UserEmergencyContact } from "../../types";

export default function EmergencyContactsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState<UserEmergencyContact[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [notifyOnSOS, setNotifyOnSOS] = useState(true);

  const loadContacts = useCallback(async () => {
    if (!user?.uid) {
      setContacts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await getEmergencyContacts(user.uid);
      setContacts(rows);
    } catch (error: any) {
      Alert.alert("Load failed", error?.message ?? "Could not load emergency contacts.");
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setPhone("");
    setRelationship("");
    setNotifyOnSOS(true);
  };

  const startEdit = (c: UserEmergencyContact) => {
    setEditingId(c.id);
    setName(c.name);
    setPhone(c.phone);
    setRelationship(c.relationship);
    setNotifyOnSOS(c.notifyOnSOS);
  };

  const handleSave = async () => {
    if (!user?.uid) {
      Alert.alert("Not signed in", "Please log in again.");
      return;
    }
    if (!name.trim() || !phone.trim() || !relationship.trim()) {
      Alert.alert("Missing fields", "Name, phone and relationship are required.");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateEmergencyContact(editingId, {
          userId: user.uid,
          name: name.trim(),
          phone: phone.trim(),
          relationship: relationship.trim(),
          notifyOnSOS,
        });
      } else {
        await addEmergencyContact({
          userId: user.uid,
          name: name.trim(),
          phone: phone.trim(),
          relationship: relationship.trim(),
          notifyOnSOS,
        });
      }
      resetForm();
      await loadContacts();
    } catch (error: any) {
      Alert.alert("Save failed", error?.message ?? "Could not save emergency contact.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (c: UserEmergencyContact) => {
    Alert.alert(
      "Remove contact?",
      `Remove ${c.name} from emergency contacts?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                setSaving(true);
                await deleteEmergencyContact(c.id);
                if (editingId === c.id) resetForm();
                await loadContacts();
              } catch (error: any) {
                Alert.alert("Delete failed", error?.message ?? "Could not delete contact.");
              } finally {
                setSaving(false);
              }
            })();
          },
        },
      ]
    );
  };

  const dial = async (raw: string) => {
    const cleaned = raw.replace(/[^\d+]/g, "");
    const url = `tel:${cleaned}`;
    const ok = await Linking.canOpenURL(url);
    if (!ok) {
      Alert.alert("Cannot call", "Calls are not supported on this device.");
      return;
    }
    await Linking.openURL(url);
  };

  const openSms = async (raw: string) => {
    const cleaned = raw.replace(/[^\d+]/g, "");
    const url = `sms:${cleaned}`;
    const ok = await Linking.canOpenURL(url);
    if (!ok) {
      Alert.alert("Cannot open SMS", "SMS is not supported on this device.");
      return;
    }
    await Linking.openURL(url);
  };

  if (!user?.uid) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>Sign in to manage emergency contacts.</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.replace("/(auth)/login")}>
          <Text style={styles.addBtnText}>Go to login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backTxt}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Contacts</Text>
      </View>

      <Text style={styles.help}>
        Contacts are stored in your account. Those with “notify on SOS” are included when you trigger an SOS
        (SMS/push requires backend setup).
      </Text>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editingId ? "Edit contact" : "Add contact"}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholder="Name"
          editable={!saving}
        />
        <TextInput
          value={phone}
          onChangeText={setPhone}
          style={styles.input}
          placeholder="Phone (with country code if needed)"
          keyboardType="phone-pad"
          editable={!saving}
        />
        <TextInput
          value={relationship}
          onChangeText={setRelationship}
          style={styles.input}
          placeholder="Relationship (e.g. Brother)"
          editable={!saving}
        />
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Notify this contact on SOS</Text>
          <Switch value={notifyOnSOS} onValueChange={setNotifyOnSOS} disabled={saving} />
        </View>
        <View style={styles.formActions}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={styles.addBtn}
          >
            <Text style={styles.addBtnText}>
              {saving ? "Saving…" : editingId ? "Update contact" : "Save contact"}
            </Text>
          </TouchableOpacity>
          {editingId ? (
            <TouchableOpacity onPress={resetForm} disabled={saving} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>Cancel edit</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <Text style={styles.listTitle}>Saved contacts ({contacts.length})</Text>
      {loading ? (
        <ActivityIndicator color="#f97316" style={{ marginTop: 16 }} />
      ) : contacts.length === 0 ? (
        <Text style={styles.empty}>No emergency contacts yet. Add one above.</Text>
      ) : (
        contacts.map((contact) => (
          <View key={contact.id} style={styles.contactCard}>
            <Text style={styles.contactName}>{contact.name}</Text>
            <Text style={styles.contactMeta}>
              {contact.relationship} • {contact.phone}
            </Text>
            <Text style={styles.contactStatus}>
              {contact.notifyOnSOS ? "Will receive SOS alerts" : "Notifications disabled"}
            </Text>
            <View style={styles.rowBtns}>
              <TouchableOpacity style={styles.miniBtn} onPress={() => void dial(contact.phone)}>
                <Text style={styles.miniBtnText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.miniBtn} onPress={() => void openSms(contact.phone)}>
                <Text style={styles.miniBtnText}>SMS</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.miniBtnGhost} onPress={() => startEdit(contact)}>
                <Text style={styles.miniBtnGhostText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.miniBtnDanger} onPress={() => handleDelete(contact)}>
                <Text style={styles.miniBtnDangerText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8fafc" },
  container: { padding: 16, paddingTop: 54, paddingBottom: 24 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  back: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  backTxt: { fontSize: 18, fontWeight: "700", color: "#111827" },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#111827" },
  help: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 17,
    marginBottom: 14,
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    padding: 14,
  },
  formTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  switchText: { color: "#374151", fontWeight: "600" },
  formActions: { marginTop: 12, gap: 10 },
  addBtn: {
    backgroundColor: "#f97316",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  addBtnText: { color: "#fff", fontWeight: "800" },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  secondaryBtnText: { color: "#374151", fontWeight: "700" },
  listTitle: { marginTop: 16, fontSize: 17, fontWeight: "700", color: "#111827" },
  empty: { marginTop: 8, color: "#9ca3af" },
  contactCard: {
    marginTop: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f3f4f6",
    borderRadius: 12,
    padding: 12,
  },
  contactName: { color: "#111827", fontSize: 15, fontWeight: "800" },
  contactMeta: { marginTop: 2, color: "#4b5563", fontSize: 13 },
  contactStatus: { marginTop: 5, color: "#9a3412", fontSize: 12, fontWeight: "600" },
  rowBtns: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  miniBtn: {
    backgroundColor: "#ea580c",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  miniBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  miniBtnGhost: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
  },
  miniBtnGhostText: { color: "#334155", fontWeight: "700", fontSize: 12 },
  miniBtnDanger: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
  },
  miniBtnDangerText: { color: "#b91c1c", fontWeight: "700", fontSize: 12 },
});
