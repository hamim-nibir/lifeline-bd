import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";

interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  icon: string;
  level: "Beginner" | "Intermediate";
  backgroundColor: string;
  progress?: number;
  status?: "locked" | "in-progress" | "completed";
  videoCount: number;
  enrolledCount: number;
  onPress: () => void;
  onEnroll?: () => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  id,
  title,
  description,
  icon,
  level,
  backgroundColor,
  progress = 0,
  status = "locked",
  videoCount,
  enrolledCount,
  onPress,
  onEnroll,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor,
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#FF6B00",
      }}
    >
      {/* Course Header */}
      <View style={{ flexDirection: "row", marginBottom: 10 }}>
        <Text style={{ fontSize: 24 }}>{icon}</Text>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: "#1f2937",
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: "#6b7280",
              marginTop: 2,
            }}
          >
            {description}
          </Text>
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              marginTop: 6,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                backgroundColor: level === "Beginner" ? "#DBEAFE" : "#FEF3C7",
                color: level === "Beginner" ? "#0369A1" : "#92400E",
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 4,
                fontWeight: "600",
              }}
            >
              {level}
            </Text>
            <Text
              style={{
                fontSize: 10,
                color: "#6b7280",
              }}
            >
              {videoCount} videos • {(enrolledCount / 1000).toFixed(1)}K enrolled
            </Text>
          </View>
        </View>
      </View>

      {/* Status-specific UI */}
      {status === "locked" && (
        <TouchableOpacity
          onPress={onEnroll}
          style={{
            backgroundColor: "#FF6B00",
            paddingVertical: 12,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#fff",
            }}
          >
            📚 Enroll Now
          </Text>
        </TouchableOpacity>
      )}

      {(status === "in-progress" || status === "completed") && (
        <>
          {/* Progress Bar */}
          <View
            style={{
              backgroundColor: "#fff",
              height: 6,
              borderRadius: 3,
              overflow: "hidden",
              marginBottom: 8,
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${progress}%`,
                backgroundColor: "#FF6B00",
              }}
            />
          </View>

          {/* Progress Text */}
          <Text
            style={{
              fontSize: 12,
              color: "#6b7280",
              fontWeight: "600",
              marginBottom: 12,
            }}
          >
            Progress: {progress}%
          </Text>

          {/* Action Button */}
          <TouchableOpacity
            style={{
              backgroundColor: "#FF6B00",
              paddingVertical: 10,
              borderRadius: 8,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#fff",
              }}
            >
              {status === "completed" ? "✅ Completed" : "▶ Continue Learning"}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </TouchableOpacity>
  );
};
