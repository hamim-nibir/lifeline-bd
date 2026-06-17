import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { FireWizardHeader } from "../../components/fire/FireWizardHeader";
import { FireProgressSteps } from "../../components/fire/FireProgressSteps";
import { FireServiceGridCard } from "../../components/fire/FireServiceGridCard";
import {
  FIRE_SERVICES,
  useFireRequestStore,
  type FireServiceOption,
} from "../../store/fireRequestStore";
import { triggerHaptic } from "../../services/uiHelpers";

export default function FireEmergencyScreen() {
  const router = useRouter();
  const { service, setService } = useFireRequestStore();
  const [selected, setSelected] = useState<FireServiceOption | null>(service);

  const onContinue = async () => {
    if (!selected) return;
    await triggerHaptic("medium");
    setService(selected);
    router.push("/(feat)/fire-details");
  };

  return (
    <View style={styles.root}>
      <FireWizardHeader
        title="Fire Emergency Services"
        subtitle="Select the type of emergency service you need"
        onBack={() => router.back()}
      />
      <FireProgressSteps currentStep={0} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {FIRE_SERVICES.map((s) => (
            <FireServiceGridCard
              key={s.id}
              icon={s.icon}
              title={s.title}
              description={s.desc}
              selected={selected?.id === s.id}
              onPress={() => {
                void triggerHaptic("light");
                setSelected(s);
              }}
            />
          ))}
        </View>

        <Text style={styles.hint}>
          {selected ? `Selected: ${selected.title}` : "Please select a service type to continue"}
        </Text>

        <TouchableOpacity
          style={[styles.continueBtn, !selected && styles.continueBtnDisabled]}
          disabled={!selected}
          onPress={onContinue}
          activeOpacity={0.85}
        >
          <Text style={[styles.continueText, !selected && styles.continueTextDisabled]}>
            Continue
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F6F8" },
  content: { padding: 16, paddingBottom: 32 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 8,
  },
  hint: {
    textAlign: "center",
    color: "#888",
    fontSize: 13,
    marginVertical: 16,
  },
  continueBtn: {
    backgroundColor: "#E67E22",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  continueBtnDisabled: {
    backgroundColor: "#E0E0E0",
  },
  continueText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  continueTextDisabled: {
    color: "#888",
  },
});
