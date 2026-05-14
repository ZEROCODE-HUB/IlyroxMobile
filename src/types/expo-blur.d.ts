declare module "expo-blur" {
  import React from "react";
  interface BlurViewProps {
    intensity?: number;
    tint?: "light" | "dark" | "default";
    style?: any;
    children?: React.ReactNode;
  }
  export const BlurView: React.FC<BlurViewProps>;
}
