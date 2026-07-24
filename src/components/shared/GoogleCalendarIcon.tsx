import React from "react";
import Svg, { Path } from "react-native-svg";

interface GoogleCalendarIconProps {
  size?: number;
}

/**
 * Logo de Google Calendar dibujado con react-native-svg.
 *
 * Antes se cargaba el .svg del disco con el <Image> de expo-image, que lo
 * rasteriza: en algunos dispositivos el fondo transparente salía NEGRO (el
 * archivo traía además un <rect fill="#ffffff01">, casi invisible, que empeoraba
 * la mezcla del canal alfa). Dibujarlo como vector se ve igual en todos lados y
 * no depende del rasterizador de imágenes.
 *
 * Trazado original: SVG Repo (viewBox 0 0 512 512), sin el rect de fondo.
 */
export const GoogleCalendarIcon: React.FC<GoogleCalendarIconProps> = ({
  size = 16,
}) => (
  <Svg width={size} height={size} viewBox="0 0 512 512">
    <Path d="M100 340h74V174H340v-74H137Q100 100 100 135" fill="#4285f4" />
    <Path d="M338 100v76h74v-41q0-35-35-35" fill="#1967d2" />
    <Path d="M338 174h74V338h-74" fill="#fbbc04" />
    <Path d="M100 338v39q0 35 35 35h41v-74" fill="#188038" />
    <Path d="M174 338H338v74H174" fill="#34a853" />
    <Path d="M338 412v-74h74" fill="#ea4335" />
    <Path
      d="M204 229a25 22 1 1 1 25 27h-9h9a25 22 1 1 1-25 27M270 231l27-19h4v-7V308"
      stroke="#4285f4"
      strokeWidth={15}
      strokeLinejoin="bevel"
      fill="none"
    />
  </Svg>
);
