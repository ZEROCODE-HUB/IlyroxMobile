/**
 * ReportModal - Modal de reportes reutilizable
 *
 * Modal que muestra opciones de reporte según el tipo de contenido.
 * Usado en PostCard y PropertyCard para reportar contenido inapropiado.
 *
 * @example
 * <ReportModal
 *   visible={showModal}
 *   reportType="post"
 *   onClose={() => setShowModal(false)}
 *   onReport={(reason) => console.log(reason)}
 * />
 */

import React from 'react';
import { Modal, TouchableOpacity, View, Text } from 'react-native';
import { commonStyles } from '../../styles';

export interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  reportType: 'post' | 'property';
  onReport?: (reason: string) => void;
}

const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  onClose,
  reportType,
  onReport,
}) => {
  // Opciones de reporte según el tipo
  const reportOptions = reportType === 'post'
    ? ['Información falsa', 'Contenido inapropiado', 'Spam o publicidad']
    : ['Información falsa', 'Posible fraude o estafa', 'Pagos incompletos de comisiones'];

  const handleReport = (reason: string) => {
    onReport?.(reason);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        style={commonStyles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={commonStyles.menuContainer}>
          {reportOptions.map((option) => (
            <TouchableOpacity
              key={option}
              style={commonStyles.menuItem}
              onPress={() => handleReport(option)}
            >
              <Text style={commonStyles.menuItemText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default React.memo(ReportModal);
