import React, { useState, useRef, useMemo, useCallback, useEffect, memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../../../design-system/components/AppInput";
import RadioGroupSelector from "../../common/RadioGroupSelector";
import { COLORS } from "../../../constants/colors";
import { OPCIONES_SI_NO } from "../../../constants/propertyData";
import type { SiNo, ComisionValues, ComisionSetters } from "./types";
import { usePropertyFormContext } from "./PropertyFormContext";
import { FieldAnchor } from "./fieldAnchors";

const THUMB = 22;
const TRACK_H = 6;
const ZONE_H = 48;

// ── Helper: debounce simple.
// Mantiene el timer en un ref; cancela y reinicia cada vez que se llama.
// Cuando por fin para (el timer llega a 0), llama a `fn` con el último valor.
function useDebounceCallback(fn: () => void, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const fire = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    fnRef.current();
  }, []);

  const schedule = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(fire, delay);
  }, [delay, fire]);

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  return { schedule, cancel };
}

interface SliderProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  min: number;
  max: number;
  step: number;
  formatValue: (n: number) => string;
  hint?: string;
  onScrollLock?: (locked: boolean) => void;
}

// Slider simple: el thumb sigue el dedo con estado local.
// Solo el update al FORM (onChange) se debouncea 500ms.
function CommissionSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  formatValue,
  hint,
  onScrollLock,
}: SliderProps) {
  const [trackW, setTrackW] = useState(0);
  // Valor que se muestra en el display y donde está el thumb visualmente.
  // Se actualiza INMEDIATAMENTE en cada movimiento del dedo.
  const [localVal, setLocalVal] = useState(() =>
    Math.max(min, Math.min(max, parseFloat(value) || min)),
  );
  const trackWRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const dragging = useRef(false);

  // Valor que se mandará al form cuando el timer expire.
  const pendingVal = useRef("");

  const { schedule, cancel } = useDebounceCallback(() => {
    if (pendingVal.current) {
      onChangeRef.current(pendingVal.current);
      pendingVal.current = "";
    }
  }, 500);

  // Cuando el form cambia el valor desde fuera (chip, etc), sincroniza.
  useEffect(() => {
    if (!dragging.current) {
      setLocalVal(Math.max(min, Math.min(max, parseFloat(value) || min)));
    }
  }, [value, min, max]);

  const computeVal = (x: number): number => {
    const usable = trackWRef.current - THUMB;
    if (usable <= 0) return localVal;
    const ratio = Math.max(0, Math.min(1, (x - THUMB / 2) / usable));
    const raw = min + ratio * (max - min);
    const snapped = Math.round(raw / step) * step;
    return Math.max(min, Math.min(max, snapped));
  };

  const onMove = (x: number) => {
    const v = computeVal(x);
    pendingVal.current = String(Math.round(v * 100) / 100);
    setLocalVal(v); // display inmediato
    schedule();     // programa onChange al form en 500ms
  };

  const onRelease = (x: number) => {
    cancel();
    onScrollLock?.(true);
    dragging.current = false;
    const v = computeVal(x);
    if (pendingVal.current) {
      onChangeRef.current(pendingVal.current);
      pendingVal.current = "";
    }
    setLocalVal(v);
  };

  const thumbLeft =
    trackW > THUMB
      ? ((localVal - min) / (max - min)) * (trackW - THUMB)
      : 0;
  const fillW = thumbLeft + THUMB / 2;

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.sliderValue}>{formatValue(localVal)}</Text>
      </View>

      <View
        style={styles.touchZone}
        onLayout={(e) => {
          trackWRef.current = e.nativeEvent.layout.width;
          setTrackW(e.nativeEvent.layout.width);
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => false}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          dragging.current = true;
          onScrollLock?.(false);
          onMove(e.nativeEvent.locationX);
        }}
        onResponderMove={(e) => onMove(e.nativeEvent.locationX)}
        onResponderRelease={(e) => onRelease(e.nativeEvent.locationX)}
        onResponderTerminate={() => {
          if (dragging.current) {
            dragging.current = false;
            onScrollLock?.(true);
          }
        }}
      >
        <View style={styles.track} />
        {trackW > 0 && <View style={[styles.trackFill, { width: fillW }]} />}
        {trackW > 0 && <View style={[styles.thumb, { left: thumbLeft }]} />}
      </View>

      <View style={styles.sliderEnds}>
        <Text style={styles.sliderEndText}>{formatValue(min)}</Text>
        {hint ? <Text style={styles.sliderHint}>≈ {hint}</Text> : null}
        <Text style={styles.sliderEndText}>{formatValue(max)}</Text>
      </View>
    </View>
  );
}

