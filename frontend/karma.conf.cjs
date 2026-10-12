
module.exports = function (config) {
  config.set({
    frameworks: ['jasmine'],

    files: [
      {
        pattern: 'tests/**/*.spec.js',
        type: 'module',
      },
      {
        pattern: 'src/utils/**/*.js',
        included: false,
        served: true,
      },
    ],

    reporters: ['progress'],

    browsers: ['ChromeHeadless'],

    singleRun: true,

    client: {
      clearContext: false,
    },
  });
};
