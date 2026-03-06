import { View, Text } from "react-native";

export default function ProfileScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white p-6">
      <View className="w-20 h-20 rounded-full bg-gray-200 items-center justify-center mb-4">
        <Text className="text-3xl text-gray-500">👤</Text>
      </View>
      <Text className="text-2xl font-bold text-gray-900 mb-2">
        Profile
      </Text>
      <Text className="text-base text-gray-600 text-center">
        Manage your account, dietary preferences, and settings.
      </Text>
    </View>
  );
}
