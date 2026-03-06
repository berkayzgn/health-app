import { View, Text, Pressable } from "react-native";
import { useStore } from "../../store/useStore";

export default function ScanScreen() {
  const { incrementScanCount } = useStore();

  const handleOpenCamera = () => {
    // TODO: Implement camera opening with expo-camera
    incrementScanCount();
  };

  return (
    <View className="flex-1 items-center justify-center bg-white p-6">
      <Text className="text-2xl font-bold text-gray-900 mb-2">
        Scan Food
      </Text>
      <Text className="text-base text-gray-600 text-center mb-8">
        Point your camera at food to analyze nutritional information.
      </Text>
      <Pressable
        onPress={handleOpenCamera}
        className="bg-green-500 px-8 py-4 rounded-xl active:bg-green-600"
      >
        <Text className="text-white font-semibold text-lg">
          Open Camera
        </Text>
      </Pressable>
      <Text className="text-sm text-gray-400 mt-4">
        Camera integration coming soon
      </Text>
    </View>
  );
}
