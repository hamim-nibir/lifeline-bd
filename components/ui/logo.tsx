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
    <Container
      onPress={onPress}
      className="flex-row items-center gap-2"
    >
      <Image
        source={require("../../assets/logo.png")}
        style={{
          width: size,
          height: size,
          resizeMode: "contain",
        }}
      />

      {/* <Text style={{ fontSize: 18 }}>🛡️</Text> */}

      {showText && (
        <Text className="text-white text-2xl font-bold">
          Lifeline BD
        </Text>
      )}
    </Container>
  );
};

export default Logo;