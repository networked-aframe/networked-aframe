// karma configuration
const karma_conf = {
  basePath: '../../',
  browserNoActivityTimeout: 1000000,
  browsers: [ 'Chrome', 'Firefox' ],
  client: {
    captureConsole: true,
    mocha: {'ui': 'tdd', timeout: 3000}
  },
  envPreprocessor: [
    'TEST_ENV'
  ],
  webpack: {
    mode: 'none',
    module: {
      rules: [
        {
          test: /\.js$/,
          loader: 'babel-loader',
          exclude: /node_modules/,
          options: {
            presets: ['@babel/preset-env'],
            plugins: [['istanbul', { exclude: ['**/node_modules/**', '**/tests/**'] }]]
          }
        }
      ]
    }
  },
  files: [
    // Define test files.
    {pattern: './tests/unit/NafInterface.test.js'},
    {pattern: './tests/unit/NafLogger.test.js'},
    {pattern: './tests/unit/utils.test.js'},
    {pattern: './tests/unit/NetworkConnection.test.js'},
    {pattern: './tests/unit/networked.test.js'},
    {pattern: './tests/unit/networked_remote.test.js'},
    {pattern: './tests/unit/NetworkEntities.test.js'},
    {pattern: './tests/unit/Schemas.test.js'},
    {pattern: './tests/unit/ChildEntityCache.test.js'},
    {pattern: './src/**/*.js', included: false}
  ],
  frameworks: ['mocha', 'sinon-chai', 'webpack'],
  preprocessors: {
    'tests/unit/**/*.js': ['webpack', 'env'],
  },
  plugins: [
    'karma-webpack',
    'karma-mocha',
    'karma-sinon-chai',
    'karma-mocha-reporter',
    'karma-chrome-launcher',
    'karma-firefox-launcher',
    'karma-coverage',
    'karma-env-preprocessor'
  ],
  reporters: ['mocha', 'coverage'],
  coverageReporter: {
    dir: 'tests/coverage',
    includeAllSources: true,
    reporters: [
      {'type': 'html', subdir: 'report'},
      {'type': 'lcov', subdir: '.'}
    ]
  },
  logLevel: 'INFO',
  colors: true,
  singleRun: true
  // restartOnFileChange: true
};

// Apply configuration
module.exports = function (config) {
  config.set(karma_conf);
};
