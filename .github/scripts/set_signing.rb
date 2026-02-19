#!/usr/bin/env ruby
require 'xcodeproj'
require 'fileutils'

# Usage: ruby set_signing.rb <path_to_xcodeproj> <team_id> <main_profile_uuid> <ext_profile_uuid>

project_path = ARGV[0]
team_id = ARGV[1]
main_profile_uuid = ARGV[2]
ext_profile_uuid = ARGV[3]

puts "Updating project at #{project_path}"
puts "Team ID: #{team_id}"
puts "Main Profile UUID: #{main_profile_uuid}"
puts "Extension Profile UUID: #{ext_profile_uuid}"

project = Xcodeproj::Project.open(project_path)

project.targets.each do |target|
  puts "Procesando target: #{target.name}"
  
  target.build_configurations.each do |config|
    # Configuración global para firma manual
    config.build_settings['DEVELOPMENT_TEAM'] = team_id
    config.build_settings['CODE_SIGN_STYLE'] = 'Manual'
    config.build_settings['CODE_SIGN_IDENTITY'] = 'iPhone Distribution'

    if target.name == 'ilyrox'
      puts "  -> Asignando perfil MAIN al target ilyrox: #{main_profile_uuid}"
      config.build_settings['PROVISIONING_PROFILE_SPECIFIER'] = main_profile_uuid
    elsif target.name == 'OneSignalNotificationServiceExtension'
      puts "  -> Asignando perfil EXTENSION al target OneSignal...: #{ext_profile_uuid}"
      config.build_settings['PROVISIONING_PROFILE_SPECIFIER'] = ext_profile_uuid
    end
  end
end

project.save
puts "✅ Project guardado con configuración de firma actualizada."
