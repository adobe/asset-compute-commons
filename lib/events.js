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
const fs = require('fs');

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

        this.metrics = params.metrics;

        const orgId = (params.auth ? params.auth.orgId: null) || params.orgId;
        const clientId = (params.auth ? params.auth.clientId: null) || params.clientId;

        if (process.env.NUI_UNIT_TEST_OUT) {
            this.fsEventPath = `${process.env.NUI_UNIT_TEST_OUT}/events`;
            console.log(`unit test mode, writing events to filesystem into: ${this.fsEventPath}`)
            fs.mkdirSync(this.fsEventPath, { recursive: true });
            this.fsEventCounter = 0;
        } else if (params.auth && params.auth.accessToken && orgId && clientId) {
            this.ioEvents = new AdobeIOEvents({
                accessToken: params.auth.accessToken,
                orgId: orgId,
                clientId: clientId,
                defaults: {
                    providerId: this.getProviderId(orgId, clientId)
                }
            });
        } else {
            console.error("`auth` missing or incomplete in request, cannot send events");
        }
    }

    getProviderId(orgId, clientId) {
        if (!this.providerId) {
            this.providerId = `asset_compute_${orgId}_${clientId}`;
        }
        return this.providerId;
    }

    async sendEvent(type, payload) {
        try {
            const params = this.params;

            payload = Object.assign(payload || {}, {
                type: type,
                date: new Date().toISOString(),
                requestId: params.requestId,
                source: params.source ? (params.source.url || params.source) : undefined,
                userData: params.userData
            });

            if (this.fsEventPath) {
                // for unit tests: write event as json to file system
                const eventJsonPath = `${this.fsEventPath}/event${this.fsEventCounter++}.json`;
                fs.writeFileSync(eventJsonPath, JSON.stringify(payload));
                console.log(`successfully wrote event ${type} as ${eventJsonPath}`);

            } else {
                if (!this.ioEvents) {
                    // Logging info about event is useful when running in test environments
                    console.log("event not sent:", type, JSON.stringify(payload));
                    return;
                }

                console.log(`sending event ${type} as ${this.getProviderId()}`);
                await this.ioEvents.sendEvent({
                    code: AssetComputeEvents.EVENT_CODE,
                    payload: payload
                }, this.retry);
                console.log("successfully sent event");
            }

        } catch (e) {
            console.error("error sending event:", e.message || e);
            if (this.metrics && this.metrics.sendErrorMetrics) {
                await this.metrics.sendErrorMetrics("IOEvents", `Error sending IO event: ${e.message || e}`);
            }
        }
    }
}

AssetComputeEvents.EVENT_CODE = "asset_compute";

module.exports = AssetComputeEvents;
