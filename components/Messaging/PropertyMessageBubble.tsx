/**
 * PropertyMessageBubble.tsx
 * Burbuja especial para mensajes de propiedades
 */

import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants';

interface PropertyMessageBubbleProps {
  message: {
    id: string;
    contenido: string | null;
    created_at: string;
    propiedad?: {
      id: string;
      tipo: string;
      subtipo: string;
      descripcion: string;
      fotos: string[];
      ciudad: string;
      operaciones?: Array<{
        tipo_operacion: string;
        precio: number;
        moneda: string;
      }>;
    };
  };
  isMe: boolean;
  onViewDetails?: (propertyId: string) => void;
}

export default function PropertyMessageBubble({
  message,
  isMe,
  onViewDetails,
}: PropertyMessageBubbleProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'MXN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (!message.propiedad) {
    return (
      <View style={[styles.container, isMe ? styles.containerMe : styles.containerOther]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color={COLORS.error} />
            <Text style={styles.errorText}>Propiedad no disponible</Text>
          </View>
        </View>
      </View>
    );
  }

  const { propiedad } = message;
  const mainImage = propiedad.fotos?.[0] || 'https://placehold.co/400x300';
  const operation = propiedad.operaciones?.[0];

  return (
    <View style={[styles.container, isMe ? styles.containerMe : styles.containerOther]}>
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons
            name="home"
            size={16}
            color={isMe ? COLORS.white : COLORS.primary}
          />
          <Text style={[styles.headerText, isMe ? styles.textMe : styles.textOther]}>
            Propiedad Compartida
          </Text>
        </View>

        {/* Imagen */}
        <Image source={{ uri: mainImage }} style={styles.image} />

        {/* Info */}
        <View style={styles.info}>
          <Text style={[styles.title, isMe ? styles.textMe : styles.textOther]} numberOfLines={2}>
            {propiedad.subtipo} en {propiedad.ciudad}
          </Text>

          {operation && (
            <Text style={[styles.price, isMe ? styles.textMe : styles.textOther]}>
              {formatPrice(operation.precio, operation.moneda)}
              {operation.tipo_operacion === 'renta' && '/mes'}
            </Text>
          )}

          {/* Botón Ver Detalles */}
          <TouchableOpacity
            style={[styles.detailsButton, isMe ? styles.detailsButtonMe : styles.detailsButtonOther]}
            onPress={() => onViewDetails?.(propiedad.id)}
          >
            <Text style={[styles.detailsText, isMe ? styles.textMe : { color: COLORS.primary }]}>
              Ver detalles
            </Text>
            <Ionicons
              name="arrow-forward"
              size={14}
              color={isMe ? COLORS.white : COLORS.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Timestamp */}
        <Text style={[styles.time, isMe ? styles.timeMe : styles.timeOther]}>
          {formatTime(message.created_at)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 12,
    marginVertical: 4,
  },
  containerMe: {
    alignItems: 'flex-end',
  },
  containerOther: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 2,
  },
  bubbleMe: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 6,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
  },
  info: {
    padding: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  textMe: {
    color: COLORS.white,
  },
  textOther: {
    color: COLORS.textPrimary,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  detailsButtonMe: {
    backgroundColor: COLORS.whiteTransparent20,
  },
  detailsButtonOther: {
    backgroundColor: COLORS.background,
  },
  detailsText: {
    fontSize: 13,
    fontWeight: '600',
  },
  time: {
    fontSize: 10,
    marginTop: 2,
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  timeMe: {
    color: COLORS.whiteTransparent90,
    textAlign: 'right',
  },
  timeOther: {
    color: COLORS.textTertiary,
    textAlign: 'left',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
