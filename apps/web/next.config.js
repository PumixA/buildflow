const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Le monorepo npm workspaces hoiste les dépendances à la racine.
  // Sans ceci, webpack ne trouve pas leaflet et les autres paquets partagés.
  webpack: (config) => {
    config.resolve.modules = [
      ...(config.resolve.modules || []),
      path.resolve(__dirname, '../../node_modules'),
      path.resolve(__dirname, 'node_modules'),
    ];
    return config;
  },
};

module.exports = nextConfig;
