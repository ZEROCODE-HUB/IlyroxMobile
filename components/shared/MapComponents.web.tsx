import React from 'react';
import { View } from 'react-native';

class MapView extends React.Component<any> {
  animateToRegion() {}
  setNativeProps() {}
  render() {
    return <View {...this.props} />;
  }
}

const Marker = (props: any) => <View {...props} />;

export const PROVIDER_DEFAULT = 'default';
export const PROVIDER_GOOGLE = 'google';

export default MapView;
export { Marker };

// Mock types for web
export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type MapPressEvent = {
  nativeEvent: {
    coordinate: {
      latitude: number;
      longitude: number;
    };
  };
};
