import { View, Text, TouchableOpacity } from "react-native";
import { logoutUser } from "../../services/auth";
import { useAuthStore } from "../../store/authStore";
import { AccountType } from "../../types";

import { useRouter } from "expo-router";


const TYPE_COLORS: Record<AccountType, string> = {
  operator: "bg-purple-100",
  volunteer: "bg-teal-100",
  citizen: "bg-red-100",
};

const TYPE_TEXT: Record<AccountType, string> = {
  operator: "text-purple-600",
  volunteer: "text-teal-600",
  citizen: "text-red-600",
};


export default function ProfileScreen() {
  const { user, nickname, accountType } = useAuthStore();
  const type = accountType ?? "citizen";

  const router = useRouter();

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
          <Text className="text-gray-800 text-xl font-bold">{nickname ?? "User"}</Text>
          <Text className="text-gray-400 text-sm mt-1">{user?.email}</Text>
          <View className={`${TYPE_COLORS[type]} px-4 py-1.5 rounded-full mt-3`}>
            <Text className={`${TYPE_TEXT[type]} text-xs font-semibold capitalize`}>
              {type}
            </Text>
          </View>
        </View>

        <View className="border-t border-gray-100 pt-4 mb-4">
          <View className="flex-row justify-between py-2">
            <Text className="text-gray-500 text-sm">Full name</Text>
            <Text className="text-gray-800 text-sm font-medium">{user?.displayName ?? "—"}</Text>
          </View>
          <View className="flex-row justify-between py-2">
            <Text className="text-gray-500 text-sm">Email</Text>
            <Text className="text-gray-800 text-sm font-medium">{user?.email}</Text>
          </View>
          <View className="flex-row justify-between py-2">
            <Text className="text-gray-500 text-sm">Account type</Text>
            <Text className={`${TYPE_TEXT[type]} text-sm font-semibold capitalize`}>{type}</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={async () => {
            await logoutUser();
            router.replace("/(auth)/login");
          }}
          className="bg-red-600 rounded-xl py-4 items-center"

        >
          <Text className="text-white font-bold">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}