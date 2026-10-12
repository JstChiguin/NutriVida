module.exports = function (config) {
  config.set({
    frameworks: ['jasmine'],

    files: [
      {
        pattern: 'tests/**/*.spec.js',
        watched: false,
      },
      {
        pattern: 'tests/**/*.spec.jsx',
        watched: false,
      },
    ],

    preprocessors: {
      'tests/**/*.spec.js': ['webpack'],
      'tests/**/*.spec.jsx': ['webpack'],
    },

    webpack: {
      mode: 'development',

      module: {
        rules: [
          {
            test: /\.(js|jsx)$/,
            exclude: /node_modules/,
            use: {
              loader: 'babel-loader',
            },
          },
        ],
      },

      resolve: {
        extensions: ['.js', '.jsx'],
      },
    },

    reporters: ['progress'],

    browsers: ['ChromeHeadless'],

    singleRun: true,

    client: {
      clearContext: false,
    },
  });
};
