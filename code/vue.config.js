const { defineConfig } = require('@vue/cli-service')

const backendProxyTarget = process.env.VUE_APP_BACKEND_PROXY_TARGET || 'http://localhost:8080'
const mlProxyTarget = process.env.VUE_APP_ML_PROXY_TARGET || 'http://localhost:5000'
const caseAssetProxyTarget = process.env.VUE_APP_CASE_ASSET_PROXY_TARGET || 'http://localhost:333'
const publicHostname = process.env.VUE_APP_PUBLIC_HOSTNAME || 'localhost'

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    port: Number(process.env.PORT || 8081),
    allowedHosts: ['localhost', '127.0.0.1', publicHostname],
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
