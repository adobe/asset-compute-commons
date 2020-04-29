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

const actionWrapper = require("../lib/wrap");
const assert = require('assert');
const nock = require('nock');
const MetricsTestHelper = require("@nui/openwhisk-newrelic/lib/testhelper");

describe("wrap", function() {

    beforeEach(function() {
        // we keep this simple and don't want the metrics based off of these
        delete process.env.__OW_ACTION_NAME;
        delete process.env.__OW_NAMESPACE;
        delete process.env.__OW_ACTIVATION_ID;
        delete process.env.__OW_DEADLINE;

        nock.cleanAll();
        MetricsTestHelper.beforeEachTest();
    });

    afterEach(function() {
        MetricsTestHelper.afterEachTest();
    });

    describe("metrics", function() {
        it('wraps an action and provides metrics', async function() {
            const receivedMetrics = MetricsTestHelper.mockNewRelic();

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
                newRelicEventsURL: MetricsTestHelper.MOCK_URL,
                newRelicApiKey: MetricsTestHelper.MOCK_API_KEY,
                key: "value"
            };

            const result = await finalMain(params);
            assert.equal(result.ok, true);

            await MetricsTestHelper.metricsDone();
            assert.equal(receivedMetrics.length, 1);
            MetricsTestHelper.assertObjectMatches(receivedMetrics[0], {
                eventType: "activation",
                timestamp: /\d+/,
                duration: /\d+/,
                my: "metric"
            });
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
            const receivedMetrics = MetricsTestHelper.mockNewRelic();

            function main(params) {
                assert.equal(typeof params, "object");

                // metrics from wrapper
                assert.equal(params.metrics, "foo");

                return { ok: true };
            }

            const finalMain = actionWrapper(main);

            const params = {
                newRelicEventsURL: MetricsTestHelper.MOCK_URL,
                newRelicApiKey: MetricsTestHelper.MOCK_API_KEY,
                metrics: "foo"
            };

            const result = await finalMain(params);
            assert.equal(result.ok, true);

            await MetricsTestHelper.metricsDone();
            MetricsTestHelper.assertArrayContains(receivedMetrics, [{
                eventType: "activation",
                timestamp: /\d+/,
                duration: /\d+/
            }]);
        });

        it('metrics wrapper catches errors', async function() {
            const receivedMetrics = MetricsTestHelper.mockNewRelic();

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
                newRelicEventsURL: MetricsTestHelper.MOCK_URL,
                newRelicApiKey: MetricsTestHelper.MOCK_API_KEY,
                key: "value"
            };

            let threw = false;
            try {
                await finalMain(params);
            } catch (e) { /* eslint-disable-line no-unused-vars */
                // expected to throw
                threw = true;
            }
            if (!threw) {
                assert.fail("did not pass through error");
            }

            await MetricsTestHelper.metricsDone();
            MetricsTestHelper.assertArrayContains(receivedMetrics, [{
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
