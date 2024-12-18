const {defineConfig} = require('@vue/cli-service')
const {vueBaseConfig} = process.env.npm_package_config_monorepo ? require("../../vue.base-config") : {};


module.exports = defineConfig({
    ...vueBaseConfig,
    outputDir: process.env.npm_package_config_monorepo ? '../../dist/tom' : './dist',
    devServer: {
        port: process.env.npm_package_config_port ?? 8083
    },
    pwa: {
        workboxPluginMode: "InjectManifest",
        workboxOptions: {
            swSrc: "./src/service-worker.js",
        },
        msTileColor: "#81c784",
    },
});