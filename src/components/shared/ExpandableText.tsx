import React, { useState } from "react";
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import { COLORS } from "../../constants";

interface ExpandableTextProps {
  text: string;
  userName?: string;
  maxLines?: number;
  style?: TextStyle;
  containerStyle?: ViewStyle;
}

const ExpandableText: React.FC<ExpandableTextProps> = ({
  text,
  userName,
  maxLines = 2,
  style,
  containerStyle,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowMore, setShouldShowMore] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleTextLayout = (e: any) => {
    if (!isExpanded) {
      setShouldShowMore(e.nativeEvent.lines.length > maxLines);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={toggleExpand}
      style={[styles.container, containerStyle]}
    >
      <Text
        style={[styles.text, style]}
        numberOfLines={isExpanded ? undefined : maxLines}
        onTextLayout={handleTextLayout}
      >
        {userName && <Text style={styles.userName}>{userName} </Text>}
        {text}
      </Text>
      {!isExpanded && shouldShowMore && (
        <Text style={styles.seeMore}>... ver más</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  text: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  userName: {
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  seeMore: {
    color: COLORS.textSecondary,
    fontWeight: "600",
    fontSize: 13,
    marginTop: 2,
  },
});

export default ExpandableText;
