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

 const { AdobeIOEvents } = require('@nui/adobe-io-events-client');
 const jsonwebtoken = require('jsonwebtoken');
 const fs = require('fs');
 const AssetComputeMetrics = require('./metrics');

class AssetComputeEvents {

    /**
     * Creates a new asset compute events handler.
     *
     * @param {object} params action parameters
     * @param {object} retry http request retry option
     */
    constructor(params, retry) {
        params = params || {};
        this.params = params;
        this.retry = retry;

        this.metrics = new AssetComputeMetrics(this.params);

        if (process.env.NUI_UNIT_TEST_OUT) {
            this.fsEventPath = `${process.env.NUI_UNIT_TEST_OUT}/events`;
            console.log(`unit test mode, writing events to filesystem into: ${this.fsEventPath}`)
            fs.mkdirSync(this.fsEventPath);
            this.fsEventCounter = 0;

        } else if (params.auth && params.auth.accessToken && params.auth.orgId) {
            const auth = params.auth;

            this.ioEvents = new AdobeIOEvents({
                accessToken: auth.accessToken,
                orgId: auth.orgId,
                defaults: {
                    providerId: this.getProviderId()
                }
            });

        } else {
            console.error("`auth` missing or incomplete in request, cannot send events");
        }
    }

    getProviderId() {
        if (!this.providerId) {
            const auth = this.params.auth;

            const jwt = jsonwebtoken.decode(auth.accessToken);
            if (!jwt) {
                throw new Error("invalid accessToken");
            } else {
                this.providerId = `asset_compute_${auth.orgId}_${jwt.client_id}`;
            }
        }
        return this.providerId;
    }

    async sendEvent(type, payload) {
        try {
            const params = this.params;
            console.log("sending event", type, "as", this.getProviderId());

            payload = Object.assign(payload || {}, {
                type: type,
                date: new Date().toISOString(),
                requestId: params.requestId || params.ingestionId || process.env.__OW_ACTIVATION_ID,
                source: params.source ? (params.source.url || params.source) : undefined,
                userData: params.userData
            });

            if (this.fsEventPath) {
                // for unit tests: write event as json to file system
                const eventJsonPath = `${this.fsEventPath}/event${this.fsEventCounter++}.json`;
                fs.writeFileSync(eventJsonPath, JSON.stringify(payload));
                console.log(`successfully wrote event as ${eventJsonPath}`);

            } else {
                if (!this.ioEvents) {
                    // Logging info about event is useful when running in test environments
                    console.log("Event not sent:", type, JSON.stringify(payload));
                    return;
                }

                await this.ioEvents.sendEvent({
                    code: AssetComputeEvents.EVENT_CODE,
                    payload: payload
                }, this.retry);
                console.log("successfully sent event");
            }

        } catch (e) {
            console.error("error sending event:", e.message || e);
            this.metrics.sendErrorMetrics("IOEvents", `Error sending IO event: ${e.message || e}`);
        }
    }
}

AssetComputeEvents.EVENT_CODE = "asset_compute";

module.exports = AssetComputeEvents;