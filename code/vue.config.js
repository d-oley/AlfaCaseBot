const { defineConfig } = require('@vue/cli-service')

const backendProxyTarget = process.env.VUE_APP_BACKEND_PROXY_TARGET || 'http://localhost:8080'

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    port: Number(process.env.PORT || 8081),
    proxy: {
      '^/auth': {
        target: backendProxyTarget,
        changeOrigin: true,
      },
    },
  },
})
