/**
 * CreateAppointmentModal.tsx
 * Modal para crear citas desde el chat
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppInput } from '../../design-system/components/AppInput';
import { COLORS } from '../../constants';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';

interface CreateAppointmentModalProps {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
  otherUserId: string;
  currentUserId: string;
}

const APPOINTMENT_TYPES = [
  { value: 'visita', label: 'Visita a propiedad' },
  { value: 'llamada', label: 'Llamada telefónica' },
  { value: 'videollamada', label: 'Videollamada' },
  { value: 'reunion', label: 'Reunión presencial' },
];

export default function CreateAppointmentModal({
  visible,
  onClose,
  propertyId,
  otherUserId,
  currentUserId,
}: CreateAppointmentModalProps) {
  const { showToast } = useToast();

  // Estados para inputs de texto
  const [fechaText, setFechaText] = useState('');
  const [horaText, setHoraText] = useState('');
  const [tipo, setTipo] = useState<string>('visita');
  const [descripcion, setDescripcion] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Inicializar fecha y hora por defecto cuando se abre el modal
  React.useEffect(() => {
    if (visible) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const year = tomorrow.getFullYear();
      const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const day = String(tomorrow.getDate()).padStart(2, '0');
      setFechaText(`${year}-${month}-${day}`);
      setHoraText('09:00');
    }
  }, [visible]);

  const validateDate = (dateStr: string): boolean => {
    // Formato: YYYY-MM-DD
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;

    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return date >= today;
  };

  const validateTime = (timeStr: string): boolean => {
    // Formato: HH:MM
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return regex.test(timeStr);
  };

  const determineRoles = async () => {
    // Obtener perfiles de ambos usuarios para determinar roles
    const { data: currentUserProfile } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', currentUserId)
      .single();

    const { data: otherUserProfile } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', otherUserId)
      .single();

    // Determinar quién es agente y quién es cliente
    let agenteId = '';
    let clienteId = '';

    if (currentUserProfile?.rol === 'agente') {
      agenteId = currentUserId;
      clienteId = otherUserId;
    } else if (otherUserProfile?.rol === 'agente') {
      agenteId = otherUserId;
      clienteId = currentUserId;
    } else {
      // Si ninguno es agente o ambos son agentes, usar current como agente por defecto
      agenteId = currentUserId;
      clienteId = otherUserId;
    }

    return { agenteId, clienteId };
  };

  const handleCreateAppointment = async () => {
    // Validaciones
    if (!validateDate(fechaText)) {
      Alert.alert('Error', 'Fecha inválida. Usa formato YYYY-MM-DD y asegúrate que no sea anterior a hoy');
      return;
    }

    if (!validateTime(horaText)) {
      Alert.alert('Error', 'Hora inválida. Usa formato HH:MM (24 horas)');
      return;
    }

    try {
      setIsCreating(true);

      // Determinar roles
      const { agenteId, clienteId } = await determineRoles();

      if (agenteId === clienteId) {
        Alert.alert('Error', 'No se puede crear una cita con el mismo usuario');
        return;
      }

      // Formatear hora para PostgreSQL (agregar segundos)
      const horaStr = `${horaText}:00`; // HH:MM:SS

      // Crear cita
      const { data, error } = await supabase
        .from('citas')
        .insert({
          propiedad_id: propertyId,
          agente_id: agenteId,
          cliente_id: clienteId,
          created_by: currentUserId,
          fecha: fechaText,
          hora: horaStr,
          tipo,
          descripcion: descripcion.trim() || null,
          estado: 'pendiente',
        })
        .select()
        .single();

      if (error) throw error;

      showToast('Cita creada exitosamente', 'success');
      onClose();

      // Resetear form
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const year = tomorrow.getFullYear();
      const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const day = String(tomorrow.getDate()).padStart(2, '0');
      setFechaText(`${year}-${month}-${day}`);
      setHoraText('09:00');
      setTipo('visita');
      setDescripcion('');
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      showToast(error.message || 'Error al crear la cita', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Crear Cita</Text>
            <TouchableOpacity onPress={onClose} disabled={isCreating}>
              <Ionicons name="close" size={24} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Fecha */}
            <View style={styles.field}>
              <Text style={styles.label}>Fecha * (YYYY-MM-DD)</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                <TextInput
                  style={styles.textInput}
                  placeholder="2024-12-31"
                  placeholderTextColor={COLORS.textTertiary}
                  value={fechaText}
                  onChangeText={setFechaText}
                  editable={!isCreating}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <Text style={styles.hint}>Formato: Año-Mes-Día (ej: 2024-12-25)</Text>
            </View>

            {/* Hora */}
            <View style={styles.field}>
              <Text style={styles.label}>Hora * (HH:MM - 24 horas)</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                <TextInput
                  style={styles.textInput}
                  placeholder="09:00"
                  placeholderTextColor={COLORS.textTertiary}
                  value={horaText}
                  onChangeText={setHoraText}
                  editable={!isCreating}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <Text style={styles.hint}>Formato 24 horas (ej: 09:00, 14:30, 18:00)</Text>
            </View>

            {/* Tipo */}
            <View style={styles.field}>
              <Text style={styles.label}>Tipo de cita *</Text>
              <View style={styles.typeGrid}>
                {APPOINTMENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeButton,
                      tipo === type.value && styles.typeButtonActive,
                    ]}
                    onPress={() => setTipo(type.value)}
                    disabled={isCreating}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        tipo === type.value && styles.typeButtonTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Descripción */}
            <View style={styles.field}>
              <AppInput
                label="Detalles adicionales (opcional)"
                placeholder="Escribe detalles sobre la cita..."
                value={descripcion}
                onChangeText={setDescripcion}
                multiline
                numberOfLines={4}
                editable={!isCreating}
              />
            </View>
          </ScrollView>

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary, isCreating && styles.buttonDisabled]}
              onPress={onClose}
              disabled={isCreating}
            >
              <Text style={styles.buttonSecondaryText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary, isCreating && styles.buttonDisabled]}
              onPress={handleCreateAppointment}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <ActivityIndicator size="small" color={COLORS.white} />
                  <Text style={[styles.buttonPrimaryText, { marginLeft: 8 }]}>Creando...</Text>
                </>
              ) : (
                <Text style={styles.buttonPrimaryText}>Crear Cita</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  content: {
    padding: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  typeGrid: {
    gap: 8,
  },
  typeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  typeButtonActive: {
    backgroundColor: COLORS.primaryTransparent,
    borderColor: COLORS.primary,
  },
  typeButtonText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  typeButtonTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: {
    backgroundColor: COLORS.cardBorder,
  },
  buttonSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
  },
  buttonPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
