import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRef, useState } from "react";
import { loginUser, registerUser } from "../../services/auth";
import { AccountType } from "../../types";
import { useRouter } from "expo-router";
import Logo from "../../components/ui/logo";

const ACCOUNT_TYPES: { value: AccountType; label: string; desc: string }[] = [
  { value: "operator", label: "Operator", desc: "Manage and oversee operations" },
  { value: "volunteer", label: "Volunteer", desc: "Help and support donors" },
  { value: "citizen", label: "Citizen", desc: "Donate or request blood" },
];

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("citizen");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const router = useRouter();

// const { width } = Dimensions.get("window");


  // const slideAnim = useRef(new Animated.Value(0)).current;
  
  const switchTab = (toLogin: boolean) => {
    if (toLogin === isLogin) return;
    setError("");
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
    setIsLogin(toLogin);
    setName(""); setNickname(""); setEmail("");
    setPassword(""); setConfirmPassword("");
    setAccountType("citizen");
  };

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    if (!isLogin && !name) { setError("Please enter your full name."); return; }
    if (!isLogin && !nickname) { setError("Please enter a nickname."); return; }
    if (!isLogin && password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    try {
      if (isLogin) {
        await loginUser(email, password);
      } else {
        await registerUser(name, nickname, email, password, accountType);
      }
    } catch (err: any) {
      const code = err.code;
      if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else if (code === "auth/email-already-in-use") {
        setError("This email is already registered.");
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
<View className="bg-orange-600 px-6 pt-14 pb-10">
  {/* Top row — logo + go home button */}
  <View className="flex-row justify-between items-center mb-4">
    {/* Logo */}
    <Logo onPress={() => router.push("/")} />

    {/* Go Back Home button */}
    {/* <TouchableOpacity
      onPress={() => router.replace("/")}
      style={{
        backgroundColor: "rgba(255,255,255,0.2)",
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.35)",
      }}
    >
      <Text className="text-white text-sm font-semibold">🏠 Home</Text>
    </TouchableOpacity> */}
    {/* Go Back Home button */}
  </View>

  {/* Welcome message */}
  <Text className="text-orange-200 text-sm mt-1">
    Welcome to Lifeline BD
  </Text>
  <Text className="text-white text-2xl font-bold mt-1">
    Your Emergency Helpline
  </Text>
</View>

        {/* Tab switcher */}
        <View className="mx-6 mt-8 flex-row bg-gray-100 rounded-2xl p-1">
          <TouchableOpacity
            onPress={() => switchTab(true)}
            className={`flex-1 py-3 rounded-xl items-center ${isLogin ? "bg-white shadow-sm" : ""}`}
          >
            <Text className={`font-semibold text-sm ${isLogin ? "text-orange-600" : "text-gray-400"}`}>
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => switchTab(false)}
            className={`flex-1 py-3 rounded-xl items-center ${!isLogin ? "bg-white shadow-sm" : ""}`}
          >
            <Text className={`font-semibold text-sm ${!isLogin ? "text-orange-600" : "text-gray-400"}`}>
              Register
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <Animated.View className="mx-6 mt-6" style={{ opacity: fadeAnim }}>

          {!isLogin && (
            <>
              <View className="mb-4">
                <Text className="text-gray-600 text-sm font-medium mb-1.5">Full Name</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-800"
                  placeholder="Enter your full name"
                  placeholderTextColor="#9ca3af"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-600 text-sm font-medium mb-1.5">Nickname</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-800"
                  placeholder="Choose a nickname"
                  placeholderTextColor="#9ca3af"
                  value={nickname}
                  onChangeText={setNickname}
                  autoCapitalize="none"
                />
              </View>
            </>
          )}

          <View className="mb-4">
            <Text className="text-gray-600 text-sm font-medium mb-1.5">Email Address</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-800"
              placeholder="Enter your email"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-600 text-sm font-medium mb-1.5">Password</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-800"
              placeholder="Enter your password"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {!isLogin && (
            <>
              <View className="mb-4">
                <Text className="text-gray-600 text-sm font-medium mb-1.5">Confirm Password</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-800"
                  placeholder="Re-enter your password"
                  placeholderTextColor="#9ca3af"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>

              {/* Account type selector */}
              <View className="mb-6">
                <Text className="text-gray-600 text-sm font-medium mb-3">
                  Account Type
                </Text>
                {ACCOUNT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    onPress={() => setAccountType(type.value)}
                    className={`flex-row items-center p-4 rounded-xl mb-2 border ${
                      accountType === type.value
                        ? "bg-red-50 border-red-300"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    {/* Radio circle */}
                    <View
                      className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                        accountType === type.value
                          ? "border-orange-600"
                          : "border-gray-300"
                      }`}
                    >
                      {accountType === type.value && (
                        <View className="w-2.5 h-2.5 rounded-full bg-orange-600" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`font-semibold text-sm ${
                          accountType === type.value ? "text-orange-600" : "text-gray-700"
                        }`}
                      >
                        {type.label}
                      </Text>
                      <Text className="text-gray-400 text-xs mt-0.5">{type.desc}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {error !== "" && (
            <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
              <Text className="text-orange-600 text-sm">{error}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            className="bg-orange-600 rounded-xl py-4 items-center mt-2"
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-bold text-base">
                {isLogin ? "Sign In" : "Create Account"}
              </Text>
            )}
          </TouchableOpacity>

          <View className="flex-row justify-center mt-6 mb-10">
            <Text className="text-gray-400 text-sm">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </Text>
            <TouchableOpacity onPress={() => switchTab(!isLogin)}>
              <Text className="text-orange-600 text-sm font-semibold">
                {isLogin ? "Register" : "Sign In"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}