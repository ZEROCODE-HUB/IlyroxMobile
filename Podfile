require File.join(File.dirname(__FILE__), '.xcode.env')

# Forzar el pod correcto para react-native-maps 1.21+
# El prebuild de Expo genera un Podfile que busca el pod legacy
# "react-native-google-maps" (de versiones 1.20.x). Este override fuerza
# el pod nuevo "react-native-maps" que sí viene con la versión 1.29.x.
pod 'react-native-maps', :path => '../node_modules/react-native-maps'

target 'ilyrox' do
  use_expo_modules!
  config = use_native_config!

  use_react_native!(
    :path => config[:reactNativePath],
    # Animate is disabled by default, but it interferes with the lookAndFeel of the
    # default splash screen on Android when opening the app from a cold start.
    :disable_animates => false,
    # Hermes is enabled by default, but the template app ships with a different
    # configuration. Re-enable it to take advantage of the performance benefits.
    :hermes_enabled => true,
    # An expo dev build is bundled with the @expo/dev-runtime and expo-dev-launcher,
    # but in a production build these are not included. The flag controls how
    # we link to these dependencies.
    :expo_dev_client => false,
  )

  post_install do |installer|
    # https://github.com/facebook/react-native/blob/main/packages/react-native/scripts/react_native_pods.rb#L197-L202
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      # :ccache_enabled => true
    )
  end
end
