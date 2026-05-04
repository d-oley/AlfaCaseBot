const { defineConfig } = require('@vue/cli-service')

const backendProxyTarget = process.env.VUE_APP_BACKEND_PROXY_TARGET || 'http://localhost:8080'
const mlProxyTarget = process.env.VUE_APP_ML_PROXY_TARGET || 'http://localhost:5000'

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    port: Number(process.env.PORT || 8081),
    proxy: {
      '^/evaluate': {
        target: mlProxyTarget,
        changeOrigin: true,
      },
      '^/api': {
        target: backendProxyTarget,
        changeOrigin: true,
      },
    },
  },
})
