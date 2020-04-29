/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

'use strict';

const { GenericError, ClientError } = require('./errors');
const { NewRelic } = require('@nui/openwhisk-newrelic');

class AssetComputeMetrics {

    /**
     *
     * @typedef {object} MetricsOptions
     * @property {boolean} disableActionTimeout  option to disable action timeout metrics
     */
    /**
     * Creates a new asset compute metrics handler.
     *
     * @param {object} params action parameters
     * @param {MetricsOptions} options options for New Relic Metrics
     */
    constructor(params, options) {
        this.startDate = new Date();

        this.params = params || {};

        const defaultMetrics = {};
        defaultMetrics.requestId = this.params.requestId;

        if(this.params.source) {
            defaultMetrics.sourceName = this.params.source.name;
            defaultMetrics.sourceMimetype = this.params.source.mimetype;
            defaultMetrics.sourceSize = this.params.source.size;
        }

        if (this.params.auth) {
            defaultMetrics.orgId = this.params.auth.orgId;
            defaultMetrics.orgName = this.params.auth.orgName;
            defaultMetrics.appName = this.params.auth.appName;
            defaultMetrics.clientId = this.params.auth.clientId;
        }

        options = {
            ...options,
            newRelicEventsURL: this.params.newRelicEventsURL,
            newRelicApiKey: this.params.newRelicApiKey
        };

        this.newRelic = new NewRelic(options, defaultMetrics);
    }

    /**
     * Add custom metrics that will be sent with every following send() of metrics, including
     * the timeout metrics (if enabled). These can be overwritten with metrics passed into
     * the send() method.
     *
     * @param {object} metrics custom metrics to add, key value pairs as object members
     */
    add(metrics) {
        this.newRelic.add(metrics);
    }

    /**
     * Returns the default metrics and collected metrics from add() invocations.
     *
     * @returns {object} metrics, key value pairs as object members
     */
    get() {
        return this.newRelic.get();
    }

    /**
     * Sends gathered metrics and default metrics to New Relic.
     *
     * @param {string} eventType event type for the metric event
     * @param {object} metrics all custom metrics to be included in the New Relic event
     */
    async sendMetrics(eventType, metrics) {
        await this.newRelic.send(eventType, metrics);
    }

    async sendErrorMetrics(location, message, metrics) {
        await this.sendMetrics(
            AssetComputeMetrics.ERROR_EVENT_TYPE,
            {
                ...metrics,
                message: message,
                location: location
            }
        );
    }

    async sendClientErrorMetrics(reason, message, metrics) {
        await this.sendMetrics(
            AssetComputeMetrics.CLIENT_ERROR_EVENT_TYPE,
            {
                ...metrics,
                reason: reason,
                message: message
            }
        );
    }

    /**
     *  Generic exception/error handling method.
     *
     *  Example usage:

        foo() {
            try {
                "string";
            } catch (e) {
                this.handleError(e, {
                    location: "mylocation",
                    message: "something failed",
                    metrics: {}
                });
            }
        }
    */
    async handleError(error, options) {
        error = error || {};
        options = options || {};

        // prevent sending web action error responses
        if (error.statusCode && error.body) {
            return;
        }

        console.error(`${options.message || "Error"}:`, error);

        const message = options.message || error.message;

        if (error instanceof ClientError) {
            await this.sendClientErrorMetrics(error.reason, message, options.metrics);

        } else if (error instanceof GenericError) {
            await this.sendErrorMetrics(error.location || options.location || actionName(), message, options.metrics);

        } else {
            // any other js exception/error
            const metrics = {
                ...options.metrics || {},
                // TODO: pass along other useful information from error depending on type (e.g. )
                statusCode: error.statusCode
            };
            await this.sendErrorMetrics(options.location || actionName(), message, metrics);
        }
    }

    /**
     * End New Relic action timeout and send type `activation` metrics
     *
     * Call this when your openwhisk action has finished (successfully or not).
     * Required to prevent sending of the error metric if the activation times out.
     * Does nothing on multiple calls
     *
     * @param {Object} metrics all custom metrics to be included in the New Relic event
     * @param {Boolean} sendActivationMetrics if false, it will not send activation metrics but still call activationFinished()
     */
    async activationFinished(metrics={}, sendActivationMetrics=true) {
        if (this.finished) {
            return;
        }
        if (sendActivationMetrics) {
            // measure action duration, but allow overwriting it in the action
            // via passed in metrics or add() (defaultMetrics)
            if (metrics.duration === undefined && this.newRelic.defaultMetrics.duration === undefined) {
                metrics.duration = (new Date() - this.startDate) / 1000;
            }
            await this.sendMetrics('activation', metrics);
            this.finished = true;
        }
        await this.newRelic.activationFinished();
    }
}

AssetComputeMetrics.ERROR_EVENT_TYPE = "error";
AssetComputeMetrics.CLIENT_ERROR_EVENT_TYPE = "client_error";

function actionName() {
    return (process.env.__OW_ACTION_NAME || "").split('/').pop();
}

module.exports = AssetComputeMetrics;
