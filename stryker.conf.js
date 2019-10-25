'use strict'

module.exports = function(config) {
    config.set({
        mutator: "javascript",
        files: [
            'test/*.js', 'lib/*.js', 'index.js', 
        ],
        packageManager: "npm",
        reporters: ["html", "clear-text", "progress"],
        testRunner: "mocha",
        transpilers: [],
        coverageAnalysis: "perTest",
        mutate: ['lib/events.js', 'lib/metrics.js']
    });
};