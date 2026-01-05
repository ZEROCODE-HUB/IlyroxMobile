import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

interface RatingStarsProps {
  rating?: number | null;
  totalRatings?: number | null;
  size?: number;
  showCount?: boolean;
  color?: string;
}

const RatingStars: React.FC<RatingStarsProps> = ({ 
  rating = 0, 
  totalRatings = 0, 
  size = 14, 
  showCount = true,
  color = COLORS.textSecondary
}) => {
  // Si no hay calificación, podemos mostrar "Nuevo" o simplemente no mostrar nada
  // Por ahora mostraremos 0.0 si es nulo
  const displayRating = rating?.toFixed(1) || "0.0";
  const displayCount = totalRatings || 0;

  return (
    <View style={styles.container}>
      <Ionicons name="star" size={size} color={COLORS.warning} />
      <Text style={[styles.ratingText, { fontSize: size, color: COLORS.textPrimary }]}>
        {displayRating}
      </Text>
      {showCount && (
        <Text style={[styles.countText, { fontSize: size - 2, color }]}>
          ({displayCount})
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontWeight: 'bold',
    marginLeft: 2,
  },
  countText: {
    marginLeft: 2,
  },
});

export default RatingStars;
