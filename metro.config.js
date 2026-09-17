const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Cap parallel workers to 2 to prevent RAM spikes, high memory compression, and terminal lag
config.maxWorkers = 2;

module.exports = config;
