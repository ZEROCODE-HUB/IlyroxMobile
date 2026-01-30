import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  ImageStyle,
  StyleProp,
  FlatList,
  Dimensions,
} from "react-native";
import { Image, ImageContentFit } from "expo-image";
import { COLORS } from "../constants/colors";

interface LazyImageProps {
  source: { uri: string } | { uri: string }[];
  style?: StyleProp<ImageStyle>;
  borderRadius?: number;
  resizeMode?: ImageContentFit;
}

const LazyImage: React.FC<LazyImageProps> = ({
  source,
  style,
  borderRadius = 0,
  resizeMode = "cover",
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const { width: SCREEN_WIDTH } = Dimensions.get("window");

  const isArray = Array.isArray(source);

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <View style={[style, { borderRadius, overflow: "hidden" }]}>
      {isLoading && (
        <View style={[StyleSheet.absoluteFill, styles.loadingContainer]}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      )}
      {hasError ? (
        <View style={[StyleSheet.absoluteFill, styles.errorContainer]}>
          <View style={styles.errorPlaceholder} />
        </View>
      ) : (
        <>
          {isArray ? (
            <FlatList
              data={source as { uri: string }[]}
              renderItem={({ item }) => (
                <Image
                  source={item}
                  style={[style, { borderRadius }]}
                  onLoadStart={handleLoadStart}
                  onLoad={handleLoadEnd}
                  onError={handleError}
                  contentFit={resizeMode}
                  cachePolicy="memory-disk"
                  transition={200}
                />
              )}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              snapToInterval={SCREEN_WIDTH}
              snapToAlignment="center"
              decelerationRate={0}
              onMomentumScrollEnd={() => {
                // Simplified for array handling in legacy mode
              }}
            />
          ) : (
            <Image
              source={source as { uri: string }}
              style={[style, { borderRadius }]}
              onLoadStart={handleLoadStart}
              onLoad={handleLoadEnd}
              onError={handleError}
              contentFit={resizeMode}
              cachePolicy="memory-disk"
              transition={200}
            />
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  errorContainer: {
    backgroundColor: COLORS.errorLight,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  errorPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.errorLight,
  },
});

export default LazyImage;
