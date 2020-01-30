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
// function logWrapper(main) {
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

function metricsWrapper(main) {
    return async (params={}) => {
        const metrics = new AssetComputeMetrics(params);

        if (params.metrics) {
            console.error("metrics already set in input params, not overwriting with AssetComputeMetrics object");
        } else {
            params.metrics = metrics;
        }

        try {
            const result = await main(params);
            result.metrics = metrics.get();
            return result;
        } catch (e) {
            await metrics.handleError(e);
            throw e;
        } finally {
            await metrics.activationFinished();
        }
    }
}

function actionWrapper(main) {
    return wrap(main)
        // .with(logWrapper)
        .with(metricsWrapper);
}

module.exports = actionWrapper;