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
    Animated, Easing,
    Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";
import { useAuthStore } from "../../store/authStore";
import { db } from "../../services/firebase";
import { getUserProfile, logoutUser } from "../../services/auth";
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
import AppHeader from "../../components/featHeader";
import { useTranslation } from "../../hooks/useTranslation";
import { interpolate } from "../../i18n/reportHelpers";

type Contact = {
    id: string;
    name: string;
    phone: string;
    whatsapp: string;
    facebook: string;
};
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const EMPTY_FORM = { name: "", phone: "", whatsapp: "", facebook: "" };

export default function WomenSafetyScreen() {
    const router = useRouter();
    const { nickname, user } = useAuthStore();
    const { t } = useTranslation();
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

    // ── Hooks ──
    const headerAnim = useRef(new Animated.Value(0)).current;
    const headerOpacity = useRef(new Animated.Value(1)).current;
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const sidebarAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

    // ── Sidebar open/close ──
    const openSidebar = () => {
        setSidebarVisible(true);
        Animated.timing(sidebarAnim, {
            toValue: 0,
            duration: 320,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    };

    const closeSidebar = () => {
        Animated.timing(sidebarAnim, {
            toValue: SCREEN_WIDTH,
            duration: 280,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
        }).start(() => setSidebarVisible(false));
    };

    const handleLogout = async () => {
        closeSidebar();
        await logoutUser();
        router.replace("/login");
    };

    const handleFeaturePress = (route: string) => {
        router.push(route as any);
    };

    const [savingContact, setSavingContact] = useState(false);

    // verification
    const [profile, setProfile] = useState<any>(null);
    const { showGuard, setShowGuard, requireVerified } = useVerification();

    // ── Fetch profile ──
    useEffect(() => {
        if (!uid) return;
        getUserProfile(uid).then(setProfile).catch(console.error);
    }, [uid]);

    // ── Fetch location on mount ──
    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                Alert.alert(t("common.permissionDenied"), t("reportForm.locationRequired"));
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

    // ── Send Facebook message ──
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
            Alert.alert(t("common.error"), t("services.panic.locationNotReady"));
            return;
        }

        setActivating(true);
        try {
            if (!isActivated) {
                const mapsLink = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;

                // 1. Write to panicAlerts (for dashboard badge count)
                await setDoc(doc(db, "panicAlerts", uid), {
                    uid,
                    nickname: nickname ?? "Unknown",
                    phone: profile?.phone ?? "Not provided",
                    name: profile?.name ?? nickname ?? "Unknown",
                    latitude: location.latitude,
                    longitude: location.longitude,
                    mapsLink,
                    activatedAt: serverTimestamp(),
                    active: true,
                    status: "active",
                });

                // 2. Write to notifications so operators see it ← THIS WAS MISSING
                await addDoc(collection(db, "notifications"), {
                    type: "panicAlert",
                    title: "🆘 Women Safety Panic Alert",
                    body: `${nickname ?? "A user"} has activated panic mode and needs immediate help!`,
                    reportedBy: nickname ?? "Unknown",
                    reportedByUid: uid,
                    citizenName: profile?.name ?? nickname ?? "Unknown",
                    citizenPhone: profile?.phone ?? "Not provided",
                    severity: "high",
                    read: false,
                    resolved: false,
                    assignedVolunteer: null,
                    location: {
                        latitude: location.latitude,
                        longitude: location.longitude,
                        mapsLink,
                    },
                    createdAt: serverTimestamp(),
                });

                setIsActivated(true);
                notifyContacts(location);
                Alert.alert(
                    `🚨 ${t("services.panic.activatedTitle")}`,
                    t("services.panic.activated")
                );
            } else {
                await deleteDoc(doc(db, "panicAlerts", uid));
                setIsActivated(false);
                Alert.alert(t("common.ok"), t("services.panic.deactivated"));
            }
        } catch (err) {
            Alert.alert(t("common.error"), t("services.panic.panicError"));
            console.error(err);
        } finally {
            setActivating(false);
        }
    };

    // ── Emergency call ──
    const handleEmergencyCall = () => {
        Alert.alert(
            "📞 Emergency Call",
            t("services.panic.call999Confirm"),
            [
                { text: t("common.cancel"), style: "cancel" },
                {
                    text: t("services.panic.callNow"),
                    style: "destructive",
                    onPress: () => Linking.openURL("tel:999"),
                },
            ]
        );
    };

    // ── Contact form handlers ──
    const openAddModal = () => {
        if (contacts.length >= 3) {
            Alert.alert(t("common.required"), t("services.panic.contactLimit"));
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
            Alert.alert(t("common.required"), t("services.panic.contactNameRequired"));
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
            Alert.alert(t("common.error"), t("services.panic.contactSaveFailed"));
            console.error(err);
        } finally {
            setSavingContact(false);
        }
    };

    const handleDeleteContact = (contact: Contact) => {
        Alert.alert(
            t("services.panic.deleteContact"),
            t("services.panic.deleteContactConfirm"),
            [
                { text: t("common.cancel"), style: "cancel" },
                {
                    text: t("common.discard"),
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteContactDoc(
                                doc(db, "users", uid, "importantContacts", contact.id)
                            );
                            await fetchContacts();
                        } catch (err) {
                            Alert.alert(t("common.error"), t("services.panic.deleteFailed"));
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>

            {/* Header */}
            <AppHeader
                headerAnim={headerAnim}
                headerOpacity={headerOpacity}
                onOpenSidebar={openSidebar}
            />

            {/* ── Scrollable Main Content ── */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero */}
                <View style={{
                    backgroundColor: "#c4451a",
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                }}>
                    <View style={{
                        width: 38, height: 38, borderRadius: 9,
                        backgroundColor: "rgba(255,255,255,0.2)",
                        alignItems: "center", justifyContent: "center", marginBottom: 8,
                    }}>
                        <Text style={{ fontSize: 18 }}>🛡️</Text>
                    </View>
                    <Text style={{ color: "#fff", fontSize: 20, fontWeight: "900", lineHeight: 24 }}>
                        {t("services.panic.title")}
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 4 }}>
                        {t("services.panic.subtitle")}
                    </Text>
                </View>

                {/* Verification warning */}
                {profile && profile.verificationStatus !== "verified" && (
                    <View style={{
                        backgroundColor: "#fff7ed", borderWidth: 1, borderColor: "#fed7aa",
                        borderRadius: 12, padding: 12, marginBottom: 12,
                        flexDirection: "row", alignItems: "center", gap: 10,
                    }}>
                        <Text style={{ fontSize: 18 }}>⚠️</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: "#92400e", fontWeight: "700", fontSize: 13 }}>
                                {t("services.panic.notVerified")}
                            </Text>
                            <Text style={{ color: "#b45309", fontSize: 12, marginTop: 2 }}>
                                {t("services.panic.verifyToActivate")}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => router.push("/(tabs)/profile" as any)}
                            style={{
                                backgroundColor: "#c4451a", borderRadius: 8,
                                paddingHorizontal: 10, paddingVertical: 5,
                            }}
                        >
                            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{t("profile.verify")}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Activate Button */}
                <View style={{ alignItems: "center", marginBottom: 12 }}>
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
                                    {isActivated ? t("services.panic.deactivate") : t("services.panic.activate")}
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
                            ? `🚨 ${t("services.panic.activeStatus")}`
                            : profile?.verificationStatus !== "verified"
                                ? `🔒 ${t("services.panic.verifyToUse")}`
                                : t("services.panic.tapToActivate")}
                    </Text>
                </View>

                {/* Map */}
                <View style={{
                    height: 200,
                    borderRadius: 20,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    marginBottom: 12,
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
                                {t("services.panic.fetchingLocation")}
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
                                title={t("services.panic.yourLocation")}
                                description={nickname ?? t("services.panic.youAreHere")}
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
                                {t("services.panic.locationUnavailable")}
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
                                {t("services.panic.importantContacts")}
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
                                    {t("services.panic.noContactsYet")}
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
                                                    {t("common.edit")}
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
                                                    {t("common.delete")}
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
                                        + {t("services.panic.addContact")}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
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
                            {editingContact ? t("services.panic.editContact") : t("services.panic.addImportantContact")}
                        </Text>

                        <Text style={labelStyle}>{t("services.panic.name")}</Text>
                        <TextInput
                            style={inputStyle}
                            placeholder={t("report.placeholders.fullName")}
                            value={form.name}
                            onChangeText={(text) => setForm({ ...form, name: text })}
                        />

                        <Text style={labelStyle}>{t("services.panic.phone")}</Text>
                        <TextInput
                            style={inputStyle}
                            placeholder={t("report.placeholders.phone")}
                            keyboardType="phone-pad"
                            value={form.phone}
                            onChangeText={(text) => setForm({ ...form, phone: text })}
                        />

                        <Text style={labelStyle}>{t("services.panic.whatsapp")}</Text>
                        <TextInput
                            style={inputStyle}
                            placeholder="01XXXXXXXXX (with country code)"
                            keyboardType="phone-pad"
                            value={form.whatsapp}
                            onChangeText={(text) => setForm({ ...form, whatsapp: text })}
                        />

                        <Text style={labelStyle}>{t("services.panic.facebook")}</Text>
                        <TextInput
                            style={inputStyle}
                            placeholder="https://facebook.com/username"
                            keyboardType="url"
                            autoCapitalize="none"
                            value={form.facebook}
                            onChangeText={(text) => setForm({ ...form, facebook: text })}
                        />

                        <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                            <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                style={{
                                    flex: 1, backgroundColor: "#f3f4f6",
                                    borderRadius: 12, paddingVertical: 14, alignItems: "center",
                                }}
                            >
                                <Text style={{ color: "#374151", fontWeight: "600" }}>{t("common.cancel")}</Text>
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
                                    <Text style={{ color: "#fff", fontWeight: "700" }}>{t("services.panic.save")}</Text>
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