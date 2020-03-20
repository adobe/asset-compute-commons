/**
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 *  Copyright 2020 Adobe
 *  All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 */

'use strict';

const AssetComputeMetrics = require('./metrics');
const { NewRelic } = require("@nui/openwhisk-newrelic");

// copied from https://github.com/adobe/openwhisk-action-utils/blob/master/src/wrap.js
function wrap(main) {
    const withfn = function withfn(wrapper, ...opts) {
      const wrapped = wrapper(this, ...opts);
      wrapped.with = withfn;
      return wrapped;
    };

    // eslint-disable-next-line no-param-reassign
    main.with = withfn;
    return main;
}

// TODO: overwrite logs
// function customLogs(main) {
//     return async (params) => {
//         //const originalLog = console.log;
//         //console.log = function() { ... }
//         try {
//             return await main(params);
//         } finally {
//             // restore
//             //console.log = originalLog;
//         }
//     }
// }

function metrics(main) {
    // 1. enable instrumentation (e.g. http requests)
    // 2. create AssetComputeMetrics object per activation
    // 3. catch any errors & handled activation finished in finally
    return NewRelic.instrument(async (params={}) => {
        const metrics = new AssetComputeMetrics(params);

        if (params.metrics) {
            console.error("metrics already set in input params, not overwriting with AssetComputeMetrics object");
        } else {
            params.metrics = metrics;
        }

        try {
            return await main(params);
        } catch (e) {
            await metrics.handleError(e);
            // pass error through as we only want to track the error but not interfere with the behavior
            throw e;
        } finally {
            await metrics.activationFinished();
        }
    });
}

function checkAction(main) {
    return async (params={}) => {
        if (params.__checkAction) {
            console.log("Finishing action successfully because params.__checkAction is set.");
            return {
                ok: true,
                checkAction: true
            }
        }

        return main(params);
    }
}

function actionWrapper(main) {
    return wrap(main)
        // .with(customLogs)
        .with(metrics)
        .with(checkAction);
}

module.exports = actionWrapper;