import { ViewStyle, Platform } from 'react-native';
import { COLORS } from '../../constants/colors';

export const shadows = {
  sm: {
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.18,
        shadowRadius: 1.0,
      },
      android: {
        elevation: 1,
      },
    }),
  } as ViewStyle,
  md: {
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 3,
      },
    }),
  } as ViewStyle,
  lg: {
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
      },
      android: {
        elevation: 6,
      },
    }),
  } as ViewStyle,
};

export const layout = {
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  spaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
};
