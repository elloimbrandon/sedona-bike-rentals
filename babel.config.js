//@ts-nocheck
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // removed nativewind/babel | Will fix for Tailwind later
    ],
  };
}; 