import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
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
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../hooks/useTranslation";
import LanguageSwitcher from "../../components/LanguageSwitcher";

const ACCOUNT_TYPE_VALUES: AccountType[] = ["operator", "volunteer", "citizen"];

export default function AuthScreen() {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("citizen");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const router = useRouter();

  // ── Validation helpers ──
  const isValidEmail = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const emailInvalid = emailTouched && email.length > 0 && !isValidEmail(email);

  const isFormValid = !isLogin
    ? (
      name.trim().length > 0 &&
      nickname.trim().length > 0 &&
      isValidEmail(email) &&
      password.length >= 6 &&
      password === confirmPassword
    )
    : (email.length > 0 && password.length > 0);

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
    setShowPassword(false); setShowConfirmPassword(false);
    setEmailTouched(false); setConfirmTouched(false);
    setAccountType("citizen");
  };

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) { setError(t("auth.fillAll")); return; }
    if (!isLogin && !name) { setError(t("auth.enterName")); return; }
    if (!isLogin && !nickname) { setError(t("auth.enterNickname")); return; }
    if (!isLogin && password !== confirmPassword) { setError(t("auth.passwordMismatch")); return; }
    if (password.length < 6) { setError(t("auth.passwordMin")); return; }

    setLoading(true);
    try {
      if (isLogin) {
        await loginUser(email, password);
      } else {
        await registerUser(name, nickname, email, password, accountType);
      }
    } catch (err: any) {
      const code = err.code;
      if (
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential"
      ) {
        setError(t("auth.loginFailed"));
      } else if (code === "auth/email-already-in-use") {
        setError(t("auth.registerFailed"));
      } else if (code === "auth/invalid-email") {
        setError(t("auth.invalidEmail"));
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
        {/* ── Header ── */}
        <View className=" px-6 pt-14 pb-10"
          style={{
            backgroundColor: "#c4451a",
          }}>

          <View className="flex-row justify-between items-center mb-4">
            <Logo onPress={() => router.push("/")} />
            <TouchableOpacity
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
            </TouchableOpacity>
          </View>
          <Text className="text-orange-200 text-sm mt-1">
            Welcome to Lifeline BD
          </Text>
          <Text className="text-white text-2xl font-bold mt-1">
            Your Emergency Helpline
          </Text>
        </View>

        {/* ── Tab switcher ── */}
        <View className="mx-6 mt-8 flex-row bg-gray-100 rounded-2xl p-1">
          <TouchableOpacity
            onPress={() => switchTab(true)}
            className={`flex-1 py-3 rounded-xl items-center ${isLogin ? "bg-white shadow-sm" : ""}`}
          >
            <Text className={`font-semibold text-sm ${isLogin ? "text-orange-600" : "text-gray-400"}`}>
              {t("auth.signIn")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => switchTab(false)}
            className={`flex-1 py-3 rounded-xl items-center ${!isLogin ? "bg-white shadow-sm" : ""}`}
          >
            <Text className={`font-semibold text-sm ${!isLogin ? "text-orange-600" : "text-gray-400"}`}>
              {t("auth.register")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Form ── */}
        <Animated.View className="mx-6 mt-6" style={{ opacity: fadeAnim }}>
          <LanguageSwitcher compact />

          {/* Register-only fields */}
          {!isLogin && (
            <>
              {/* Full Name */}
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

              {/* Nickname */}
              <View className="mb-4">
                <Text className="text-gray-600 text-sm font-medium mb-1.5">
                  Nickname
                </Text>
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

          {/* Email */}
          <View className="mb-4">
            <Text className="text-gray-600 text-sm font-medium mb-1.5">
              Email Address
            </Text>
            <TextInput
              className={`bg-gray-50 border rounded-xl px-4 py-3.5 text-gray-800 ${emailInvalid ? "border-red-400" : "border-gray-200"
                }`}
              placeholder="Enter your email"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              onBlur={() => setEmailTouched(true)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {emailInvalid && (
              <Text className="text-red-500 text-xs mt-1.5 ml-1">
                ⚠️ Please enter a valid email address
              </Text>
            )}
          </View>

          {/* Password */}
          <View className="mb-4">
            <Text className="text-gray-600 text-sm font-medium mb-1.5">
              Password
            </Text>
            <View
              className={`flex-row bg-gray-50 border rounded-xl items-center pr-4 ${password.length > 0 && password.length < 6
                  ? "border-red-400"
                  : "border-gray-200"
                }`}
            >
              <TextInput
                className="flex-1 px-4 py-3.5 text-gray-800"
                placeholder="Enter your password"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>
            {password.length > 0 && password.length < 6 && (
              <Text className="text-red-500 text-xs mt-1.5 ml-1">
                ⚠️ Password must be at least 6 characters
              </Text>
            )}
          </View>

          {/* Register-only: Confirm Password + Account Type */}
          {!isLogin && (
            <>
              {/* Confirm Password */}
              <View className="mb-4">
                <Text className="text-gray-600 text-sm font-medium mb-1.5">
                  Confirm Password
                </Text>
                <View
                  className={`flex-row bg-gray-50 border rounded-xl items-center pr-4 ${passwordsMismatch
                      ? "border-red-400"
                      : passwordsMatch
                        ? "border-green-400"
                        : "border-gray-200"
                    }`}
                >
                  <TextInput
                    className="flex-1 px-4 py-3.5 text-gray-800"
                    placeholder="Re-enter your password"
                    placeholderTextColor="#9ca3af"
                    value={confirmPassword}
                    onChangeText={(v) => {
                      setConfirmPassword(v);
                      setConfirmTouched(true);
                    }}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
                {passwordsMismatch && (
                  <Text className="text-red-500 text-xs mt-1.5 ml-1">
                    ⚠️ Passwords do not match
                  </Text>
                )}
              </View>

              {/* Account Type */}
              <View className="mb-6">
                <Text className="text-gray-600 text-sm font-medium mb-3">
                  Account Type
                </Text>
                {ACCOUNT_TYPE_VALUES.map((value) => (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setAccountType(value)}
                    className={`flex-row items-center p-4 rounded-xl mb-2 border ${accountType === value
                        ? "bg-orange-50 border-orange-300"
                        : "bg-gray-50 border-gray-200"
                      }`}
                  >
                    <View
                      className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${accountType === value
                          ? "border-orange-600"
                          : "border-gray-300"
                        }`}
                    >
                      {accountType === value && (
                        <View className="w-2.5 h-2.5 rounded-full bg-orange-600" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`font-semibold text-sm ${accountType === value
                            ? "text-orange-600"
                            : "text-gray-700"
                          }`}
                      >
                        {t(`auth.types.${value}.label`)}
                      </Text>
                      <Text className="text-gray-400 text-xs mt-0.5">
                        {t(`auth.types.${value}.desc`)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Error message */}
          {error !== "" && (
            <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
              <Text className="text-red-600 text-sm">{error}</Text>
            </View>
          )}

          {/* Submit button — disabled until form is valid */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading || !isFormValid}
            className={`rounded-xl py-4 items-center mt-2 ${isFormValid ? "bg-orange-600" : "bg-orange-300"
              }`}
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
