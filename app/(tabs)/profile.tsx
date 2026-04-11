import { View, Text, TouchableOpacity } from "react-native";
import { logoutUser } from "../../services/auth";
import { useAuthStore } from "../../store/authStore";

export default function ProfileScreen() {
  const { user } = useAuthStore();

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-red-600 px-6 pt-16 pb-8">
        <Text className="text-white text-2xl font-bold">My Profile</Text>
      </View>

      <View className="mx-4 mt-6 bg-white rounded-2xl p-6">
        <View className="items-center mb-6">
          <View className="w-20 h-20 bg-red-100 rounded-full items-center justify-center mb-3">
            <Text className="text-4xl">👤</Text>
          </View>
          <Text className="text-gray-800 text-xl font-bold">
            {user?.displayName ?? "User"}
          </Text>
          <Text className="text-gray-400 text-sm mt-1">{user?.email}</Text>
        </View>

        <TouchableOpacity
          onPress={logoutUser}
          className="bg-red-600 rounded-xl py-4 items-center mt-4"
        >
          <Text className="text-white font-bold">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}