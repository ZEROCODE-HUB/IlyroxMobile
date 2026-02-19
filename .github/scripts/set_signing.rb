#!/usr/bin/env ruby
require 'xcodeproj'

# Usage: ruby set_signing.rb <path_to_xcodeproj> <team_id> <main_profile_uuid> <unused>

project_path = ARGV[0]
team_id = ARGV[1]
main_profile_uuid = ARGV[2]

puts "Updating project at #{project_path}"
puts "Team ID: #{team_id}"
puts "Main Profile UUID: #{main_profile_uuid}"

project = Xcodeproj::Project.open(project_path)

# 1. REMOVE EXTENSION TARGET (OneSignalNotificationServiceExtension)
#    We do this to simplify signing (avoid needing a second provisioning profile).
ext_target_name = 'OneSignalNotificationServiceExtension'
ext_target = project.targets.find { |t| t.name == ext_target_name }

if ext_target
  puts "🚫 Removing target: #{ext_target_name}"
  
  # Remove from main target dependencies
  main_target = project.targets.find { |t| t.name == 'ilyrox' }
  if main_target
    # Remove from Embed App Extensions build phase
    embed_extensions_phase = main_target.copy_files_build_phases.find { |p| p.symbol_dst_subfolder_spec == :plugins }
    if embed_extensions_phase
      embed_extensions_phase.files.each do |file|
        if file.display_name.include?(ext_target_name)
          puts "   -> Removing from Embed App Extensions phase"
          embed_extensions_phase.remove_build_file(file)
        end
      end
    end
    
    # Remove target dependency
    main_target.dependencies.delete_if do |dep|
      if dep.target && dep.target.name == ext_target_name
        puts "   -> Removing from Dependencies"
        true
      else
        false
      end
    end
  end

  # Remove the target itself
  ext_target.remove_from_project
  puts "✅ Extension target removed successfully."
else
  puts "ℹ️  Extension target '#{ext_target_name}' not found (already removed?)"
end


# 2. CONFIGURE SIGNING FOR REMAINING TARGETS
project.targets.each do |target|
  puts "Procesando target: #{target.name}"
  
  target.build_configurations.each do |config|
    config.build_settings['DEVELOPMENT_TEAM'] = team_id
    config.build_settings['CODE_SIGN_STYLE'] = 'Manual'
    config.build_settings['CODE_SIGN_IDENTITY'] = 'iPhone Distribution'

    if target.name == 'ilyrox'
      puts "  -> Asignando perfil MAIN al target ilyrox: #{main_profile_uuid}"
      config.build_settings['PROVISIONING_PROFILE_SPECIFIER'] = main_profile_uuid
    end
  end
end

project.save
puts "✅ Project guardado con configuración actualizada."
