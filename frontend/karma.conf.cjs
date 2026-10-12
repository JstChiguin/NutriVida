const fs = require('fs');

if (!process.env.CHROME_BIN) {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  if (fs.existsSync(chromePath)) {
    process.env.CHROME_BIN = chromePath;
  } else if (fs.existsSync(edgePath)) {
    process.env.CHROME_BIN = edgePath;
  }
}

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

    reporters: ['progress', 'coverage'],

    coverageReporter: {
      dir: 'coverage',
      reporters: [
        { type: 'html', subdir: 'html' },
        { type: 'text-summary' },
      ],
    },

    browsers: ['ChromeHeadless'],

    singleRun: true,

    client: {
      clearContext: false,
    },
  });
};
