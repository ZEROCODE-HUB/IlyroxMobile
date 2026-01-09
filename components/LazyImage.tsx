import React, { useState, useEffect } from "react";
import {
  View,
  Image,
  StyleSheet,
  ActivityIndicator,
  ImageStyle,
  StyleProp,
  FlatList,
  Dimensions,
} from "react-native";
import { COLORS } from "../constants/colors";

interface LazyImageProps {
  source: { uri: string };
  style?: StyleProp<ImageStyle>;
  borderRadius?: number;
  resizeMode?: "cover" | "contain" | "stretch" | "repeat" | "center";
}

const LazyImage: React.FC<LazyImageProps> = ({
  source,
  style,
  borderRadius = 0,
  resizeMode = "cover",
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const { width: SCREEN_WIDTH } = Dimensions.get("window");

  const isArray = Array.isArray(source);

  useEffect(() => {
    // Small delay to allow component mounting before starting load
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

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

  if (!shouldLoad) {
    return (
      <View style={[styles.placeholder, style, { borderRadius }]}>
        <View style={styles.skeletonShimmer} />
      </View>
    );
  }

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
              data={source}
              renderItem={({ item }) => (
                <Image
                  source={item}
                  style={[style, { borderRadius }]}
                  onLoadStart={handleLoadStart}
                  onLoadEnd={handleLoadEnd}
                  onError={handleError}
                  resizeMode={resizeMode}
                />
              )}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              snapToInterval={SCREEN_WIDTH}
              snapToAlignment="center"
              decelerationRate={0}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(
                  e.nativeEvent.contentOffset.x / SCREEN_WIDTH
                );
                handleLoadStart();
                handleLoadEnd();
              }}
            />
          ) : (
            <Image
              source={source}
              style={[style, { borderRadius }]}
              onLoadStart={handleLoadStart}
              onLoadEnd={handleLoadEnd}
              onError={handleError}
              resizeMode={resizeMode}
            />
          )}
        </>
      )}
    </View>
  );
};

/* 
<Image
          source={source}
          style={[style, { borderRadius }]}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          resizeMode={resizeMode}
        />
*/

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  skeletonShimmer: {
    flex: 1,
    backgroundColor: COLORS.shimmer,
    opacity: 0.5,
  },
  loadingContainer: {
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    backgroundColor: COLORS.errorLight,
    justifyContent: "center",
    alignItems: "center",
  },
  errorPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.errorLight,
  },
});

export default LazyImage;
