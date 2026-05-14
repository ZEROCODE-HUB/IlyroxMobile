import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Bath } from "lucide-react-native";

interface RichTextProps {
  content: string;
  style?: any;
  iconSize?: number;
  iconColor?: string;
}

const ICON_MAP: Record<string, any> = {
  location: { component: Ionicons, name: "location" },
  cash: { component: Ionicons, name: "cash-outline" },
  bed: { component: Ionicons, name: "bed" },
  bath: { component: Bath, isLucide: true },
  car: { component: Ionicons, name: "car" },
  business: { component: Ionicons, name: "business-outline" },
  time: { component: Ionicons, name: "time-outline" },
  resize: { component: Ionicons, name: "resize-outline" },
  home: { component: Ionicons, name: "home-outline" },
};

export const RichText: React.FC<RichTextProps> = ({
  content,
  style,
  iconSize = 16,
  iconColor = "black",
}) => {
  // Regex to match [ICON:name]
  const parts = content.split(/(\[ICON:[\w]+\])/g);

  return (
    <Text style={style}>
      {parts.map((part, index) => {
        const match = part.match(/\[ICON:([\w]+)\]/);
        if (match) {
          const iconName = match[1].toLowerCase();
          const iconConfig = ICON_MAP[iconName];

          if (iconConfig) {
            if (iconConfig.isLucide) {
              const IconComponent = iconConfig.component;
              return (
                <View
                  key={index}
                  style={[
                    styles.iconWrapper,
                    { width: iconSize, height: iconSize },
                  ]}
                >
                  <IconComponent size={iconSize - 2} color={iconColor} />
                </View>
              );
            }
            return (
              <Ionicons
                key={index}
                name={iconConfig.name}
                size={iconSize}
                color={iconColor}
              />
            );
          }
        }
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
};

const styles = StyleSheet.create({
  iconWrapper: {
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 2,
    marginBottom: -4, // Adjust for base alignment
  },
});
