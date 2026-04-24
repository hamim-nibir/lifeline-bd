import { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
    TextInput,
    Linking,
    Modal,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";
import { useAuthStore } from "../../store/authStore";
import { db } from "../../services/firebase";
import { getUserProfile } from "../../services/auth";
import {
    doc,
    setDoc,
    deleteDoc,
    serverTimestamp,
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc as deleteContactDoc,
} from "firebase/firestore";

import VerificationGuard from "../../components/ui/VerificationGuard";
import { useVerification } from "../../hooks/useVerification";
import Logo from "../../components/ui/logo";

type Contact = {
    id: string;
    name: string;
    phone: string;
    whatsapp: string;
    facebook: string;
};

const EMPTY_FORM = { name: "", phone: "", whatsapp: "", facebook: "" };

export default function WomenSafetyScreen() {
    const router = useRouter();
    const { nickname, user } = useAuthStore();
    const uid = user?.uid ?? "";
    const mapRef = useRef<MapView>(null);

    const [location, setLocation] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);
    const [isActivated, setIsActivated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activating, setActivating] = useState(false);

    // contacts state
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [contactsExpanded, setContactsExpanded] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [savingContact, setSavingContact] = useState(false);

        // verification
        const [profile, setProfile] = useState<any>(null);
        const { showGuard, setShowGuard, requireVerified } = useVerification();
    
        // ── Fetch profile to check verification status ──
        useEffect(() => {
            if (!uid) return;
            getUserProfile(uid).then(setProfile).catch(console.error);
        }, [uid]);

    // ── Fetch location on mount ──
    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permission Denied", "Location permission is required.");
                setLoading(false);
                return;
            }
            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            setLocation({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            });
            setLoading(false);
        })();
    }, []);

    // ── Fetch contacts from Firestore ──
    useEffect(() => {
        if (!uid) return;
        fetchContacts();
    }, [uid]);

    const fetchContacts = async () => {
        try {
            const snap = await getDocs(
                collection(db, "users", uid, "importantContacts")
            );
            const list: Contact[] = snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as Omit<Contact, "id">),
            }));
            setContacts(list);
        } catch (err) {
            console.error("Failed to fetch contacts:", err);
        }
    };

    // ── Send WhatsApp message ──
    const sendWhatsApp = (phone: string, message: string) => {
        const cleaned = phone.replace(/\D/g, "");
        const url = `whatsapp://send?phone=${cleaned}&text=${encodeURIComponent(message)}`;
        Linking.openURL(url).catch(() =>
            console.log("WhatsApp not available for:", phone)
        );
    };

    // ── Send Facebook message (opens messenger) ──
    const sendFacebook = (profileUrl: string, message: string) => {
        if (!profileUrl) return;
        Linking.openURL(profileUrl).catch(() =>
            console.log("Could not open Facebook:", profileUrl)
        );
    };

    // ── Notify all contacts ──
    const notifyContacts = (loc: { latitude: number; longitude: number }) => {
        const message =
            `🚨 EMERGENCY ALERT 🚨\n` +
            `${nickname ?? "Someone"} has activated Women Safety Panic Mode!\n` +
            `📍 Location: https://maps.google.com/?q=${loc.latitude},${loc.longitude}\n` +
            `Please check on them immediately!`;

        contacts.forEach((contact) => {
            if (contact.whatsapp) sendWhatsApp(contact.whatsapp, message);
            if (contact.facebook) sendFacebook(contact.facebook, message);
        });
    };

    // ── Activate / Deactivate panic ──
    const handleTogglePanic = async () => {
        if (!location) {
            Alert.alert("Location not ready", "Please wait for your location to load.");
            return;
        }

        setActivating(true);
        try {
            if (!isActivated) {
                await setDoc(doc(db, "panicAlerts", uid), {
                    uid,
                    nickname: nickname ?? "Unknown",
                    latitude: location.latitude,
                    longitude: location.longitude,
                    activatedAt: serverTimestamp(),
                    active: true,
                    status: "active",
                });
                setIsActivated(true);
                notifyContacts(location);
                Alert.alert(
                    "🚨 Panic Mode Activated",
                    "Your location has been shared and contacts notified!"
                );
            } else {
                await deleteDoc(doc(db, "panicAlerts", uid));
                setIsActivated(false);
                Alert.alert("Deactivated", "Panic mode has been turned off.");
            }
        } catch (err) {
            Alert.alert("Error", "Something went wrong. Please try again.");
            console.error(err);
        } finally {
            setActivating(false);
        }
    };

    // ── Emergency call ──
    const handleEmergencyCall = () => {
        Alert.alert(
            "📞 Emergency Call",
            "This will call 999. Are you sure?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Call Now",
                    style: "destructive",
                    onPress: () => Linking.openURL("tel:999"),
                },
            ]
        );
    };

    // ── Contact form handlers ──
    const openAddModal = () => {
        if (contacts.length >= 3) {
            Alert.alert("Limit Reached", "You can only add up to 3 important contacts.");
            return;
        }
        setEditingContact(null);
        setForm(EMPTY_FORM);
        setModalVisible(true);
    };

    const openEditModal = (contact: Contact) => {
        setEditingContact(contact);
        setForm({
            name: contact.name,
            phone: contact.phone,
            whatsapp: contact.whatsapp,
            facebook: contact.facebook,
        });
        setModalVisible(true);
    };

    const handleSaveContact = async () => {
        if (!form.name.trim()) {
            Alert.alert("Required", "Please enter a contact name.");
            return;
        }
        setSavingContact(true);
        try {
            if (editingContact) {
                await updateDoc(
                    doc(db, "users", uid, "importantContacts", editingContact.id),
                    { ...form }
                );
            } else {
                await addDoc(
                    collection(db, "users", uid, "importantContacts"),
                    { ...form }
                );
            }
            await fetchContacts();
            setModalVisible(false);
        } catch (err) {
            Alert.alert("Error", "Could not save contact.");
            console.error(err);
        } finally {
            setSavingContact(false);
        }
    };

    const handleDeleteContact = (contact: Contact) => {
        Alert.alert(
            "Delete Contact",
            `Remove ${contact.name} from important contacts?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteContactDoc(
                                doc(db, "users", uid, "importantContacts", contact.id)
                            );
                            await fetchContacts();
                        } catch (err) {
                            Alert.alert("Error", "Could not delete contact.");
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>

            {/* Header */}
            <View style={{
                backgroundColor: "#f97316", paddingTop: 56, paddingBottom: 20,
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
                <View>
                    <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>Safety Panic Mode</Text>
                    <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 1 }}>
                        Activate panic mode to alert emergency services
                    </Text>
                </View>
            </View>

            {/* ── Scrollable Main Content ── */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Verification warning banner — shown only if not verified */}
                {profile && profile.verificationStatus !== "verified" && (
                    <View style={{
                        backgroundColor: "#fff7ed",
                        borderWidth: 1,
                        borderColor: "#fed7aa",
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 16,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                    }}>
                        <Text style={{ fontSize: 18 }}>⚠️</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: "#92400e", fontWeight: "700", fontSize: 13 }}>
                                Account not verified
                            </Text>
                            <Text style={{ color: "#b45309", fontSize: 12, marginTop: 2 }}>
                                Verify your account to activate panic mode
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => router.push("/(tabs)/profile" as any)}
                            style={{
                                backgroundColor: "#f97316",
                                borderRadius: 8,
                                paddingHorizontal: 10,
                                paddingVertical: 5,
                            }}
                        >
                            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
                                Verify
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Activate Button */}
                <View style={{ alignItems: "center", marginBottom: 24 }}>
                    <TouchableOpacity
                        onPress={() => requireVerified(profile, handleTogglePanic)}
                        disabled={activating || loading}
                        style={{
                            backgroundColor: isActivated ? "#dc2626" : "#f97316",
                            width: 160,
                            height: 160,
                            borderRadius: 80,
                            alignItems: "center",
                            justifyContent: "center",
                            elevation: 8,
                            shadowColor: isActivated ? "#dc2626" : "#f97316",
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.4,
                            shadowRadius: 10,
                            borderWidth: 5,
                            borderColor: isActivated ? "#fca5a5" : "#fed7aa",
                            opacity: profile?.verificationStatus !== "verified" ? 0.6 : 1,
                        }}
                        activeOpacity={0.85}
                    >
                        {activating ? (
                            <ActivityIndicator color="#fff" size="large" />
                        ) : (
                            <>
                                <Text style={{ fontSize: 40 }}>
                                    {profile?.verificationStatus !== "verified"
                                        ? "🔒"
                                        : isActivated ? "🚨" : "🛡️"}
                                </Text>
                                <Text style={{
                                    color: "#fff",
                                    fontWeight: "800",
                                    fontSize: 16,
                                    marginTop: 6,
                                }}>
                                    {isActivated ? "DEACTIVATE" : "ACTIVATE"}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <Text style={{
                        color: isActivated ? "#dc2626" : "#6b7280",
                        fontWeight: "600",
                        fontSize: 13,
                        marginTop: 12,
                        textAlign: "center",
                    }}>
                        {isActivated
                            ? "🚨 Panic mode is ACTIVE — contacts notified!"
                            : profile?.verificationStatus !== "verified"
                                ? "🔒 Verify your account to use this feature"
                                : "Tap to activate emergency panic mode"}
                    </Text>
                </View>

                {/* Map */}
                <View style={{
                    height: 200,
                    borderRadius: 20,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    marginBottom: 16,
                }}>
                    {loading ? (
                        <View style={{
                            flex: 1,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#f3f4f6",
                        }}>
                            <ActivityIndicator size="large" color="#f97316" />
                            <Text style={{ color: "#6b7280", marginTop: 12, fontSize: 14 }}>
                                Fetching your location...
                            </Text>
                        </View>
                    ) : location ? (
                        <MapView
                            ref={mapRef}
                            style={{ flex: 1 }}
                            initialRegion={{
                                latitude: location.latitude,
                                longitude: location.longitude,
                                latitudeDelta: 0.005,
                                longitudeDelta: 0.005,
                            }}
                            showsUserLocation
                            showsMyLocationButton
                        >
                            <Marker
                                coordinate={location}
                                title="Your Location"
                                description={nickname ?? "You are here"}
                                pinColor={isActivated ? "red" : "orange"}
                            />
                        </MapView>
                    ) : (
                        <View style={{
                            flex: 1,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#fef2f2",
                        }}>
                            <Text style={{ fontSize: 32 }}>📍</Text>
                            <Text style={{ color: "#dc2626", fontWeight: "600", marginTop: 8 }}>
                                Location unavailable
                            </Text>
                        </View>
                    )}
                </View>

                {/* ── Important Contacts Dropdown ── */}
                <View style={{
                    backgroundColor: "#fff",
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    marginBottom: 16,
                    overflow: "hidden",
                }}>
                    <TouchableOpacity
                        onPress={() => setContactsExpanded(!contactsExpanded)}
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: 16,
                            backgroundColor: "#fff7ed",
                        }}
                        activeOpacity={0.8}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Text style={{ fontSize: 18 }}>👥</Text>
                            <Text style={{ color: "#9a3412", fontWeight: "700", fontSize: 15 }}>
                                Important Contacts
                            </Text>
                            <View style={{
                                backgroundColor: "#f97316",
                                borderRadius: 10,
                                paddingHorizontal: 7,
                                paddingVertical: 2,
                            }}>
                                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
                                    {contacts.length}/3
                                </Text>
                            </View>
                        </View>
                        <Text style={{ fontSize: 18, color: "#9a3412" }}>
                            {contactsExpanded ? "▲" : "▼"}
                        </Text>
                    </TouchableOpacity>

                    {contactsExpanded && (
                        <View style={{ padding: 12 }}>
                            {contacts.length === 0 ? (
                                <Text style={{
                                    color: "#9ca3af", fontSize: 13,
                                    textAlign: "center", paddingVertical: 8,
                                }}>
                                    No important contacts added yet.
                                </Text>
                            ) : (
                                contacts.map((contact) => (
                                    <View
                                        key={contact.id}
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            paddingVertical: 10,
                                            paddingHorizontal: 4,
                                            borderBottomWidth: 1,
                                            borderBottomColor: "#f3f4f6",
                                        }}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: "#1f2937", fontWeight: "700", fontSize: 14 }}>
                                                {contact.name}
                                            </Text>
                                            {contact.phone ? (
                                                <Text style={{ color: "#6b7280", fontSize: 12 }}>
                                                    📞 {contact.phone}
                                                </Text>
                                            ) : null}
                                        </View>
                                        <View style={{ flexDirection: "row", gap: 8 }}>
                                            <TouchableOpacity
                                                onPress={() => openEditModal(contact)}
                                                style={{
                                                    backgroundColor: "#eff6ff",
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 6,
                                                    borderRadius: 8,
                                                }}
                                            >
                                                <Text style={{ color: "#2563eb", fontSize: 12, fontWeight: "600" }}>
                                                    Edit
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => handleDeleteContact(contact)}
                                                style={{
                                                    backgroundColor: "#fef2f2",
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 6,
                                                    borderRadius: 8,
                                                }}
                                            >
                                                <Text style={{ color: "#dc2626", fontSize: 12, fontWeight: "600" }}>
                                                    Delete
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))
                            )}
                            {contacts.length < 3 && (
                                <TouchableOpacity
                                    onPress={openAddModal}
                                    style={{
                                        marginTop: 10,
                                        backgroundColor: "#f97316",
                                        borderRadius: 10,
                                        paddingVertical: 10,
                                        alignItems: "center",
                                    }}
                                >
                                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                                        + Add Contact
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>

                {/* ── Emergency Call Button ── */}
                <TouchableOpacity
                    onPress={handleEmergencyCall}
                    style={{
                        backgroundColor: "#dc2626",
                        borderRadius: 16,
                        paddingVertical: 18,
                        alignItems: "center",
                        flexDirection: "row",
                        justifyContent: "center",
                        gap: 10,
                        elevation: 4,
                        shadowColor: "#dc2626",
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.3,
                        shadowRadius: 6,
                    }}
                    activeOpacity={0.85}
                >
                    <Text style={{ fontSize: 24 }}>📞</Text>
                    <View>
                        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
                            Emergency Call
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>
                            Calls 999 immediately
                        </Text>
                    </View>
                </TouchableOpacity>
            </ScrollView>

            {/* ── Contact Form Modal ── */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    justifyContent: "flex-end",
                }}>
                    <View style={{
                        backgroundColor: "#fff",
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        padding: 24,
                        paddingBottom: 40,
                    }}>
                        <Text style={{ fontSize: 18, fontWeight: "700", color: "#1f2937", marginBottom: 20 }}>
                            {editingContact ? "Edit Contact" : "Add Important Contact"}
                        </Text>

                        <Text style={labelStyle}>Name</Text>
                        <TextInput
                            style={inputStyle}
                            placeholder="Full name"
                            value={form.name}
                            onChangeText={(t) => setForm({ ...form, name: t })}
                        />

                        <Text style={labelStyle}>Phone Number</Text>
                        <TextInput
                            style={inputStyle}
                            placeholder="01XXXXXXXXX"
                            keyboardType="phone-pad"
                            value={form.phone}
                            onChangeText={(t) => setForm({ ...form, phone: t })}
                        />

                        <Text style={labelStyle}>WhatsApp Number</Text>
                        <TextInput
                            style={inputStyle}
                            placeholder="01XXXXXXXXX (with country code)"
                            keyboardType="phone-pad"
                            value={form.whatsapp}
                            onChangeText={(t) => setForm({ ...form, whatsapp: t })}
                        />

                        <Text style={labelStyle}>Facebook Profile Link</Text>
                        <TextInput
                            style={inputStyle}
                            placeholder="https://facebook.com/username"
                            keyboardType="url"
                            autoCapitalize="none"
                            value={form.facebook}
                            onChangeText={(t) => setForm({ ...form, facebook: t })}
                        />

                        <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
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
                                onPress={handleSaveContact}
                                disabled={savingContact}
                                style={{
                                    flex: 1, backgroundColor: "#f97316",
                                    borderRadius: 12, paddingVertical: 14, alignItems: "center",
                                }}
                            >
                                {savingContact ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={{ color: "#fff", fontWeight: "700" }}>Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── Verification Guard Popup ── */}
            <VerificationGuard
                visible={showGuard}
                onClose={() => setShowGuard(false)}
                featureName="Women Safety Panic Mode"
            />
        </View>
    );
}

// ── Styles ──
const labelStyle = {
    color: "#374151",
    fontSize: 13,
    fontWeight: "600" as const,
    marginBottom: 6,
    marginTop: 12,
};

const inputStyle = {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1f2937",
};