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

const { width } = Dimensions.get("window");

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const switchTab = (toLogin: boolean) => {
    if (toLogin === isLogin) return;
    setError("");

    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: toLogin ? 0 : 1,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    setIsLogin(toLogin);
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async () => {
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (!isLogin && !name) {
      setError("Please enter your full name.");
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await loginUser(email, password);
      } else {
        await registerUser(name, email, password);
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
        <View className="bg-red-600 px-6 pt-16 pb-10 items-center">
          <Text className="text-white text-4xl font-bold tracking-tight">
            🩸 Lifeline BD
          </Text>
          <Text className="text-red-200 text-sm mt-2 text-center">
            Connecting donors, saving lives
          </Text>
        </View>

        {/* Tab switcher */}
        <View className="mx-6 mt-8 flex-row bg-gray-100 rounded-2xl p-1">
          <TouchableOpacity
            onPress={() => switchTab(true)}
            className={`flex-1 py-3 rounded-xl items-center ${
              isLogin ? "bg-white shadow-sm" : ""
            }`}
          >
            <Text
              className={`font-semibold text-sm ${
                isLogin ? "text-red-600" : "text-gray-400"
              }`}
            >
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => switchTab(false)}
            className={`flex-1 py-3 rounded-xl items-center ${
              !isLogin ? "bg-white shadow-sm" : ""
            }`}
          >
            <Text
              className={`font-semibold text-sm ${
                !isLogin ? "text-red-600" : "text-gray-400"
              }`}
            >
              Register
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <Animated.View
          className="mx-6 mt-6"
          style={{ opacity: fadeAnim }}
        >
          {!isLogin && (
            <View className="mb-4">
              <Text className="text-gray-600 text-sm font-medium mb-1.5">
                Full Name
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-800"
                placeholder="Enter your full name"
                placeholderTextColor="#9ca3af"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View className="mb-4">
            <Text className="text-gray-600 text-sm font-medium mb-1.5">
              Email Address
            </Text>
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
            <Text className="text-gray-600 text-sm font-medium mb-1.5">
              Password
            </Text>
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
            <View className="mb-4">
              <Text className="text-gray-600 text-sm font-medium mb-1.5">
                Confirm Password
              </Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-800"
                placeholder="Re-enter your password"
                placeholderTextColor="#9ca3af"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>
          )}

          {/* Error message */}
          {error !== "" && (
            <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
              <Text className="text-red-600 text-sm">{error}</Text>
            </View>
          )}

          {/* Submit button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            className="bg-red-600 rounded-xl py-4 items-center mt-2"
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-bold text-base">
                {isLogin ? "Sign In" : "Create Account"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Switch hint */}
          <View className="flex-row justify-center mt-6 mb-10">
            <Text className="text-gray-400 text-sm">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </Text>
            <TouchableOpacity onPress={() => switchTab(!isLogin)}>
              <Text className="text-red-600 text-sm font-semibold">
                {isLogin ? "Register" : "Sign In"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}