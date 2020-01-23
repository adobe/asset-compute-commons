/**
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 *  Copyright 2019 Adobe
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
        this.params = params || {};

        if (!this.params.newRelicEventsURL || !this.params.newRelicApiKey) {
            console.error('Missing NewRelic events Api Key or URL. Metrics disabled.');

        } else {
            this.defaultMetrics = {};
            this.defaultMetrics.requestId = this.params.requestId;

            if(this.params.source) {
                this.defaultMetrics.sourceName = this.params.source.name;
                this.defaultMetrics.sourceMimetype = this.params.source.mimetype;
                this.defaultMetrics.sourceSize = this.params.source.size;
            }

            if (this.params.auth) {
                this.defaultMetrics.orgId = this.params.auth.orgId;
                this.defaultMetrics.appName = this.params.auth.appName;
                this.defaultMetrics.clientId = this.params.auth.clientId;
            }

            Object.freeze(this.defaultMetrics); // default metrics should not change

            this.NewRelic = new NewRelic(Object.assign({
                newRelicEventsURL: this.params.newRelicEventsURL,
                newRelicApiKey: this.params.newRelicApiKey
            }, options), this.defaultMetrics);

        }
    }

    /**
     * Sends gathered metrics and default metrics to New Relic.
     *
     * @param {string} eventType event type for the metric event
     * @param {object} metrics all custom metrics to be included in the New Relic event
     */
    async sendMetrics(eventType, metrics) {
        if (!this.NewRelic) return Promise.resolve();

        metrics = Object.assign({}, this.defaultMetrics, metrics);
        await this.NewRelic.send(eventType, metrics);
    }

    async sendErrorMetrics(location, message, metrics) {
        await this.sendMetrics(
            AssetComputeMetrics.ERROR_EVENT_TYPE,
            Object.assign({
                message: message,
                location: location
            }, metrics)
        );
    }

    async sendClientErrorMetrics(reason, message, metrics) {
        await this.sendMetrics(
            AssetComputeMetrics.CLIENT_ERROR_EVENT_TYPE,
            Object.assign({
                reason: reason,
                message: message
            }, metrics)
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
        console.error(`${options.message || "Error"}:`, error);

        const message = options.message || error.message;

        if (error instanceof ClientError) {
            await this.sendClientErrorMetrics(error.reason, message, options.metrics);

        } else if (error instanceof GenericError) {
            await this.sendErrorMetrics(error.location || options.location || actionName(), message, options.metrics);

        } else {
            // any other js exception/error
            const metrics = Object.assign({}, options.metrics || {}, {
                // TODO: pass along other useful information from error depending on type (e.g. )
                statusCode: error.statusCode
            });
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
        if (!this.NewRelic) return Promise.resolve(); // resolve to finish when nothing needs to be done
        if (sendActivationMetrics) {
            await this.sendMetrics('activation', metrics);
        }
        this.NewRelic.activationFinished();
        delete this.NewRelic;
    }
}

AssetComputeMetrics.ERROR_EVENT_TYPE = "error";
AssetComputeMetrics.CLIENT_ERROR_EVENT_TYPE = "client_error";

function actionName() {
    return (process.env.__OW_ACTION_NAME || "").split('/').pop();
}

module.exports = AssetComputeMetrics;
