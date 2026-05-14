import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { COLORS } from "../../constants/colors";
import Svg, { Line } from "react-native-svg";

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number;
  style?: any;
  isWithBorder?: boolean;
}

const getInitials = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return "U";
  if (parts.length === 1)
    return parts[0].charAt(0).toUpperCase() + parts[parts.length - 1].charAt(1);
  return parts[0].charAt(0).toUpperCase() + parts[parts.length - 1].charAt(1);
};

export const Avatar: React.FC<AvatarProps> = React.memo(
  ({ uri, name = "U", size = 40, style }) => {
    const containerStyle = {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: COLORS.primary, // Verde principal ilyrox
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
            transition={0}
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
  },
);

export const CircularImageWithRays = ({
  uri,
  name = "U",
  imageSize = 180,
  numberOfRays = 30,
  rayLength = 30,
  rayColor = "white",
  rayWidth = 2,
}: {
  uri?: string;
  name?: string;
  imageSize?: number;
  numberOfRays?: number;
  rayLength?: number;
  rayColor?: string;
  rayWidth?: number;
}) => {
  const containerSize = imageSize + rayLength * 2;
  const center = containerSize / 2;
  const innerRadius = imageSize / 2;
  const outerRadius = innerRadius + rayLength;

  const rays = Array.from({ length: numberOfRays }).map((_, index) => {
    const angle = (index * 360) / numberOfRays;
    const radian = (angle * Math.PI) / 180;

    return {
      x1: center + innerRadius * Math.cos(radian),
      y1: center + innerRadius * Math.sin(radian),
      x2: center + outerRadius * Math.cos(radian),
      y2: center + outerRadius * Math.sin(radian),
    };
  });

  const renderContent = () => {
    const contentStyle = [
      styles.image,
      {
        width: imageSize,
        height: imageSize,
        borderRadius: imageSize / 2,
      },
    ];

    if (uri && uri.trim() !== "" && !uri.includes("placehold.co")) {
      return <Image source={{ uri }} style={contentStyle} contentFit="cover" />;
    }

    return (
      <View
        style={[
          contentStyle,
          {
            backgroundColor: COLORS.primary,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <Text style={[styles.initials, { fontSize: imageSize * 0.4 }]}>
          {getInitials(name)}
        </Text>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { width: containerSize, height: containerSize },
      ]}
    >
      <Svg height={containerSize} width={containerSize} style={styles.svg}>
        {rays.map((ray, index) => (
          <Line
            key={index}
            x1={ray.x1}
            y1={ray.y1}
            x2={ray.x2}
            y2={ray.y2}
            stroke={rayColor}
            strokeWidth={rayWidth}
          />
        ))}
      </Svg>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  initials: {
    color: COLORS.white,
    fontWeight: "bold",
  },
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  svg: {
    position: "absolute",
  },
  image: {
    position: "absolute",
  },
});

export default Avatar;
