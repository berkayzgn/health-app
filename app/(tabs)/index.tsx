import { View, Text } from "react-native";
import { useStore } from "../../store/useStore";

export default function HomeScreen() {
  const { scanCount } = useStore();

  return (
    <View className="flex-1 items-center justify-center bg-white p-6">
      <Text className="text-2xl font-bold text-gray-900 mb-2">
        Health AI App
      </Text>
      <Text className="text-base text-gray-600 text-center">
        Welcome! Scan your food to get nutritional insights powered by AI.
      </Text>
      <View className="mt-6 p-4 bg-green-50 rounded-lg">
        <Text className="text-sm text-gray-600">Total scans</Text>
        <Text className="text-2xl font-bold text-green-600">{scanCount}</Text>
      </View>
    </View>
  );
}
