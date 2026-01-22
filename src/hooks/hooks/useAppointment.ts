import { Alert } from "react-native";
import { supabase } from "../../lib/supabase";

const useAppointment = () => {
  const handleCancelAppointment = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("citas")
        .update({
          estado: "cancelada",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      Alert.alert("Cita ha sido cancelada exitosamente");
    } catch (error) {
      console.error("Error canceling appointment:", error);
      Alert.alert("Error", "No se pudo cancelar la cita");
      return false;
    }
  };

  return {
    handleCancelAppointment,
  };
};

export default useAppointment;
