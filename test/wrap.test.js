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

const actionWrapper = require("../lib/wrap");
const assert = require('assert');
const nock = require('nock');
const MetricsTestHelper = require("@adobe/openwhisk-newrelic/lib/testhelper");
const sinon = require('sinon');
const rewire = require('rewire');

// Exercise the full action wrapper with deterministic telemetry failures and
// no network/instrumentation. Keep production dependency behaviour untouched.
function wrapperWithMetrics(metrics) {
    const module = rewire('../lib/wrap');
    module.__set__('AssetComputeMetrics', function() { return metrics; });
    module.__set__('NewRelic', { instrument: main => main });
    return module;
}

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
        for (const synchronous of [false, true]) {
            it(`preserves the original worker error when error telemetry ${synchronous ? "throws" : "rejects"}`, async function() {
                const telemetryError = new Error("telemetry failed");
                const metrics = {
                    activationStarted: sinon.stub().resolves(),
                    handleError: synchronous ? sinon.stub().throws(telemetryError) : sinon.stub().rejects(telemetryError),
                    activationFinished: sinon.stub()
                };
                const wrap = wrapperWithMetrics(metrics);
                const original = Object.assign(new Error("download failed"), {
                    requestId: "req",
                    invocationFailed: true,
                    noRetry: true,
                    renditionOutcomes: [{ index: 0, status: "failed", errorType: "SourceCorrupt", message: "download failed" }]
                });
                const log = sinon.stub(console, 'error');
                try {
                    await assert.rejects(wrap(async function() { throw original; })({}), function(err) {
                        assert.strictEqual(err, original, "telemetry must not replace or reconstruct the worker error");
                        assert.strictEqual(err.requestId, "req");
                        assert.strictEqual(err.invocationFailed, true);
                        assert.strictEqual(err.noRetry, true);
                        assert.deepStrictEqual(err.renditionOutcomes, original.renditionOutcomes);
                        return true;
                    });
                    assert.strictEqual(metrics.handleError.callCount, 1);
                    assert.strictEqual(metrics.handleError.firstCall.args[0], original);
                    assert.strictEqual(metrics.activationFinished.callCount, 1);
                    assert.strictEqual(log.callCount, 1);
                    assert.strictEqual(log.firstCall.args[1], telemetryError);
                } finally {
                    log.restore();
                }
            });
        }

        it('preserves ordinary legacy errors when error telemetry rejects', async function() {
            const metrics = {
                activationStarted: sinon.stub().resolves(),
                handleError: sinon.stub().rejects(new Error("telemetry failed")),
                activationFinished: sinon.stub()
            };
            const wrap = wrapperWithMetrics(metrics);
            const original = new Error("legacy worker failed");
            const log = sinon.stub(console, 'error');
            try {
                await assert.rejects(wrap(function() { throw original; })({}), function(err) {
                    assert.strictEqual(err, original);
                    assert.strictEqual(err.renditionOutcomes, undefined);
                    return true;
                });
                assert.strictEqual(metrics.activationFinished.callCount, 1);
            } finally {
                log.restore();
            }
        });

        it('wraps an action and provides activation and activation_start metrics', async function() {
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
            assert.equal(receivedMetrics.length, 2);
            MetricsTestHelper.assertObjectMatches(receivedMetrics[0], {
                eventType: "activation_start",
                timestamp: /\d+/
            });
            MetricsTestHelper.assertObjectMatches(receivedMetrics[1], {
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

            process.env.__OW_ACTION_NAME = "my-action";

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

        it('metrics wrapper proceeds gracefully on activation_start metric error', async function() {

            // respond to first NR request with failure
            nock(MetricsTestHelper.MOCK_BASE_URL)
                .post(MetricsTestHelper.MOCK_URL_PATH)
                .reply(500);

            // subsequent NR requests hit regular/successul mock
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

            // no activation_start metric should be received
            assert.equal(receivedMetrics.length, 1);
            MetricsTestHelper.assertObjectMatches(receivedMetrics[0], {
                eventType: "activation",
                timestamp: /\d+/,
                duration: /\d+/,
                my: "metric"
            });
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
