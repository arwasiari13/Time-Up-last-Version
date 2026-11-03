const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

// your metro modifications

// لوحة الإدارة (admin/) مشروع ويب منفصل داخل نفس المستودع — لا يقرأه Metro
const escapeForRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const adminFolder = new RegExp(`^${escapeForRegex(path.join(__dirname, 'admin'))}[\\\\/]`);
const desktopFolder = new RegExp(`^${escapeForRegex(path.join(__dirname, 'desktop'))}[\\\\/]`);
const existingBlockList = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existingBlockList)
    ? existingBlockList
    : existingBlockList
    ? [existingBlockList]
    : []),
  adminFolder,
  desktopFolder,
];

module.exports = withUniwindConfig(config, {
  // relative path to your global.css file (from previous step)
  cssEntryFile: './global.css',
  // (optional) path where we gonna auto-generate typings
  // defaults to project's root
  dtsFile: './src/uniwind-types.d.ts'
});
