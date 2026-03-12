module.exports = {
  transpileDependencies: ["@vueform"],
  chainWebpack: (config) => {
    config.plugin("html").tap((args) => {
      args[0].title = "SOS Angola - Área das Autoridades";
      return args;
    });
  },
};