-- ============================================================================
-- Notificar cuando se CANCELA una cita (2026-07).
--
-- Problema: al cancelar, el cliente hace UPDATE citas SET estado='cancelada'.
-- Solo existía trigger de notificación en INSERT (notificar_nueva_cita), así que
-- la otra persona no se enteraba: "solo te la borra".
--
-- Solución: trigger AFTER UPDATE que, al pasar a 'cancelada', avisa por push a
-- el participante que NO canceló (se identifica con auth.uid()). Si no se puede
-- determinar quién canceló (auth.uid() null), avisa a ambos participantes.
-- Reutiliza enviar_notificacion_push (mismo mecanismo que la cita nueva).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notificar_cita_cancelada()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_canceller UUID;
  v_canceller_nombre TEXT;
  v_tipo_cita TEXT;
  v_fecha_hora TEXT;
  v_mensaje TEXT;
  v_data JSONB;
BEGIN
  v_canceller := auth.uid();

  v_fecha_hora := TO_CHAR(NEW.fecha, 'DD/MM/YYYY') || ' a las ' ||
                  TO_CHAR(NEW.hora, 'HH24:MI');

  v_tipo_cita := CASE NEW.tipo
    WHEN 'visita' THEN 'Visita a propiedad'
    WHEN 'llamada' THEN 'Llamada'
    WHEN 'videollamada' THEN 'Videollamada'
    WHEN 'reunion' THEN 'Reunión'
    ELSE 'Cita'
  END;

  SELECT nombre_completo INTO v_canceller_nombre
  FROM perfiles WHERE id = v_canceller;

  v_mensaje := COALESCE(v_canceller_nombre, 'Un usuario') || ' canceló: ' ||
               v_tipo_cita || ' del ' || v_fecha_hora;

  v_data := jsonb_build_object(
    'cita_id', NEW.id,
    'tipo', NEW.tipo,
    'fecha', NEW.fecha,
    'hora', NEW.hora,
    'propiedad_id', NEW.propiedad_id,
    'estado', 'cancelada'
  );

  -- Avisar a cada participante que NO haya sido quien canceló.
  -- `IS DISTINCT FROM` trata NULL correctamente: si v_canceller es NULL
  -- (no se sabe quién canceló), ambos reciben aviso.
  IF NEW.agente_id IS NOT NULL AND v_canceller IS DISTINCT FROM NEW.agente_id THEN
    PERFORM enviar_notificacion_push(
      NEW.agente_id, 'Cita cancelada', v_mensaje, 'AppointmentDetail', v_data
    );
  END IF;

  IF NEW.cliente_id IS NOT NULL AND v_canceller IS DISTINCT FROM NEW.cliente_id THEN
    PERFORM enviar_notificacion_push(
      NEW.cliente_id, 'Cita cancelada', v_mensaje, 'AppointmentDetail', v_data
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- El WHEN asegura que solo dispare en la TRANSICIÓN a 'cancelada' (no en cada
-- update ni si ya estaba cancelada).
DROP TRIGGER IF EXISTS notificar_cita_cancelada ON public.citas;
CREATE TRIGGER notificar_cita_cancelada
  AFTER UPDATE ON public.citas
  FOR EACH ROW
  WHEN (NEW.estado = 'cancelada' AND OLD.estado IS DISTINCT FROM 'cancelada')
  EXECUTE FUNCTION notificar_cita_cancelada();
