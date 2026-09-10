import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { AppInput } from "../../../design-system/components/AppInput";
import { COLORS } from "../../../constants/colors";

interface CountryPrefixInputProps {
  countryCode?: string;
  flag?: string;
  maxDigits?: number;
  value?: string;
  onChangeText?: (fullNumber: string) => void;
  error?: string;
  placeholder?: string;
  onBlur?: () => void;
}

export function CountryPrefixInput({
  countryCode = "+52",
  flag = "🇲🇽",
  maxDigits = 10,
  value = "",
  onChangeText,
  error,
  placeholder = "Número celular",
  onBlur,
}: CountryPrefixInputProps) {
  const nationalNumber = value.startsWith(countryCode)
    ? value.slice(countryCode.length)
    : value;

  const handleNationalChange = (national: string) => {
    const numericNational = national.replace(/[^0-9]/g, "").slice(0, maxDigits);
    const fullNumber = countryCode + numericNational;
    onChangeText?.(fullNumber);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.prefixBox, error && styles.prefixBoxError]}>
        <Text style={styles.flag}>{flag}</Text>
        <Text style={styles.prefixText}>{countryCode}</Text>
      </View>
      <View style={styles.inputWrapper}>
        <AppInput
          value={nationalNumber}
          onChangeText={handleNationalChange}
          keyboardType="phone-pad"
          placeholder={placeholder}
          error={error}
          onBlur={onBlur}
          maxLength={maxDigits}
          textContentType="telephoneNumber"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
  },
  prefixBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 52,
    gap: 4,
  },
  prefixBoxError: {
    borderColor: COLORS.error,
  },
  flag: {
    fontSize: 20,
  },
  prefixText: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  inputWrapper: {
    flex: 1,
  },
});
