/**
 * AttachmentMenu.tsx
 * Modal visual para seleccionar tipo de adjunto
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants';

interface AttachmentMenuProps {
  visible: boolean;
  onClose: () => void;
  onSelectImage: () => void;
  onSelectFile: () => void;
}

export default function AttachmentMenu({
  visible,
  onClose,
  onSelectImage,
  onSelectFile,
}: AttachmentMenuProps) {
  const handleSelectImage = () => {
    onClose();
    setTimeout(onSelectImage, 100);
  };

  const handleSelectFile = () => {
    onClose();
    setTimeout(onSelectFile, 100);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.container}>
          <Text style={styles.title}>Enviar adjunto</Text>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={handleSelectImage}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: COLORS.primary }]}>
                <Ionicons name="image" size={28} color={COLORS.white} />
              </View>
              <Text style={styles.optionText}>Imagen</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={handleSelectFile}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: COLORS.info }]}>
                <Ionicons name="document" size={28} color={COLORS.white} />
              </View>
              <Text style={styles.optionText}>Archivo</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  optionButton: {
    alignItems: 'center',
    width: 80,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
});
