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

const actionWrapper = require("../lib/wrap");
const assert = require('assert');
const nock = require('nock');
const zlib = require('zlib');

const NR_FAKE_BASE_URL = "http://newrelic.com";
const NR_FAKE_EVENTS_PATH = "/events";
const NR_FAKE_URL = NR_FAKE_BASE_URL + NR_FAKE_EVENTS_PATH;
const NR_FAKE_API_KEY = "new-relic-api-key";

function gunzip(body) {
    body = Buffer.from(body, 'hex');
    body = zlib.gunzipSync(body).toString();
    console.log("New Relic received:", body);
    return body;
}

function expectNewRelicInsightsEvents(metrics) {
    return nock(NR_FAKE_BASE_URL)
        .filteringRequestBody(gunzip)
        .matchHeader("x-insert-key", NR_FAKE_API_KEY)
        .post(NR_FAKE_EVENTS_PATH, metrics)
        .reply(200, {});
}

describe("wrap", function() {

    beforeEach(function() {
        // we keep this simple and don't want the metrics based off of these
        delete process.env.__OW_ACTION_NAME;
        delete process.env.__OW_NAMESPACE;
        delete process.env.__OW_ACTIVATION_ID;
        delete process.env.__OW_DEADLINE;
        nock.cleanAll();
    });

    describe("metrics", function() {
        it('wraps an action and provides metrics', async function() {
            expectNewRelicInsightsEvents([{
                eventType: "activation",
                timestamp: /\d+/,
                duration: /\d+/,
                my: "metric"
            }]);

            function main(params) {
                assert.equal(typeof params, "object");

                // passed in params
                assert.equal(params.key, "value");

                // metrics from wrapper
                assert.equal(typeof params.metrics, "object");

                params.metrics.add({
                    my: "metric"
                });

                return { ok: true };
            }

            const finalMain = actionWrapper(main);

            const params = {
                newRelicEventsURL: NR_FAKE_URL,
                newRelicApiKey: NR_FAKE_API_KEY,
                key: "value"
            };

            const result = await finalMain(params);
            assert.equal(result.ok, true);

            assert(nock.isDone(), "did not make these requests: " + nock.pendingMocks());
        });

        it('metrics wrapper handles missing params', async function() {
            function main(params) {
                assert.equal(typeof params, "object");

                // metrics from wrapper
                assert.equal(typeof params.metrics, "object");

                params.metrics.add({
                    my: "metric"
                });

                return { ok: true };
            }

            const finalMain = actionWrapper(main);

            // must not throw if no params are passed in
            const result = await finalMain();
            assert.equal(result.ok, true);
        });

        it('metrics wrapper does not overwrite existing params.metrics', async function() {
            expectNewRelicInsightsEvents([{
                eventType: "activation",
                timestamp: /\d+/,
                duration: /\d+/
            }]);

            function main(params) {
                assert.equal(typeof params, "object");

                // metrics from wrapper
                assert.equal(params.metrics, "foo");

                return { ok: true };
            }

            const finalMain = actionWrapper(main);

            const params = {
                newRelicEventsURL: NR_FAKE_URL,
                newRelicApiKey: NR_FAKE_API_KEY,
                metrics: "foo"
            };

            const result = await finalMain(params);
            assert.equal(result.ok, true);

            assert(nock.isDone(), "did not make these requests: " + nock.pendingMocks());
        });

        it('metrics wrapper catches errors', async function() {
            expectNewRelicInsightsEvents([{
                eventType: "error",
                timestamp: /\d+/,
                actionName: "my-action",
                my: "metric",
                location: "my-action",
                message: "broken"
            },{
                eventType: "activation",
                timestamp: /\d+/,
                actionName: "my-action",
                duration: /\d+/,
                my: "metric"
            }]);

            process.env.__OW_ACTION_NAME = "my-action"

            function main(params) {
                assert.equal(typeof params, "object");

                // passed in params
                assert.equal(params.key, "value");

                // metrics from wrapper
                assert.equal(typeof params.metrics, "object");

                params.metrics.add({
                    my: "metric"
                });

                throw new Error("broken");
            }

            const finalMain = actionWrapper(main);

            const params = {
                newRelicEventsURL: NR_FAKE_URL,
                newRelicApiKey: NR_FAKE_API_KEY,
                key: "value"
            };

            let threw = false;
            try {
                await finalMain(params);
            } catch (e) {
                // expected to throw
                threw = true;
            }
            if (!threw) {
                assert.fail("did not pass through error");
            }

            assert(nock.isDone(), "did not make these requests: " + nock.pendingMocks());
        });
    });

    describe("checkAction", function() {
        it("should exit if params.__checkAction is set", async function() {
            const finalMain = actionWrapper(() => ({ ok: false }));

            // run with checkAction flag
            let result = await finalMain({
                __checkAction: true
            });
            assert.equal(result.ok, true);
            assert.equal(result.checkAction, true);

            // run without checkAction flag
            result = await finalMain({});
            assert.equal(result.ok, false);
            assert.equal(result.checkAction, undefined);
        });
    });
});
