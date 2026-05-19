import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";

type LogoProps = {
  size?: number;
  showText?: boolean;
  onPress?: () => void;
};

const Logo = ({ size = 40, showText = true, onPress }: LogoProps) => {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container onPress={onPress} className="flex-row items-center gap-2">
      <Image
        source={require("../../assets/logo.png")}
        style={{ width: size, height: size, resizeMode: "contain" }}
      />

      {showText && (
        <View>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "900", letterSpacing: 0.5 }}>
            অভয়
          </Text>
          <Text style={{ color: "rgba(255, 255, 255, 0.61)", fontSize: 10, letterSpacing: 1 }}>
            LIFELINE BD
          </Text>
        </View>
      )}
    </Container>
  );
};

export default Logo;