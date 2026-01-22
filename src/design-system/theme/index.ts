import { useColorScheme } from 'react-native';
import { COLORS } from '../../constants/colors';

export const lightTheme = {
  colors: {
    ...COLORS,
    background: COLORS.white,
    surface: COLORS.background,
    text: COLORS.textPrimary,
    textSecondary: COLORS.textSecondary,
    border: COLORS.cardBorder,
    inputBackground: COLORS.background,
    placeholder: COLORS.textTertiary,
  },
};

export const darkTheme = {
  colors: {
    ...COLORS,
    background: COLORS.backgroundDeep,
    surface: COLORS.darkSurface,
    text: COLORS.white,
    textSecondary: COLORS.textTertiary,
    border: COLORS.darkBorder,
    inputBackground: COLORS.darkSurface,
    placeholder: COLORS.textDisabled,
  },
};

export const useAppTheme = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  return {
    ...theme,
    colors: isDark ? darkTheme.colors : lightTheme.colors,
    isDark,
  };
};

export const theme = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 20,
    full: 9999,
  },
  typography: {
    fontSizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
    },
    fontWeights: {
      normal: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
  },
};
