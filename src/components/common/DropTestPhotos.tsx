import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import Alert from "@/utils/alert";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";

import colors from "@/theme/colors";

interface DropTestPhotosProps {
  photo1: DocumentPicker.DocumentPickerAsset | null;
  photo2: DocumentPicker.DocumentPickerAsset | null;
  onChange1: (asset: DocumentPicker.DocumentPickerAsset | null) => void;
  onChange2: (asset: DocumentPicker.DocumentPickerAsset | null) => void;
}

const pickImage = async (onPicked: (asset: DocumentPicker.DocumentPickerAsset) => void) => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: "image/*",
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;
    onPicked(result.assets[0]);
  } catch (error) {
    console.warn("Failed to pick drop-test photo:", error);
    Alert.alert("Error", "Could not open the file picker.");
  }
};

const PhotoSlot = ({
  label,
  photo,
  onPick,
  onRemove,
}: {
  label: string;
  photo: DocumentPicker.DocumentPickerAsset | null;
  onPick: () => void;
  onRemove: () => void;
}) => (
  <View style={styles.slot}>
    <Text style={styles.slotLabel}>{label}*</Text>
    {photo ? (
      <View style={styles.previewContainer}>
        <Image source={{ uri: photo.uri }} style={styles.previewImage} />
        <Pressable style={styles.removeBtn} onPress={onRemove}>
          <Feather name="x" size={14} color={colors.white} />
        </Pressable>
      </View>
    ) : (
      <Pressable style={styles.uploadBtn} onPress={onPick}>
        <Feather name="camera" size={22} color="#9CA3AF" />
        <Text style={styles.uploadBtnText}>Add photo</Text>
      </Pressable>
    )}
  </View>
);

export default function DropTestPhotos({ photo1, photo2, onChange1, onChange2 }: DropTestPhotosProps) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Drop Test Photos</Text>
      <Text style={styles.helperText}>
        Attach 2 photos of the drop test performed. Both are required to submit.
      </Text>
      <View style={styles.row}>
        <PhotoSlot
          label="Photo 1"
          photo={photo1}
          onPick={() => pickImage(onChange1)}
          onRemove={() => onChange1(null)}
        />
        <PhotoSlot
          label="Photo 2"
          photo={photo2}
          onPick={() => pickImage(onChange2)}
          onRemove={() => onChange2(null)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111111", marginBottom: 4 },
  helperText: { fontSize: 13, color: "#6B7280", marginBottom: 16 },
  row: { flexDirection: "row", gap: 12 },

  slot: { flex: 1 },
  slotLabel: { fontSize: 13, fontWeight: "600", color: "#6B7280", marginBottom: 8 },

  uploadBtn: { height: 120, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", borderStyle: "dashed", backgroundColor: "#F9FAFB", alignItems: "center", justifyContent: "center", gap: 6 },
  uploadBtnText: { fontSize: 13, color: "#9CA3AF", fontWeight: "500" },

  previewContainer: { height: 120, borderRadius: 12, overflow: "hidden", position: "relative" },
  previewImage: { width: "100%", height: "100%" },
  removeBtn: { position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
});
