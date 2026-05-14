import React, { createContext, useContext } from "react";
import type { usePropertyForm } from "./usePropertyForm";

type PropertyFormContextValue = ReturnType<typeof usePropertyForm>;

const PropertyFormContext = createContext<PropertyFormContextValue | null>(null);

export function PropertyFormProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: PropertyFormContextValue;
}) {
  return (
    <PropertyFormContext.Provider value={value}>
      {children}
    </PropertyFormContext.Provider>
  );
}

export function usePropertyFormContext(): PropertyFormContextValue {
  const ctx = useContext(PropertyFormContext);
  if (!ctx) throw new Error("usePropertyFormContext must be used inside PropertyFormProvider");
  return ctx;
}
