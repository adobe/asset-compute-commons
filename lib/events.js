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

const MAX_PARALLEL_REQUESTS = 50;
const MAX_CONSECUTIVE_FAILURES = 5;
const WAIT_SECONDS_BEFORE_REOPENING = 8 * 1000;

const { Policy, ConsecutiveBreaker, BulkheadRejectedError /*, BrokenCircuitError */ } = require('cockatiel');
let breaker = Policy.handleAll().circuitBreaker(
    WAIT_SECONDS_BEFORE_REOPENING,
    new ConsecutiveBreaker(MAX_CONSECUTIVE_FAILURES)
);
let breakListener = breaker.onBreak(() => console.log("CircuitBreaker is open"));
let halfOpenListener = breaker.onHalfOpen(() => console.log("CircuitBreaker is half open: test request run"));
let resetListener = breaker.onReset(() => console.log("CircuitBreaker has been reset"));

let bulkhead = Policy.bulkhead(MAX_PARALLEL_REQUESTS);

class AssetComputeEvents {
    static resetCircuitBreaker() {
        breakListener.dispose();
        resetListener.dispose();
        halfOpenListener.dispose();

        breaker = Policy.handleAll().circuitBreaker(
            WAIT_SECONDS_BEFORE_REOPENING,
            new ConsecutiveBreaker(MAX_CONSECUTIVE_FAILURES)
        );
        breakListener = breaker.onBreak(() => console.log("CircuitBreaker is open"));
        resetListener = breaker.onReset(() => console.log("CircuitBreaker has been reset"));
        halfOpenListener = breaker.onHalfOpen(() => console.log("CircuitBreaker is half open: test request run"));

        bulkhead = Policy.bulkhead(MAX_PARALLEL_REQUESTS);
    }

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

        const orgId = (params.auth ? params.auth.orgId : null) || params.orgId;
        const clientId = (params.auth ? params.auth.clientId : null) || params.clientId;

        if (process.env.ASSET_COMPUTE_UNIT_TEST_OUT) {
            this.fsEventPath = `${process.env.ASSET_COMPUTE_UNIT_TEST_OUT}/events`;
            console.log(`unit test mode, writing events to filesystem into: ${this.fsEventPath}`);
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

    async makeEventRequestWithBulkhead(payload, ioEvents) {
        return bulkhead.execute(async () => {
            await ioEvents.sendEvent({
                code: AssetComputeEvents.EVENT_CODE,
                payload: payload
            }, this.retry);
        });
    }

    async sendEventWithCircuitBreaker(type, payload) {
        return breaker.execute(async () => {
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
                    throw new Error("event not sent, as IOEvents is not properly initialized");
                }

                try {
                    console.log(`sending event ${type} as ${this.getProviderId()}`);
                    await this.makeEventRequestWithBulkhead(payload, this.ioEvents);
                    console.log("successfully sent event");
                } catch (e) {
                    if (e instanceof BulkheadRejectedError) {
                        console.log("Too many concurrent requests");
                    }
                    throw (e);
                }
            }
        });
    }

    async sendEvent(type, payload) {
        try {
            await this.sendEventWithCircuitBreaker(type, payload);
        } catch (e) {
            /*
            if (e instanceof BrokenCircuitError) {
                console.log("Circuit breaker is open");
            }
            */

            console.error("error sending event:", e.message || e);
            if (this.metrics && this.metrics.sendErrorMetrics) {
                await this.metrics.sendErrorMetrics("IOEvents", `Error sending IO event: ${e.message || e}`);
            }
        }
    }
}

AssetComputeEvents.EVENT_CODE = "asset_compute";

module.exports = AssetComputeEvents;
