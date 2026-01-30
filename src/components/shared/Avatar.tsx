import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { COLORS } from "../../constants/colors";

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number;
  style?: any;
}

const Avatar: React.FC<AvatarProps> = ({
  uri,
  name = "U",
  size = 40,
  style,
}) => {
  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  };

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: COLORS.primary, // Verde principal i360
    justifyContent: "center" as const,
    alignItems: "center" as const,
    overflow: "hidden" as const,
  };

  if (uri && uri.trim() !== "" && !uri.includes("placehold.co")) {
    return (
      <View style={[containerStyle, style]}>
        <Image
          source={{ uri }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={200}
        />
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]}>
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  initials: {
    color: COLORS.white,
    fontWeight: "bold",
  },
});

export default Avatar;
