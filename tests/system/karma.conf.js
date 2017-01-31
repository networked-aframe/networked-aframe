module.exports = function (config) {
  'use strict';
  config.set({
    basePath: '../../',
    browsers: ['PhantomJS'],

    client: {
      mocha: {'ui': 'tdd'}
    },

    frameworks: ['mocha', 'sinon-chai', 'browserify'],

    files: [
      'src/**/*.js',
      'test/system/**/*.test.js'
    ],

    reporters: ['progress'],

    port: 9876,
    colors: true,
    autoWatch: false,
    singleRun: false,

    preprocessors: {
      'tests/system/**/*.js': ['browserify', 'env']
    },

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO
  });
};