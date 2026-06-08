import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { FireWizardHeader } from "../../components/fire/FireWizardHeader";
import { FireProgressSteps } from "../../components/fire/FireProgressSteps";
import {
  useFireRequestStore,
  isValidBdPhone,
  type FireSeverity,
} from "../../store/fireRequestStore";
import { triggerHaptic } from "../../services/uiHelpers";
import { useAuthStore } from "../../store/authStore";

const SEVERITY_OPTIONS: Array<{
  key: FireSeverity;
  label: string;
  description: string;
  color: string;
  bg: string;
}> = [
  {
    key: "critical",
    label: "Critical",
    description: "Life-threatening emergency, immediate response needed",
    color: "#fff",
    bg: "#DC2626",
  },
  {
    key: "high",
    label: "High",
    description: "Serious situation, urgent response required",
    color: "#C2410C",
    bg: "#FFEDD5",
  },
  {
    key: "medium",
    label: "Medium",
    description: "Moderate emergency, prompt response needed",
    color: "#A16207",
    bg: "#FEF9C3",
  },
];

const NOTES_MAX = 500;

export default function FireDetailsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { service, severityLevel, contactNumber, peopleAffected, notes, setDetails } =
    useFireRequestStore();

  const [phone, setPhone] = useState(contactNumber);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [severity, setSeverity] = useState<FireSeverity>(severityLevel);
  const [people, setPeople] = useState<number | null>(peopleAffected);
  const [extraNotes, setExtraNotes] = useState(notes);

  useEffect(() => {
    if (!service) {
      router.replace("/(feat)/fire-emergency");
    }
  }, [service, router]);

  const phoneInvalid = phoneTouched && phone.length > 0 && !isValidBdPhone(phone);
  const canContinue = isValidBdPhone(phone);

  const onContinue = async () => {
    if (!canContinue) {
      setPhoneTouched(true);
      return;
    }
    if (!user?.uid) {
      router.replace("/(auth)/login");
      return;
    }
    await triggerHaptic("medium");
    setDetails({
      severityLevel: severity,
      contactNumber: phone.replace(/\D/g, ""),
      peopleAffected: people,
      notes: extraNotes.trim(),
    });
    router.push("/(feat)/fire-location");
  };

  if (!service) return null;

  return (
    <View style={styles.root}>
      <FireWizardHeader
        title="Incident Details"
        subtitle="Provide details for emergency responders"
        backLabel="← Back"
        onBack={() => router.back()}
      />
      <FireProgressSteps currentStep={1} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Emergency Severity Level <Text style={styles.required}>*</Text>
          </Text>
          {SEVERITY_OPTIONS.map((opt) => {
            const active = severity === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.severityCard,
                  { backgroundColor: active ? opt.bg : "#FAFAFA" },
                  active && opt.key === "critical" && styles.severityCardCritical,
                ]}
                onPress={() => setSeverity(opt.key)}
              >
                <Text style={[styles.severityLabel, { color: active && opt.key === "critical" ? "#fff" : "#222" }]}>
                  {opt.label}
                </Text>
                <Text style={[styles.severityDesc, { color: active && opt.key === "critical" ? "rgba(255,255,255,0.9)" : "#666" }]}>
                  {opt.description}
                </Text>
              </TouchableOpacity>
            );
          })}

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
            📞 Your Contact Number <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, phoneInvalid && styles.inputError]}
            placeholder="01XXXXXXXXX"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            onBlur={() => setPhoneTouched(true)}
            maxLength={11}
          />
          {phoneInvalid && (
            <Text style={styles.errorText}>⚠ Please enter a valid phone number</Text>
          )}

          <View style={styles.optionalRow}>
            <Text style={styles.sectionTitle}>👥 Number of People Affected</Text>
            <Text style={styles.optional}>Optional</Text>
          </View>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setPeople((p) => (p == null ? 0 : Math.max(0, p - 1)))}
            >
              <Text style={styles.stepperBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepperValue}>
              {people == null ? "Unknown" : String(people)}
            </Text>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setPeople((p) => (p == null ? 1 : p + 1))}
            >
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.unknownBtn} onPress={() => setPeople(null)}>
              <Text style={styles.unknownBtnText}>Unknown</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.optionalRow}>
            <Text style={styles.sectionTitle}>📋 Additional Critical Information</Text>
            <Text style={styles.optional}>Optional</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="E.g., trapped persons, children, elderly, fire location details..."
            multiline
            value={extraNotes}
            onChangeText={(t) => setExtraNotes(t.slice(0, NOTES_MAX))}
            textAlignVertical="top"
          />
          <View style={styles.notesFooter}>
            <Text style={styles.notesHint}>Optional — Any urgent details for responders</Text>
            <Text style={styles.notesHint}>{NOTES_MAX - extraNotes.length} characters remaining</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, !canContinue && styles.primaryBtnDisabled]}
          disabled={!canContinue}
          onPress={onContinue}
        >
          <Text style={styles.primaryBtnText}>Continue to Location →</Text>
        </TouchableOpacity>
        <Text style={styles.footerNote}>📍 Your location will be shared with emergency services</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F6F8" },
  content: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#222", marginBottom: 10 },
  required: { color: "#DC2626" },
  severityCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  severityCardCritical: { borderColor: "#DC2626" },
  severityLabel: { fontSize: 15, fontWeight: "800", marginBottom: 4 },
  severityDesc: { fontSize: 12, lineHeight: 17 },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "#FAFAFA",
    marginBottom: 6,
  },
  inputError: { borderColor: "#DC2626" },
  errorText: { color: "#DC2626", fontSize: 12, marginBottom: 12 },
  optionalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  optional: { fontSize: 11, color: "#999", fontWeight: "600" },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnText: { fontSize: 22, color: "#555", fontWeight: "600" },
  stepperValue: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  unknownBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#FFF3E6",
  },
  unknownBtnText: { color: "#E67E22", fontWeight: "700", fontSize: 12 },
  textArea: { minHeight: 100 },
  notesFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  notesHint: { fontSize: 11, color: "#999" },
  primaryBtn: {
    backgroundColor: "#E67E22",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  footerNote: {
    textAlign: "center",
    color: "#888",
    fontSize: 12,
    marginTop: 12,
  },
});
