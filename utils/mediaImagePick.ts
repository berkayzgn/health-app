import { Alert, Linking, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { TFunction } from "i18next";

export async function ensureCameraPermission(t: TFunction): Promise<boolean> {
  const { status: existing } = await ImagePicker.getCameraPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status === "granted") return true;
  Alert.alert(
    t("nutritionMeal.cameraPermissionDeniedTitle"),
    t("nutritionMeal.cameraPermissionDeniedMessage"),
    [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("nutritionMeal.cameraOpenSettings"),
        onPress: () => {
          void Linking.openSettings();
        },
      },
    ],
  );
  return false;
}

export async function ensureMediaLibraryPermission(t: TFunction): Promise<boolean> {
  const existing = await ImagePicker.getMediaLibraryPermissionsAsync(false);
  if (existing.granted) return true;
  const requested = await ImagePicker.requestMediaLibraryPermissionsAsync(false);
  if (requested.granted) return true;
  Alert.alert(
    t("nutritionMeal.mediaLibraryPermissionDeniedTitle"),
    t("nutritionMeal.mediaLibraryPermissionDeniedMessage"),
    [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("nutritionMeal.mediaLibraryOpenSettings"),
        onPress: () => {
          void Linking.openSettings();
        },
      },
    ],
  );
  return false;
}

const IMAGE_ONLY = ["images"] as const;

export async function launchCameraForMeal() {
  return ImagePicker.launchCameraAsync({
    mediaTypes: IMAGE_ONLY,
    ...(Platform.OS === "android"
      ? { allowsEditing: true, aspect: [1, 1] as [number, number] }
      : { allowsEditing: false }),
    quality: 0.85,
    ...(Platform.OS === "ios"
      ? {
          preferredAssetRepresentationMode:
            ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        }
      : {}),
  });
}

export async function launchCameraForLabelScan() {
  return ImagePicker.launchCameraAsync({
    mediaTypes: IMAGE_ONLY,
    ...(Platform.OS === "android"
      ? { allowsEditing: true, aspect: [4, 3] as [number, number] }
      : { allowsEditing: false }),
    quality: 0.85,
  });
}

export async function launchImageLibrary() {
  return ImagePicker.launchImageLibraryAsync({
    mediaTypes: IMAGE_ONLY,
    allowsEditing: false,
    quality: 0.85,
    ...(Platform.OS === "ios"
      ? {
          preferredAssetRepresentationMode:
            ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
        }
      : {}),
  });
}
