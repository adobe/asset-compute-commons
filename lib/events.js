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

const { AdobeIOEvents } = require('@adobe/asset-compute-events-client');
const fs = require('fs');
const AssetComputeWebhookEvents = require('./webhook');

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

        if (process.env.ASSET_COMPUTE_UNIT_TEST_OUT) {
            this.fsEventPath = `${process.env.ASSET_COMPUTE_UNIT_TEST_OUT}/events`;
            console.log(`unit test mode, writing events to filesystem into: ${this.fsEventPath}`);
            fs.mkdirSync(this.fsEventPath, { recursive: true });
            this.fsEventCounter = 0;
        } else if(params.auth && params.auth.isServiceAccount && params.auth.webhookUrl) {
            console.log(`Initiating AssetComputeWebhookEvents to send events to ${params.auth.webhookUrl}`);
            this.webhookEvents = new AssetComputeWebhookEvents({
                webhookUrl: params.auth.webhookUrl,
                orgId: orgId,
                clientId: clientId,
                hmacPrivateKey: params.hmacPrivateKey
            });

        } else if (params.auth && params.auth.accessToken && orgId && clientId) {
            console.log('Initiating AdobeIOEvents to send events');
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
        const params = this.params;

        try {
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

            } else if(this.webhookEvents) {
                console.log(`Using webhook to send event ${type} to ${this.webhookEvents.getWebhookUrl()}`);
                await this.webhookEvents.sendEvent({
                    code: AssetComputeEvents.EVENT_CODE,
                    payload: payload
                }, this.retry);
                console.log("Webhook : successfully sent event");
            } else if (this.ioEvents) {
                console.log(`Using IO Events sending event ${type} as ${this.getProviderId()}`);
                await this.ioEvents.sendEvent({
                    code: AssetComputeEvents.EVENT_CODE,
                    payload: payload
                }, this.retry);
                console.log("IO Events : successfully sent event");
            } else {
                // Logging info about event is useful when running in test environments
                console.log("event not sent:", type, JSON.stringify(payload));
                return;
            }

        } catch (e) {
            if(params && params.requestId){
                console.error(`error sending event for requestId ${params.requestId}: ${e.message}, (details: ${JSON.stringify(e)})`);
            } else {
                console.error("error sending event (no requestId):", e.message || e);
            }
            
            if (this.metrics && this.metrics.sendErrorMetrics) {
                const errorLocation = this.ioEvents ? "IOEvents" : "WebhookEvents"; 
                await this.metrics.sendErrorMetrics(errorLocation, `Error sending event: ${e.message || e}`);
            }
        }
    }
}

AssetComputeEvents.EVENT_CODE = "asset_compute";

module.exports = AssetComputeEvents;
