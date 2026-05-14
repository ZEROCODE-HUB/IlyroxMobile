import React, { useState, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../../../design-system/components/AppInput";
import RadioGroupSelector from "../../common/RadioGroupSelector";
import { COLORS } from "../../../constants/colors";
import { OPCIONES_SI_NO } from "../../../constants/propertyData";
import type { SiNo, ComisionValues, ComisionSetters } from "./types";
import { usePropertyFormContext } from "./PropertyFormContext";

const THUMB = 22;
const TRACK_H = 6;
const ZONE_H = 48;

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

function CommissionSlider({ label, value, onChange, min, max, step, formatValue, hint, onScrollLock }: SliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const viewRef = useRef<View>(null);
  const pageXRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const numVal = Math.max(min, Math.min(max, parseFloat(value) || min));
  const usable = Math.max(1, trackWidth - THUMB);
  const thumbLeft = ((numVal - min) / (max - min)) * usable;

  const resolve = (px: number) => {
    const localX = px - pageXRef.current;
    const ratio = Math.max(0, Math.min(1, (localX - THUMB / 2) / usable));
    const raw = min + ratio * (max - min);
    const snapped = Math.round(raw / step) * step;
    onChangeRef.current(String(Math.round(Math.max(min, Math.min(max, snapped)) * 100) / 100));
  };

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.sliderValue}>{formatValue(numVal)}</Text>
      </View>

      <View
        ref={viewRef}
        style={styles.touchZone}
        onLayout={(e) => {
          setTrackWidth(e.nativeEvent.layout.width);
          viewRef.current?.measure((_x, _y, _w, _h, px) => { pageXRef.current = px; });
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          onScrollLock?.(false);
          viewRef.current?.measure((_x, _y, _w, _h, px) => { pageXRef.current = px; });
          resolve(e.nativeEvent.pageX);
        }}
        onResponderMove={(e) => resolve(e.nativeEvent.pageX)}
        onResponderRelease={() => onScrollLock?.(true)}
        onResponderTerminate={() => onScrollLock?.(true)}
      >
        <View style={styles.track} />
        {trackWidth > 0 && (
          <View style={[styles.trackFill, { width: thumbLeft + THUMB / 2 }]} />
        )}
        {trackWidth > 0 && (
          <View style={[styles.thumb, { left: thumbLeft }]} />
        )}
      </View>

      <View style={styles.sliderEnds}>
        <Text style={styles.sliderEndText}>{formatValue(min)}</Text>
        {hint ? <Text style={styles.sliderHint}>≈ {hint}</Text> : null}
        <Text style={styles.sliderEndText}>{formatValue(max)}</Text>
      </View>
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

  const ventaValues: ComisionValues = {
    comparte: form.comparteComision,
    tipo: form.comisionTipo,
    valor: form.comisionValor,
    compartidaTipo: form.comisionCompartidaTipo,
    compartidaValor: form.comisionCompartidaValor,
    condiciones: form.condicionesComision,
  };
  const ventaSetters: ComisionSetters = {
    setComparte: form.setComparteComision,
    setTipo: form.setComisionTipo,
    setValor: form.setComisionValor,
    setCompartidaTipo: form.setComisionCompartidaTipo,
    setCompartidaValor: form.setComisionCompartidaValor,
    setCondiciones: form.setCondicionesComision,
  };
  const rentaValues: ComisionValues = {
    comparte: form.comparteComisionRenta,
    tipo: form.comisionTipoRenta,
    valor: form.comisionValorRenta,
    compartidaTipo: form.comisionCompartidaTipoRenta,
    compartidaValor: form.comisionCompartidaValorRenta,
    condiciones: form.condicionesComisionRenta,
  };
  const rentaSetters: ComisionSetters = {
    setComparte: form.setComparteComisionRenta,
    setTipo: form.setComisionTipoRenta,
    setValor: form.setComisionValorRenta,
    setCompartidaTipo: form.setComisionCompartidaTipoRenta,
    setCompartidaValor: form.setComisionCompartidaValorRenta,
    setCondiciones: form.setCondicionesComisionRenta,
  };

  // ── VENTA ──────────────────────────────────────────────────────────────────
  const renderVentaForm = (
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

        <CommissionSlider
          label="Mi comisión"
          value={values.valor}
          onChange={setters.setValor}
          min={0} max={10} step={0.5}
          formatValue={fmtPct}
          hint={precio > 0 ? formatMXN(miMonto) : undefined}
          onScrollLock={onScrollLock}
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
              min={0} max={100} step={5}
              formatValue={fmtPct}
              hint={precio > 0 ? formatMXN(compartoMonto) : undefined}
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
              <Text style={[styles.summaryAmount, styles.summaryAmountShare]}>
                {precio > 0 ? formatMXN(compartoMonto) : `${sharePct}% de mi comisión`}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // ── RENTA ──────────────────────────────────────────────────────────────────
  const renderRentaForm = (
    title: string,
    values: ComisionValues,
    setters: ComisionSetters,
    withTopBorder = false,
  ) => {
    const precioRenta = parseFloat(form.precioRenta.replace(/,/g, "")) || 0;
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
          min={0.5} max={3} step={0.5}
          formatValue={formatMeses}
          hint={precioRenta > 0 ? formatMXN(miMonto) : undefined}
          onScrollLock={onScrollLock}
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
              min={0} max={100} step={5}
              formatValue={fmtPct}
              hint={precioRenta > 0 ? formatMXN(compartoMonto) : undefined}
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
              <Text style={[styles.summaryAmount, styles.summaryAmountShare]}>
                {precioRenta > 0 ? formatMXN(compartoMonto) : `${sharePct}% de mi comisión`}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const isRenta = tipoOperacion === "renta";
  const isAmbas = tipoOperacion === "ambas";

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderBand}>
        <Ionicons name="cash-outline" size={18} color={COLORS.primary} />
        <Text style={styles.sectionTitleBand}>Comisión</Text>
      </View>

      {!isRenta &&
        renderVentaForm(isAmbas ? "Comisión para Venta" : "", ventaValues, ventaSetters)}

      {(isRenta || isAmbas) &&
        renderRentaForm(
          isAmbas ? "Comisión para Renta" : "",
          isAmbas ? rentaValues : ventaValues,
          isAmbas ? rentaSetters : ventaSetters,
          isAmbas,
        )}
    </View>
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
  // Slider
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
  // Resumen de montos
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
});
