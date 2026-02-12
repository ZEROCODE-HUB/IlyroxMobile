import { supabase } from "../../lib/supabase";
import { useModal } from "@/context/ModalContext";

const useAppointment = () => {
  const { showModal } = useModal();
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

      showModal({ title: "Éxito", message: "Cita ha sido cancelada exitosamente", confirmText: "OK" });
      return true;
    } catch (error) {
      console.error("Error canceling appointment:", error);
      showModal({ title: "Error", message: "No se pudo cancelar la cita", confirmText: "OK" });
      return false;
    }
  };

  return {
    handleCancelAppointment,
  };
};

export default useAppointment;
