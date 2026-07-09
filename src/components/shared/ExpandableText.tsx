import React, { useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  NativeSyntheticEvent,
  TextLayoutEventData,
} from "react-native";
import { COLORS } from "../../constants";
import { RichText } from "./RichText";

interface ExpandableTextProps {
  text: string;
  userName?: string;
  maxLines?: number;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  /** Renderiza el texto con RichText (interpreta los tokens [ICON:...]). */
  richContent?: boolean;
  /** Color de los iconos cuando richContent está activo. */
  iconColor?: string;
  /**
   * Si es true, solo la etiqueta "ver más" alterna la expansión; el resto del
   * texto no captura el toque (lo deja pasar al contenedor padre, p. ej. para
   * abrir el post). Si es false (por defecto), tocar todo el bloque alterna.
   */
  labelTogglesOnly?: boolean;
}

const ExpandableText: React.FC<ExpandableTextProps> = ({
  text,
  userName,
  maxLines = 2,
  style,
  containerStyle,
  richContent = false,
  iconColor,
  labelTogglesOnly = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowMore, setShouldShowMore] = useState(false);
  const [measured, setMeasured] = useState(false);

  const toggleExpand = () => setIsExpanded((v) => !v);

  // Medición fiable en iOS y Android: una copia OCULTA sin numberOfLines
  // reporta el total real de líneas. No se puede usar el onTextLayout del
  // <Text> ya truncado porque en Android solo devuelve las líneas visibles
  // (== maxLines), y el "ver más" nunca aparecía.
  const handleMeasureLayout = (
    e: NativeSyntheticEvent<TextLayoutEventData>,
  ) => {
    if (measured) return;
    setMeasured(true);
    setShouldShowMore(e.nativeEvent.lines.length > maxLines);
  };

  const textStyle = [styles.text, style];
  const measurerStyle = [styles.text, style, styles.measurer];

  // Cuando solo la etiqueta alterna, el contenedor es un View pasivo que deja
  // pasar el toque al padre; si no, es un TouchableOpacity que alterna al tocar.
  const Container: React.ComponentType<any> = labelTogglesOnly
    ? View
    : TouchableOpacity;
  const containerProps = labelTogglesOnly
    ? {}
    : { activeOpacity: 0.8, onPress: toggleExpand };

  return (
    <Container
      {...containerProps}
      style={[styles.container, containerStyle]}
    >
      {/* Copia oculta para medir el total de líneas (una sola vez). */}
      {!measured &&
        (richContent ? (
          <RichText
            content={text}
            style={measurerStyle}
            iconColor={iconColor}
            onTextLayout={handleMeasureLayout}
          />
        ) : (
          <Text style={measurerStyle} onTextLayout={handleMeasureLayout}>
            {userName ? (
              <Text style={styles.userName}>{userName} </Text>
            ) : null}
            {text}
          </Text>
        ))}

      {/* Texto visible: truncado a maxLines o completo si está expandido. */}
      {richContent ? (
        <RichText
          content={text}
          style={textStyle}
          iconColor={iconColor}
          numberOfLines={isExpanded ? undefined : maxLines}
        />
      ) : (
        <Text
          style={textStyle}
          numberOfLines={isExpanded ? undefined : maxLines}
        >
          {userName && <Text style={styles.userName}>{userName} </Text>}
          {text}
        </Text>
      )}

      {shouldShowMore && (
        <Text
          style={styles.seeMore}
          onPress={labelTogglesOnly ? toggleExpand : undefined}
          suppressHighlighting
        >
          {isExpanded ? "ver menos" : "ver más"}
        </Text>
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  text: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  // Fuera de flujo y transparente: solo existe para medir el nº real de líneas.
  measurer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    opacity: 0,
  },
  userName: {
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  seeMore: {
    color: COLORS.textSecondary,
    fontWeight: "600",
    fontSize: 13,
    marginTop: 2,
  },
});

export default ExpandableText;
