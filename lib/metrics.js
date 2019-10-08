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

 const jsonwebtoken = require('jsonwebtoken');
 const zlib = require('zlib');
 const fetch = require('node-fetch');
 const { GenericError, ClientError } = require('./errors');

 class AssetComputeMetrics {
    /**
     * Creates a new asset compute metrics handler.
     *
     * @param {object} params action parameters
     */
    constructor(params) {
        this.params = params || {};

        if (!this.params.newRelicEventsURL || !this.params.newRelicApiKey) {
            console.error('Missing NewRelic events Api Key or URL. Metrics disabled.');

        } else {
            this.defaultMetrics = {};
            const fullActionName = process.env.__OW_ACTION_NAME? process.env.__OW_ACTION_NAME.split('/'): [];
            this.defaultMetrics.actionName = fullActionName.pop();
            this.defaultMetrics.namespace = process.env.__OW_NAMESPACE;
            this.defaultMetrics.activationId = process.env.__OW_ACTIVATION_ID;
            this.defaultMetrics.ingestionId = this.params.ingestionId;
            if (fullActionName.length > 2) {
                this.defaultMetrics.package = fullActionName.pop();
            }

            if (this.params.auth) {
                try {
                    this.defaultMetrics.orgId = this.params.auth.orgId;
                    const jwt = jsonwebtoken.decode(params.auth.accessToken);
                    this.defaultMetrics.clientId = jwt ? jwt.client_id : undefined;
                }
                catch (e) {
                    console.log(e.message || e);
                }
            }
        }
    }

    async sendMetrics(eventType, metrics) {
        if (!this.defaultMetrics) {
            return;
        }

        metrics = Object.assign(this.defaultMetrics, metrics);
        metrics.eventType = eventType;

        try {
            const gzippedPayload = zlib.gzipSync(JSON.stringify(metrics));
            const response = await fetch(this.params.newRelicEventsURL,
                {
                    method: 'post',
                    headers: {
                        'content-type': 'application/json',
                        'X-Insert-Key': this.params.newRelicApiKey,
                        'Content-Encoding': 'gzip'
                    },
                    body: gzippedPayload
                });
            if (response.ok) {
                console.log(`NewRelic event sent: ${await response.json()}`);
            } else {
                console.log(`Error sending NewRelic event with status ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            // catch all error
            console.error('Error sending metrics to NewRelic.', error.message || error);
        }
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
        console.log(`${options.message || "error"}: ${error.message || error}`);

        const message = options.message || error.message;

        if (error instanceof ClientError) {
            this.sendClientErrorMetrics(error.reason, message, options.metrics);

        } else if (error instanceof GenericError) {
            this.sendErrorMetrics(options.location || error.location, message, options.metrics);

        } else {
            // any other js exception/error
            const metrics = Object.assign(options.metrics || {}, {
                // TODO: pass along other useful information from error depending on type (e.g. )
                statusCode: error.statusCode
            })
            this.sendErrorMetrics(options.location, message, metrics);
        }
    }
}

AssetComputeMetrics.ERROR_EVENT_TYPE = "error";
AssetComputeMetrics.CLIENT_ERROR_EVENT_TYPE = "client_error";

module.exports = AssetComputeMetrics;
