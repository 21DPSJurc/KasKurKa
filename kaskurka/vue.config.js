const { defineConfig } = require('@vue/cli-service');

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // Your backend server address
        changeOrigin: true,
        // pathRewrite: { '^/api': '' }, // Uncomment if your backend routes don't start with /api
      },
    },
  },
});