// ── Chip de porcentaje ────────────────────────────────────────────────────────
const PresetChip = memo(function PresetChip({
  pct,
  active,
  onPress,
}: {
  pct: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.presetChip, active && styles.presetChipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.presetChipText,
          active && styles.presetChipTextActive,
        ]}
      >
        {pct}%
      </Text>
    </TouchableOpacity>
  );
});

function formatMeses(n: number): string {
  const whole = Math.floor(n);
  const half = n % 1 !== 0;
  if (n === 0.5) return "½ mes";
  if (!half) return `${whole} ${whole === 1 ? "mes" : "meses"}`;
  return `${whole}½ meses`;
}

function formatMXN(n: number): string {
  if (n <= 0) return "";
  const s = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `$${s} MXN`;
}

const fmtPct = (v: number) => `${v}%`;

// ─── Componente principal ─────────────────────────────────────────────────────
export const CommissionSection = React.memo(function CommissionSection({
  onScrollLock,
}: {
  onScrollLock?: (locked: boolean) => void;
}) {
  const form = usePropertyFormContext();
  const { tipoOperacion } = form;

  // onScrollLock se memoiza para que sea la MISMA función cada render.
  // Sin esto, cada render del padre crea una función nueva y se la pasa al
  // CommissionSlider, rompiendo su memo interno (aunque la comparación de value
  // seguiría funcionando, evita re-renders innecesarios del padre).
  const handleScrollLock = useCallback(
    (locked: boolean) => onScrollLock?.(locked),
    [onScrollLock],
  );

  const ventaValues = useMemo<ComisionValues>(
    (): ComisionValues => ({
      comparte: form.comparteComision,
      tipo: form.comisionTipo,
      valor: form.comisionValor,
      compartidaTipo: form.comisionCompartidaTipo,
      compartidaValor: form.comisionCompartidaValor,
      condiciones: form.condicionesComision,
    }),
    [
      form.comparteComision,
      form.comisionTipo,
      form.comisionValor,
      form.comisionCompartidaTipo,
      form.comisionCompartidaValor,
      form.condicionesComision,
    ],
  );
  const ventaSetters = useMemo<ComisionSetters>(
    (): ComisionSetters => ({
      setComparte: form.setComparteComision,
      setTipo: form.setComisionTipo,
      setValor: form.setComisionValor,
      setCompartidaTipo: form.setComisionCompartidaTipo,
      setCompartidaValor: form.setComisionCompartidaValor,
      setCondiciones: form.setCondicionesComision,
    }),
    [
      form.setComparteComision,
      form.setComisionTipo,
      form.setComisionValor,
      form.setComisionCompartidaTipo,
      form.setComisionCompartidaValor,
      form.setCondicionesComision,
    ],
  );
  const rentaValues = useMemo<ComisionValues>(
    (): ComisionValues => ({
      comparte: form.comparteComisionRenta,
      tipo: form.comisionTipoRenta,
      valor: form.comisionValorRenta,
      compartidaTipo: form.comisionCompartidaTipoRenta,
      compartidaValor: form.comisionCompartidaValorRenta,
      condiciones: form.condicionesComisionRenta,
    }),
    [
      form.comparteComisionRenta,
      form.comisionTipoRenta,
      form.comisionValorRenta,
      form.comisionCompartidaTipoRenta,
      form.comisionCompartidaValorRenta,
      form.condicionesComisionRenta,
    ],
  );
  const rentaSetters = useMemo<ComisionSetters>(
    (): ComisionSetters => ({
      setComparte: form.setComparteComisionRenta,
      setTipo: form.setComisionTipoRenta,
      setValor: form.setComisionValorRenta,
      setCompartidaTipo: form.setComisionCompartidaTipoRenta,
      setCompartidaValor: form.setComisionCompartidaValorRenta,
      setCondiciones: form.setCondicionesComisionRenta,
    }),
    [
      form.setComparteComisionRenta,
      form.setComisionTipoRenta,
      form.setComisionValorRenta,
      form.setComisionCompartidaTipoRenta,
      form.setComisionCompartidaValorRenta,
      form.setCondicionesComisionRenta,
    ],
  );

  // ── VENTA ──────────────────────────────────────────────────────────────────
  const renderVentaForm = useCallback(
    (
      title: string,
      values: ComisionValues,
      setters: ComisionSetters,
      withTopBorder = false,
    ) => {
      const precio = parseFloat(form.precioVenta.replace(/,/g, "")) || 0;
      const miPct = parseFloat(values.valor) || 0;
      const miMonto = precio * miPct / 100;
      const sharePct = parseFloat(values.compartidaValor) || 0;
      const compartoMonto = miMonto * sharePct / 100;

      return (
        <View style={withTopBorder ? styles.secondSection : undefined}>
          {!!title && <Text style={styles.operationTitle}>{title}</Text>}

          <View style={styles.presetRow}>
            {[2, 3, 4, 5, 8, 10].map((p) => (
              <PresetChip
                key={p}
                pct={p}
                active={parseFloat(values.valor) === p}
                onPress={() => setters.setValor(String(p))}
              />
            ))}
          </View>

          <CommissionSlider
            label="Mi comisión"
            value={values.valor}
            onChange={setters.setValor}
            min={0}
            max={20}
            step={0.5}
            formatValue={fmtPct}
            hint={precio > 0 ? formatMXN(miMonto) : undefined}
            onScrollLock={handleScrollLock}
          />

          <RadioGroupSelector
            label="¿Compartes comisión?"
            options={[...OPCIONES_SI_NO]}
            selectedValue={values.comparte}
            onSelect={(val) => setters.setComparte(val as SiNo)}
          />

          {values.comparte === "Sí" && (
            <View>
              <CommissionSlider
                label="Comparto (% de mi comisión)"
                value={values.compartidaValor}
                onChange={setters.setCompartidaValor}
                min={0}
                max={100}
                step={5}
                formatValue={fmtPct}
                hint={precio > 0 ? formatMXN(compartoMonto) : undefined}
                onScrollLock={handleScrollLock}
              />
              <AppInput
                label="Condiciones (opcional)"
                placeholder="Detalles de la comisión compartida..."
                value={values.condiciones}
                onChangeText={setters.setCondiciones}
                multiline
                numberOfLines={3}
                inputStyle={styles.textArea}
              />
            </View>
          )}

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Mi comisión</Text>
              <Text style={styles.summaryAmount}>
                {precio > 0 ? formatMXN(miMonto) : `${miPct}% del precio`}
              </Text>
            </View>
            {values.comparte === "Sí" && (
              <View style={[styles.summaryItem, styles.summaryItemRight]}>
                <Text style={styles.summaryLabel}>Comparto</Text>
                <Text
                  style={[
                    styles.summaryAmount,
                    styles.summaryAmountShare,
                  ]}
                >
                  {precio > 0
                    ? formatMXN(compartoMonto)
                    : `${sharePct}% de mi comisión`}
                </Text>
              </View>
            )}
          </View>
        </View>
      );
    },
    [form.precioVenta, ventaValues, ventaSetters, handleScrollLock],
  );

  // ── RENTA ──────────────────────────────────────────────────────────────────
  const renderRentaForm = useCallback(
    (
      title: string,
      values: ComisionValues,
      setters: ComisionSetters,
      withTopBorder = false,
    ) => {
      const precioRenta =
        parseFloat(form.precioRenta.replace(/,/g, "")) || 0;
      const meses = parseFloat(values.valor) || 0;
      const miMonto = precioRenta * meses;
      const sharePct = parseFloat(values.compartidaValor) || 0;
      const compartoMonto = miMonto * sharePct / 100;

      return (
        <View style={withTopBorder ? styles.secondSection : undefined}>
          {!!title && <Text style={styles.operationTitle}>{title}</Text>}

          <CommissionSlider
            label="Mi comisión"
            value={values.valor}
            onChange={setters.setValor}
            min={0.5}
            max={3}
            step={0.5}
            formatValue={formatMeses}
            hint={precioRenta > 0 ? formatMXN(miMonto) : undefined}
            onScrollLock={handleScrollLock}
          />

          <RadioGroupSelector
            label="¿Compartes comisión?"
            options={[...OPCIONES_SI_NO]}
            selectedValue={values.comparte}
            onSelect={(val) => setters.setComparte(val as SiNo)}
          />

          {values.comparte === "Sí" && (
            <View>
              <CommissionSlider
                label="Comparto (% de mi comisión)"
                value={values.compartidaValor}
                onChange={setters.setCompartidaValor}
                min={0}
                max={100}
                step={5}
                formatValue={fmtPct}
                hint={precioRenta > 0 ? formatMXN(compartoMonto) : undefined}
                onScrollLock={handleScrollLock}
              />
              <AppInput
                label="Condiciones (opcional)"
                placeholder="Detalles de la comisión compartida..."
                value={values.condiciones}
                onChangeText={setters.setCondiciones}
                multiline
                numberOfLines={3}
                inputStyle={styles.textArea}
              />
            </View>
          )}

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Mi comisión</Text>
              <Text style={styles.summaryAmount}>
                {precioRenta > 0 ? formatMXN(miMonto) : formatMeses(meses)}
              </Text>
            </View>
            {values.comparte === "Sí" && (
              <View style={[styles.summaryItem, styles.summaryItemRight]}>
                <Text style={styles.summaryLabel}>Comparto</Text>
                <Text
                  style={[
                    styles.summaryAmount,
                    styles.summaryAmountShare,
                  ]}
                >
                  {precioRenta > 0
                    ? formatMXN(compartoMonto)
                    : `${sharePct}% de mi comisión`}
                </Text>
              </View>
            )}
          </View>
        </View>
      );
    },
    [form.precioRenta, rentaValues, rentaSetters, handleScrollLock],
  );

  const isRenta = tipoOperacion === "renta";
  const isAmbas = tipoOperacion === "ambas";

  const comisionError = form.errors.comision || form.errors.comisionRenta;

  return (
    <FieldAnchor name="commission">
      <View style={[styles.section, comisionError && styles.sectionError]}>
        <View style={styles.sectionHeaderBand}>
          <Ionicons name="cash-outline" size={18} color={COLORS.primary} />
          <Text style={styles.sectionTitleBand}>Comisión</Text>
        </View>

        {comisionError && (
          <Text style={styles.errorText}>{comisionError}</Text>
        )}

        {!isRenta &&
          renderVentaForm(
            isAmbas ? "Comisión para Venta" : "",
            ventaValues,
            ventaSetters,
          )}

        {(isRenta || isAmbas) &&
          renderRentaForm(
            isAmbas ? "Comisión para Renta" : "",
            isAmbas ? rentaValues : ventaValues,
            isAmbas ? rentaSetters : ventaSetters,
            isAmbas,
          )}
      </View>
    </FieldAnchor>
  );
});

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionError: {
    borderColor: COLORS.error,
  },
  sectionHeaderBand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primary + "12",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  sectionTitleBand: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: -8,
    marginBottom: 12,
  },
  operationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  secondSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
  },
  textArea: {
    height: 100,
    width: "100%",
    textAlignVertical: "top",
    fontSize: 15,
    padding: 14,
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sliderValue: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.primary,
  },
  touchZone: {
    height: ZONE_H,
    justifyContent: "center",
  },
  track: {
    position: "absolute",
    left: 0,
    right: 0,
    top: (ZONE_H - TRACK_H) / 2,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    backgroundColor: COLORS.cardBorder,
  },
  trackFill: {
    position: "absolute",
    left: 0,
    top: (ZONE_H - TRACK_H) / 2,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    backgroundColor: COLORS.primary,
  },
  thumb: {
    position: "absolute",
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: COLORS.primary,
    top: (ZONE_H - THUMB) / 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  sliderEnds: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  sliderEndText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  sliderHint: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  summaryRow: {
    flexDirection: "row",
    backgroundColor: COLORS.background ?? "#F5F5F5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  summaryItem: {
    flex: 1,
  },
  summaryItemRight: {
    alignItems: "flex-end",
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  summaryAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  summaryAmountShare: {
    color: COLORS.primary,
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
  },
  presetChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  presetChipTextActive: {
    color: COLORS.white,
  },
});
