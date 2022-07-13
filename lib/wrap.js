/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

'use strict';

const AssetComputeMetrics = require('./metrics');
const { NewRelic } = require("@adobe/openwhisk-newrelic");

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
            // send activation_start metrics and execute main action in parallel
            const activationStartedMetricsPromise = metrics.activationStarted();
            const mainPromise = main(params);
            await Promise.all([activationStartedMetricsPromise, mainPromise]);

            // return response from main action
            return mainPromise;
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
            };
        }

        return main(params);
    };
}

function actionWrapper(main) {
    return wrap(main)
        // .with(customLogs)
        .with(metrics)
        .with(checkAction);
}

module.exports = actionWrapper;
