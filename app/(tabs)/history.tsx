import { View, Text } from "react-native";

export default function HistoryScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white p-6">
      <Text className="text-2xl font-bold text-gray-900 mb-2">
        History
      </Text>
      <Text className="text-base text-gray-600 text-center">
        Your scan history will appear here. Past food analyses and nutritional
        data.
      </Text>
      <View className="mt-8 p-6 bg-gray-100 rounded-xl">
        <Text className="text-sm text-gray-500">No scans yet</Text>
      </View>
    </View>
  );
}
