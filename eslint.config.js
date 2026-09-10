// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // admin/ = لوحة الإدارة (مشروع ويب منفصل)
    ignores: ['dist/*', 'admin/**'],
  },
]);
