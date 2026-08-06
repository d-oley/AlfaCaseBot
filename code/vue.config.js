const { defineConfig } = require('@vue/cli-service')

// These values are intentionally not prefixed with VUE_APP_: they are used only
// by the Node dev server and must not be embedded into the browser bundle.
const backendProxyTarget = process.env.BACKEND_PROXY_TARGET || 'http://localhost:8080'
const mlProxyTarget = process.env.ML_PROXY_TARGET || 'http://localhost:5000'
const caseAssetProxyTarget = process.env.CASE_ASSET_PROXY_TARGET || 'http://localhost:333'
const publicHostname = process.env.PUBLIC_HOSTNAME || 'localhost'
const hmrEnabled = process.env.DEV_SERVER_HMR
  ? process.env.DEV_SERVER_HMR === 'true'
  : publicHostname === 'localhost'

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    port: Number(process.env.PORT || 8081),
    allowedHosts: ['localhost', '127.0.0.1', publicHostname],
    // HMR through a public tunnel may reconnect as a page reload loop. It is
    // disabled for the public demo and remains available for localhost work.
    hot: hmrEnabled,
    liveReload: hmrEnabled,
    client: {
      webSocketURL: 'auto://0.0.0.0:0/ws',
      reconnect: hmrEnabled ? 10 : false,
    },
    proxy: {
      '^/evaluate': {
        target: mlProxyTarget,
        changeOrigin: true,
      },
      '^/api': {
        target: backendProxyTarget,
        changeOrigin: true,
      },
      '^/storage': {
        target: caseAssetProxyTarget,
        changeOrigin: true,
      },
    },
  },
})
