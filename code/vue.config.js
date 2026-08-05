const { defineConfig } = require('@vue/cli-service')

// These values are intentionally not prefixed with VUE_APP_: they are used only
// by the Node dev server and must not be embedded into the browser bundle.
const backendProxyTarget = process.env.BACKEND_PROXY_TARGET || 'http://localhost:8080'
const mlProxyTarget = process.env.ML_PROXY_TARGET || 'http://localhost:5000'
const caseAssetProxyTarget = process.env.CASE_ASSET_PROXY_TARGET || 'http://localhost:333'
const publicHostname = process.env.PUBLIC_HOSTNAME || 'localhost'

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    port: Number(process.env.PORT || 8081),
    allowedHosts: ['localhost', '127.0.0.1', publicHostname],
    client: {
      // Derive the WebSocket address from the page URL. This keeps HMR working
      // through Cloudflare without asking visitors for local-network access.
      webSocketURL: 'auto://0.0.0.0:0/ws',
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
      '^/alfa-cases': {
        target: caseAssetProxyTarget,
        changeOrigin: true,
      },
    },
  },
})
