import { ScrollView, Text, TouchableOpacity, View } from "react-native";

const COMMUNITY_CARDS = [
  {
    icon: "🧑‍🚒",
    title: "Volunteer Responder",
    desc: "Join emergency response team",
    action: "Find",
  },
  {
    icon: "📖",
    title: "Training Resources",
    desc: "Learn emergency response skills",
    action: "Learn More",
  },
];

const ALERTS = [
  { title: "Community Meeting", time: "2 hours ago" },
  { title: "Safety Drill Camp", time: "5 hours ago" },
  { title: "Training Session", time: "1 day ago" },
];

const TIPS = [
  "Always keep emergency contacts handy",
  "Know your nearest hospital and police station",
  "Keep a first aid kit at home",
  "Learn basic first aid and CPR",
  "Stay informed about local emergency procedures",
];

const FIRST_AID = [
  {
    title: "CPR (Cardiopulmonary Resuscitation)",
    steps: [
      "Call emergency services (999) immediately",
      "Place person on firm, flat surface",
      "Place heel of hand on center of chest",
      "Push hard and fast, 100-120 compressions/min",
    ],
  },
  {
    title: "Heimlich Maneuver (Choking)",
    steps: [
      "Stand behind the person",
      "Make a fist above the navel",
      "Grasp fist and thrust inward/upward",
      "Repeat until object is dislodged",
    ],
  },
  {
    title: "Bleeding Control",
    steps: [
      "Apply direct pressure with clean cloth",
      "Maintain pressure for 10-15 minutes",
      "Elevate injured area if possible",
      "Seek medical help for severe bleeding",
    ],
  },
];

export default function CommunityScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f9fafb" }} contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
      <Text style={{ color: "#111827", fontSize: 32 / 1.5, fontWeight: "800" }}>Community Support</Text>
      <Text style={{ color: "#6b7280", marginTop: 4 }}>Help and support your community</Text>

      <View style={{ marginTop: 14, gap: 10 }}>
        {COMMUNITY_CARDS.map((item) => (
          <View
            key={item.title}
            style={{
              backgroundColor: "#fff",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#e5e7eb",
              padding: 14,
            }}
          >
            <Text style={{ fontSize: 22 }}>{item.icon}</Text>
            <Text style={{ marginTop: 8, color: "#111827", fontWeight: "800", fontSize: 18 / 1.5 }}>{item.title}</Text>
            <Text style={{ color: "#6b7280", fontSize: 12 }}>{item.desc}</Text>
            <TouchableOpacity
              style={{
                marginTop: 12,
                backgroundColor: "#ea580c",
                borderRadius: 10,
                paddingVertical: 9,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>{item.action}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={{ marginTop: 14, gap: 10 }}>
        <View style={{ backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e5e7eb", padding: 14 }}>
          <Text style={{ color: "#111827", fontWeight: "800", fontSize: 18 / 1.5 }}>Community Alerts</Text>
          <View style={{ marginTop: 10, gap: 8 }}>
            {ALERTS.map((a) => (
              <View key={a.title} style={{ backgroundColor: "#f0fdf4", borderRadius: 10, padding: 10 }}>
                <Text style={{ color: "#111827", fontWeight: "700" }}>{a.title}</Text>
                <Text style={{ color: "#6b7280", fontSize: 12 }}>{a.time}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#e5e7eb", padding: 14 }}>
          <Text style={{ color: "#111827", fontWeight: "800", fontSize: 18 / 1.5 }}>Safety Tips</Text>
          <View style={{ marginTop: 10, gap: 8 }}>
            {TIPS.map((tip) => (
              <Text key={tip} style={{ color: "#4b5563", fontSize: 13 }}>
                • {tip}
              </Text>
            ))}
          </View>
        </View>
      </View>

      <Text style={{ textAlign: "center", marginTop: 16, color: "#111827", fontSize: 30 / 1.5, fontWeight: "800" }}>
        First Aid Guidance
      </Text>
      <Text style={{ textAlign: "center", color: "#6b7280", fontSize: 12, marginTop: 3 }}>
        Essential emergency medical skills that can save lives
      </Text>

      <View style={{ marginTop: 10, gap: 10 }}>
        {FIRST_AID.map((item) => (
          <View
            key={item.title}
            style={{
              backgroundColor: "#fff",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#f1f5f9",
              padding: 14,
            }}
          >
            <Text style={{ color: "#111827", fontWeight: "800", fontSize: 16 / 1.5 }}>{item.title}</Text>
            <View style={{ marginTop: 8, gap: 4 }}>
              {item.steps.map((step, idx) => (
                <Text key={step} style={{ color: "#4b5563", fontSize: 12 }}>
                  {idx + 1}. {step}
                </Text>
              ))}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
