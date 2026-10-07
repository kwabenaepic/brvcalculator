const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// @supabase/supabase-js pulls in @supabase/realtime-js, which references
// Node's `ws` package (unused here, but still present in the module graph).
// Metro's package-exports resolution fails to resolve it at bundle time
// unless this is disabled — Supabase's own documented Expo/RN workaround.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
