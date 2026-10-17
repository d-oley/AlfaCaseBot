const { defineConfig } = require('@vue/cli-service')

// Адреса внутренних сервисов нужны только серверу разработки
// Префикс VUE_APP_ добавил бы их в код для браузера
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
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
    // Через публичный туннель HMR иногда вызывает бесконечную перезагрузку
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
