import React, { useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "@/constants/colors";
import { usePropertyFiltersStore } from "@/store/propertyFiltersStore";

const THUMB = 22;
const TRACK_H = 6;
const ZONE_H = 48;

interface FilterSliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
  step: number;
  formatValue: (n: number) => string;
  onScrollLock?: (locked: boolean) => void;
}

function FilterSlider({ label, value, onChange, max, step, formatValue, onScrollLock }: FilterSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const viewRef = useRef<View>(null);
  const pageXRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const usable = Math.max(1, trackWidth - THUMB);
  const thumbLeft = (value / max) * usable;

  const resolve = (px: number) => {
    const localX = px - pageXRef.current;
    const ratio = Math.max(0, Math.min(1, (localX - THUMB / 2) / usable));
    const raw = ratio * max;
    const snapped = Math.round(raw / step) * step;
    onChangeRef.current(Math.round(Math.max(0, Math.min(max, snapped)) * 100) / 100);
  };

  // Solo se agarra el gesto si el toque cae sobre la bolita (con holgura), para
  // que un scroll vertical que roce la barra no cambie el valor por accidente.
  const HIT_SLOP = 16;
  const isOnThumb = (locationX: number) =>
    locationX >= thumbLeft - HIT_SLOP &&
    locationX <= thumbLeft + THUMB + HIT_SLOP;

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.sliderValue, value <= 0 && styles.sliderValueEmpty]}>
          {value <= 0 ? "Cualquiera" : formatValue(value)}
        </Text>
      </View>

      <View
        ref={viewRef}
        style={styles.touchZone}
        onLayout={(e) => {
          setTrackWidth(e.nativeEvent.layout.width);
          viewRef.current?.measure((_x, _y, _w, _h, px) => {
            pageXRef.current = px;
          });
        }}
        onStartShouldSetResponder={(e) => isOnThumb(e.nativeEvent.locationX)}
        onMoveShouldSetResponder={() => false}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          onScrollLock?.(false);
          viewRef.current?.measure((_x, _y, _w, _h, px) => {
            pageXRef.current = px;
          });
          resolve(e.nativeEvent.pageX);
        }}
        onResponderMove={(e) => resolve(e.nativeEvent.pageX)}
        onResponderRelease={() => onScrollLock?.(true)}
        onResponderTerminate={() => onScrollLock?.(true)}
      >
        <View style={styles.track} />
        {trackWidth > 0 && (
          <View style={[styles.trackFill, { width: Math.max(0, thumbLeft) + THUMB / 2 }]} />
        )}
        {trackWidth > 0 && (
          <View style={[styles.thumb, value <= 0 && styles.thumbEmpty, { left: thumbLeft }]} />
        )}
      </View>

      <View style={styles.sliderEnds}>
        <Text style={styles.sliderEndText}>Cualquiera</Text>
        <Text style={styles.sliderEndText}>{formatValue(max)}</Text>
      </View>
    </View>
  );
}

const fmtPct = (v: number) => `${v}%`;

function formatMeses(n: number): string {
  const whole = Math.floor(n);
  const half = n % 1 !== 0;
  if (n === 0.5) return "½ mes";
  if (!half) return `${whole} ${whole === 1 ? "mes" : "meses"}`;
  return `${whole}½ meses`;
}

interface CommissionFilterSectionProps {
  onScrollLock?: (locked: boolean) => void;
}

export function CommissionFilterSection({ onScrollLock }: CommissionFilterSectionProps) {
  const { filters, updateFilter } = usePropertyFiltersStore();

  const isRentaOnly = filters.operacion === "renta";
  const isVentaOnly = filters.operacion === "venta";

  const ventaVal = parseFloat(filters.comisionVentaMin) || 0;
  const rentaVal = parseFloat(filters.comisionRentaMin) || 0;

  return (
    <View>
      {!isRentaOnly && (
        <FilterSlider
          label="Comisión Venta mínima"
          value={ventaVal}
          onChange={(v) => updateFilter("comisionVentaMin", v > 0 ? String(v) : "")}
          max={10}
          step={0.5}
          formatValue={fmtPct}
          onScrollLock={onScrollLock}
        />
      )}
      {!isVentaOnly && (
        <FilterSlider
          label="Comisión Renta mínima"
          value={rentaVal}
          onChange={(v) => updateFilter("comisionRentaMin", v > 0 ? String(v) : "")}
          max={3}
          step={0.5}
          formatValue={formatMeses}
          onScrollLock={onScrollLock}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sliderContainer: {
    marginBottom: 20,
  },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  sliderValue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
  },
  sliderValueEmpty: {
    fontSize: 14,
    fontWeight: "400",
    color: COLORS.textTertiary,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  thumbEmpty: {
    backgroundColor: COLORS.cardBorder,
  },
  sliderEnds: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  sliderEndText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});
