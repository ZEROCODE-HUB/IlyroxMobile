/**
 * ProgressTimeline - Barra de progreso para videos
 *
 * Componente reutilizable que muestra el progreso de reproducción
 * de un video. Se usa en ReelCard y ReelDetail.
 *
 * @example
 * <ProgressTimeline progress={0.5} />
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../../constants';

export interface ProgressTimelineProps {
  progress: number; // Valor entre 0 y 1
  style?: ViewStyle;
}

const ProgressTimeline: React.FC<ProgressTimelineProps> = ({ progress, style }) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${Math.round(progress * 100)}%` },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
  },
  track: {
    height: 3,
    backgroundColor: COLORS.whiteTransparent30,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: COLORS.white,
  },
});

export default React.memo(ProgressTimeline);
