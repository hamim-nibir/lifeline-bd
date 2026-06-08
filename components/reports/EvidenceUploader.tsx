import { View, Text, TouchableOpacity, Image, ScrollView, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import type { LocalEvidenceFile } from "../../services/reportEvidenceUpload";
import { useTranslation } from "../../hooks/useTranslation";
import { interpolate } from "../../i18n/reportHelpers";

type Props = {
  files: LocalEvidenceFile[];
  onChange: (files: LocalEvidenceFile[]) => void;
  accent?: string;
};

export default function EvidenceUploader({ files, onChange, accent = "#c4451a" }: Props) {
  const { t } = useTranslation();

  const addFiles = (newFiles: LocalEvidenceFile[]) => {
    onChange([...files, ...newFiles]);
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  const pickGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("common.required"), t("evidence.permissionPhotos"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (result.canceled) return;
    const picked: LocalEvidenceFile[] = result.assets.map((a, i) => ({
      uri: a.uri,
      fileName: a.fileName ?? `media_${Date.now()}_${i}.jpg`,
      mimeType: a.mimeType ?? (a.type === "video" ? "video/mp4" : "image/jpeg"),
      kind: a.type === "video" ? "video" : "image",
    }));
    addFiles(picked);
  };

  const pickCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("common.required"), t("evidence.permissionCamera"));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.85,
    });
    if (result.canceled) return;
    const a = result.assets[0];
    addFiles([{
      uri: a.uri,
      fileName: a.fileName ?? `camera_${Date.now()}.jpg`,
      mimeType: a.mimeType ?? "image/jpeg",
      kind: a.type === "video" ? "video" : "image",
    }]);
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const picked: LocalEvidenceFile[] = result.assets.map((a) => ({
      uri: a.uri,
      fileName: a.name ?? `document_${Date.now()}`,
      mimeType: a.mimeType ?? "application/octet-stream",
      kind: "document",
    }));
    addFiles(picked);
  };

  const showPicker = () => {
    Alert.alert(t("evidence.attachTitle"), t("evidence.attachBody"), [
      { text: t("evidence.gallery"), onPress: pickGallery },
      { text: t("evidence.camera"), onPress: pickCamera },
      { text: t("evidence.document"), onPress: pickDocument },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  };

  return (
    <View>
      <TouchableOpacity
        onPress={showPicker}
        style={{
          borderWidth: 2,
          borderStyle: "dashed",
          borderColor: `${accent}60`,
          borderRadius: 14,
          paddingVertical: 22,
          alignItems: "center",
          backgroundColor: `${accent}08`,
        }}
      >
        <Text style={{ fontSize: 28, marginBottom: 6 }}>📎</Text>
        <Text style={{ fontWeight: "800", color: accent, fontSize: 14 }}>{t("evidence.attachTitle")}</Text>
        <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
          {t("evidence.attachBody")}
        </Text>
      </TouchableOpacity>

      {files.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: "700", color: "#374151", marginBottom: 8 }}>
            {interpolate(t("evidence.files"), { count: String(files.length) })}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {files.map((f, i) => (
              <View
                key={`${f.uri}-${i}`}
                style={{
                  marginRight: 10,
                  width: 100,
                  borderRadius: 10,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  backgroundColor: "#fff",
                }}
              >
                {f.kind === "image" ? (
                  <Image source={{ uri: f.uri }} style={{ width: 100, height: 80 }} resizeMode="cover" />
                ) : (
                  <View style={{
                    width: 100, height: 80, backgroundColor: "#f3f4f6",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Text style={{ fontSize: 28 }}>{f.kind === "video" ? "🎬" : "📄"}</Text>
                  </View>
                )}
                <Text
                  numberOfLines={2}
                  style={{ fontSize: 9, padding: 4, color: "#6b7280" }}
                >
                  {f.fileName}
                </Text>
                <TouchableOpacity
                  onPress={() => removeFile(i)}
                  style={{
                    position: "absolute", top: 4, right: 4,
                    backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 10,
                    width: 20, height: 20, alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
