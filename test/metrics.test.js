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

const assert = require('assert');
const nock = require('nock');
const zlib = require('zlib');
const AssetComputeMetrics = require('../lib/metrics');
const { Reason, SourceFormatUnsupportedError, GenericError } = require('../lib/errors');
const { promisify } = require('util');

const NR_FAKE_BASE_URL = "http://newrelic.com";
const NR_FAKE_EVENTS_PATH = "/events";
const NR_FAKE_API_KEY = "new-relic-api-key";
const EVENT_TYPE = "myevent";

const FAKE_PARAMS = {
    newRelicEventsURL: `${NR_FAKE_BASE_URL}${NR_FAKE_EVENTS_PATH}`,
    newRelicApiKey: NR_FAKE_API_KEY,
    requestId:"requestId",
    source: {
        name: "AssetName.txt",
        mimetype: "mimetype",
        size: "size"
    },
    auth: {
        orgId: "orgId",
        orgName: "orgName",
        clientId: "clientId",
        appName:"appName"
    }
};

const FAKE_PARAMS_NO_SOURCE = {
    newRelicEventsURL: `${NR_FAKE_BASE_URL}${NR_FAKE_EVENTS_PATH}`,
    newRelicApiKey: NR_FAKE_API_KEY,
    requestId: "requestId",
    auth: {
        orgId: "orgId",
        orgName: "orgName",
        clientId: "clientId",
        appName: "appName"
    }
};

const EXPECTED_METRICS = {
    actionName: "action",
    namespace: "namespace",
    activationId: "activationId",
    orgId: "orgId",
    orgName: "orgName",
    clientId: "clientId",
    package: "package",
    sourceName: "AssetName.txt",
    sourceMimetype: "mimetype",
    sourceSize: "size",
    timestamp: /\d+/,
    appName: "appName",
    requestId: "requestId"
};

const EXPECTED_METRICS_NO_SOURCE = {
    actionName: "action",
    namespace: "namespace",
    activationId: "activationId",
    orgId: "orgId",
    orgName: "orgName",
    clientId: "clientId",
    package: "package",
    timestamp: /\d+/,
    appName: "appName",
    requestId: "requestId"
};

function gunzip(body) {
    body = Buffer.from(body, 'hex');
    body = zlib.gunzipSync(body).toString();
    console.log("New Relic received:", body);
    return body;
}

function expectNewRelicInsightsEvent(metrics, statusCode=200, defaultExpectedMetrics=true) {
    if (!Array.isArray(metrics)) {
        metrics = [metrics];
    }
    metrics = metrics.map(m => ({
        ...(defaultExpectedMetrics ? EXPECTED_METRICS : {}),
        ...m
    }));

    return nock(NR_FAKE_BASE_URL)
        .filteringRequestBody(gunzip)
        .matchHeader("x-insert-key", NR_FAKE_API_KEY)
        .post(NR_FAKE_EVENTS_PATH, metrics)
        .reply(statusCode, {});
}

describe("AssetComputeMetrics", function() {

    beforeEach(function() {
        process.env.__OW_ACTION_NAME = "/namespace/package/action";
        process.env.__OW_NAMESPACE = "namespace";
        process.env.__OW_ACTIVATION_ID = "activationId";
        process.env.__OW_DEADLINE = Date.now() + 60000;
        nock.cleanAll();
    });

    it("constructor and all methods should be lenient and accept empty argument lists", async function() {
        let metrics = new AssetComputeMetrics();
        assert.ok(metrics);

        await metrics.sendMetrics();
        await metrics.sendErrorMetrics();
        await metrics.sendClientErrorMetrics();
        await metrics.handleError();
        await metrics.activationFinished();

        metrics = new AssetComputeMetrics({});
        assert.ok(metrics);

        await metrics.sendMetrics();
        await metrics.sendErrorMetrics();
        await metrics.sendClientErrorMetrics();
        await metrics.handleError();
        await metrics.activationFinished();
    });

    it("sendMetrics", async function() {
        expectNewRelicInsightsEvent([{
            eventType: EVENT_TYPE,
            test: "value"
        },{
            eventType: "activation",
            duration: /\d+/,
            test: "value"
        }]);

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);

        await metrics.sendMetrics(EVENT_TYPE, { test: "value" });
        await metrics.activationFinished({ test: "value" });
        assert.ok(nock.isDone(), "metrics not properly sent");
    });

    it("sendMetrics - does nothing on multiple calls to `activationFinished()`", async function() {
        expectNewRelicInsightsEvent([{
            eventType: EVENT_TYPE,
            test: "value"
        },{
            eventType: "activation",
            duration: /\d+/,
            test: "value"
        }]);

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);

        await metrics.sendMetrics(EVENT_TYPE, { test: "value" });
        await metrics.activationFinished({ test: "value" });
        await metrics.activationFinished({ test: "value2" }); // should only send activation metrics once
        assert.ok(nock.isDone(), "metrics not properly sent");
    });

    it("sendMetrics - no activation metrics", async function() {
        expectNewRelicInsightsEvent({
            eventType: EVENT_TYPE,
            test: "value"
        });

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);

        await metrics.sendMetrics(EVENT_TYPE, { test: "value" });
        await metrics.activationFinished({}, false);
        assert.ok(nock.isDone(), "metrics not properly sent");
    });

    it("sendMetrics - multiple in one instance", async function() {
        expectNewRelicInsightsEvent([{
            eventType: EVENT_TYPE,
            test: "value1",
            metric: 2
        },{
            eventType: EVENT_TYPE,
            test: "value2"
        },{
            eventType: "activation",
            duration: /\d+/
        }]);

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);

        await metrics.sendMetrics(EVENT_TYPE, { test: "value1", metric: 2 });
        await metrics.sendMetrics(EVENT_TYPE, { test: "value2" });
        await metrics.activationFinished();
        assert.ok(nock.isDone(), "metrics not properly sent");
    });

    it("sendMetrics - No Source Object", async function() {
        expectNewRelicInsightsEvent([
            Object.assign({}, EXPECTED_METRICS_NO_SOURCE, { eventType: "myevent" }),
            Object.assign({}, EXPECTED_METRICS_NO_SOURCE, { eventType: "activation", duration: /\d+/ }),
        ], 200, false);

        const metrics = new AssetComputeMetrics(FAKE_PARAMS_NO_SOURCE);

        await metrics.sendMetrics(EVENT_TYPE);
        await metrics.activationFinished();
        assert.ok(nock.isDone(), "metrics not properly sent");
    });

    it("sendMetrics - No Source Object at initialization, source metadata defined at time of send", async function() {
        expectNewRelicInsightsEvent([
            Object.assign( {}, EXPECTED_METRICS_NO_SOURCE, {
                eventType: EVENT_TYPE,
                sourceName: 'sourceName',
                test:'value'
            }),
            Object.assign( {}, EXPECTED_METRICS_NO_SOURCE, {
                eventType: 'activation',
                duration: /\d+/
            })
        ], 200, false);

        const metrics = new AssetComputeMetrics(Object.assign({}, FAKE_PARAMS_NO_SOURCE, {
            source: 'source'
        }));

        await metrics.sendMetrics(EVENT_TYPE, { test: "value", sourceName:'sourceName' });
        await metrics.activationFinished();
        assert.ok(nock.isDone(), "metrics not properly sent");
    });

    it("sendErrorMetrics", async function() {
        const nockSendEvent = expectNewRelicInsightsEvent([{
            eventType: AssetComputeMetrics.ERROR_EVENT_TYPE,
            message: "message",
            location: "location",
            test: "value"
        },{
            eventType: "activation",
            duration: /\d+/
        }]);

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);

        await metrics.sendErrorMetrics("location", "message", { test: "value" });
        await metrics.activationFinished();
        assert.ok(nockSendEvent.isDone(), "metrics not properly sent");
    });

    it("sendClientErrorMetrics", async function() {
        const nockSendEvent = expectNewRelicInsightsEvent([{
            eventType: AssetComputeMetrics.CLIENT_ERROR_EVENT_TYPE,
            message: "message",
            reason: Reason.SourceCorrupt,
            test: "value"
        },{
            eventType: "activation",
            duration: /\d+/
        }]);

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);

        await metrics.sendClientErrorMetrics(Reason.SourceCorrupt, "message", { test: "value" });
        await metrics.activationFinished();
        assert.ok(nockSendEvent.isDone(), "metrics not properly sent");
    });

    it("handleError - new Error", async function() {
        expectNewRelicInsightsEvent([{
            eventType: AssetComputeMetrics.ERROR_EVENT_TYPE,
            message: "message",
            location: "location",
            test: "value"
        },{
            eventType: "activation",
            duration: /\d+/
        }]);

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);

        await metrics.handleError(new Error("message"), {
            location: "location",
            metrics: {
                test: "value"
            }
        });
        await metrics.activationFinished();
        assert.ok(nock.isDone(), "metrics not properly sent");
    });

    it("handleError - new HTTP Error", async function() {
        expectNewRelicInsightsEvent([{
            eventType: AssetComputeMetrics.ERROR_EVENT_TYPE,
            message: "http message",
            location: "location",
            statusCode: 400,
            test: "value"
        },{
            eventType: "activation",
            duration: /\d+/
        }]);

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);

        const httpError = new Error("http message");
        httpError.statusCode = 400;
        await metrics.handleError(httpError, {
            location: "location",
            metrics: {
                test: "value"
            }
        });
        await metrics.activationFinished();
        assert.ok(nock.isDone(), "metrics not properly sent");
    });

    it("handleError - new ClientError/SourceFormatUnsupportedError", async function() {
        expectNewRelicInsightsEvent([{
            eventType: AssetComputeMetrics.CLIENT_ERROR_EVENT_TYPE,
            message: "message",
            reason: Reason.SourceFormatUnsupported,
            test: "value"
        },{
            eventType: "activation",
            duration: /\d+/
        }]);

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);

        const httpError = new SourceFormatUnsupportedError("message");
        httpError.statusCode = 400;
        await metrics.handleError(httpError, {
            metrics: {
                test: "value"
            }
        });
        await metrics.activationFinished();
        assert.ok(nock.isDone(), "metrics not properly sent");
    });

    it("handleError - new GenericError", async function() {
        expectNewRelicInsightsEvent([{
            eventType: AssetComputeMetrics.ERROR_EVENT_TYPE,
            message: "message",
            location: "location",
            test: "value"
        },{
            eventType: "activation",
            duration: /\d+/
        }]);

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);

        await metrics.handleError(new GenericError("message", "location"), {
            metrics: {
                test: "value"
            }
        });
        await metrics.activationFinished();
        assert.ok(nock.isDone(), "metrics not properly sent");
    });

    it("handleError - default location", async function() {
        expectNewRelicInsightsEvent([{
            eventType: AssetComputeMetrics.ERROR_EVENT_TYPE,
            message: "message",
            location: "action" // taken from action name
        },{
            eventType: "activation",
            duration: /\d+/
        }]);

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);
        await metrics.handleError(new GenericError("message"));
        await metrics.activationFinished();
        assert.ok(nock.isDone(), "metrics not properly sent");
    });

    it("handleError - missing __OW_ACTION_NAME", async function() {
        delete process.env.__OW_ACTION_NAME;
        const metrics_no_actionName = {
            namespace: "namespace",
            activationId: "activationId",
            orgId: "orgId",
            orgName: "orgName",
            clientId: "clientId",
            sourceName: "AssetName.txt",
            sourceMimetype: "mimetype",
            sourceSize: "size",
            timestamp: /\d+/,
            appName: "appName",
            requestId: "requestId"
        }
        expectNewRelicInsightsEvent([
            Object.assign({
                eventType: AssetComputeMetrics.ERROR_EVENT_TYPE,
                message: "message",
                location: ""
            }, metrics_no_actionName),
            Object.assign({
                eventType: "activation",
                duration: /\d+/
            }, metrics_no_actionName)
        ], 200, false);

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);
        await metrics.handleError(new GenericError("message"));
        await metrics.activationFinished();
        assert.ok(nock.isDone(), "metrics not properly sent");
    });

    it("handleError - ignore web action error responses", async function() {
        nock(NR_FAKE_BASE_URL)
            .filteringRequestBody(gunzip)
            .matchHeader("x-insert-key", NR_FAKE_API_KEY)
            .post(NR_FAKE_EVENTS_PATH, () => true)
        .replyWithError({ message: "not expected"});

        const metrics = new AssetComputeMetrics(FAKE_PARAMS, { disableActionTimeout: true });

        await metrics.handleError({
            statusCode: 400,
            body: {
                ok: false
            }
        });
        assert.ok(!nock.isDone(), "it did send metrics although it should not");
    });

    it("send timeout metrics", async function() {
        const nockSendEvent = expectNewRelicInsightsEvent({
            eventType: "timeout",
            duration: /\d+/
        }, 200, true);
        process.env.__OW_DEADLINE = Date.now() + 5;
        new AssetComputeMetrics(FAKE_PARAMS);
        const sleep = promisify(setTimeout);
        await sleep(500);
        assert.ok(nockSendEvent.isDone(), "metrics not properly sent");
    });

    it("add()", async function() {
        expectNewRelicInsightsEvent([{
            eventType: EVENT_TYPE,
            test: "value",
            added: "metric",
            anotherAdded: "metric"
        },{
            eventType: EVENT_TYPE,
            test: "value",
            added: "metric2",
            anotherAdded: "metric"
        },{
            eventType: EVENT_TYPE,
            added: "metric3",
            anotherAdded: "metric"
        },{
            eventType: "activation",
            duration: /\d+/,
            test: "value",
            added: "metric2",
            anotherAdded: "metric"
        }]);

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);
        // add metrics
        metrics.add({
            added: "metric",
            anotherAdded: "metric"
        });

        await metrics.sendMetrics(EVENT_TYPE, { test: "value" });

        // overwrite previously added metrics with newly added metrics
        metrics.add({added: "metric2"});
        await metrics.sendMetrics(EVENT_TYPE, { test: "value" });

        // overwrite previously added metrics via send() metrics
        await metrics.sendMetrics(EVENT_TYPE, {added: "metric3"});

        await metrics.activationFinished({ test: "value" });
        assert.ok(nock.isDone(), "metrics not properly sent");
    });

    it("get()", async function() {
        expectNewRelicInsightsEvent([{
            eventType: EVENT_TYPE,
            test: "value",
            added: "metric",
            anotherAdded: "metric"
        },{
            eventType: "activation",
            duration: /\d+/,
            added: "metric",
            anotherAdded: "metric"
        }]);

        const metrics = new AssetComputeMetrics(FAKE_PARAMS, {
            disableActionTimeout: true
        });
        metrics.add({
            added: "metric",
            anotherAdded: "metric"
        });

        await metrics.sendMetrics(EVENT_TYPE, { test: "value" });

        const actual = metrics.get();
        const expected = Object.assign({
            added: "metric",
            anotherAdded: "metric",
        }, EXPECTED_METRICS);

        // ignore dynamic timestamp
        delete actual.timestamp;
        delete expected.timestamp;

        assert.deepStrictEqual(actual, expected);

        await metrics.activationFinished();

        assert.ok(nock.isDone(), "metrics not properly sent");
    });

    describe("negative error cases", function() {
        it("sendMetrics fails", async function() {
            const nockSendEvent = expectNewRelicInsightsEvent([{
                eventType: EVENT_TYPE,
                test: "value"
            },{
                eventType: "activation",
                duration: /\d+/
            }], 500);

            const metrics = new AssetComputeMetrics(FAKE_PARAMS);
            await metrics.sendMetrics(EVENT_TYPE, { test: "value" });
            await metrics.activationFinished();
            assert.ok(nockSendEvent.isDone(), "metrics not properly sent");
        });

        it("auth is missing", async function() {
            const metrics_no_auth = {
                actionName: "action",
                namespace: "namespace",
                activationId: "activationId",
                requestId: "requestId",
                package: "package",
                timestamp: /\d+/
            }
            expectNewRelicInsightsEvent([
                Object.assign({
                    eventType: EVENT_TYPE,
                    test: "value"
                }, metrics_no_auth),
                Object.assign({ eventType: "activation", duration: /\d+/ }, metrics_no_auth)
            ], 200, false);

            const metrics = new AssetComputeMetrics({
                newRelicEventsURL: `${NR_FAKE_BASE_URL}${NR_FAKE_EVENTS_PATH}`,
                newRelicApiKey: NR_FAKE_API_KEY,
                requestId: "requestId"
            });
            await metrics.sendMetrics(EVENT_TYPE, { test: "value" });
            await metrics.activationFinished();
            assert.ok(nock.isDone(), "metrics not properly sent");
        });


        it("new relic request fails", async function() {
            const nockSendEvent = nock(NR_FAKE_BASE_URL)
                .filteringRequestBody(gunzip)
                .matchHeader("x-insert-key", NR_FAKE_API_KEY)
                .post(NR_FAKE_EVENTS_PATH, [{
                    ...EXPECTED_METRICS,
                    eventType: EVENT_TYPE
                },{
                    ...EXPECTED_METRICS,
                    eventType: "activation",
                    duration: /\d+/
                }])
                .replyWithError({
                    message: 'something awful happened',
                    code: 'AWFUL_ERROR',
                });

            const metrics = new AssetComputeMetrics(FAKE_PARAMS);
            await metrics.sendMetrics(EVENT_TYPE);
            await metrics.activationFinished();
            assert.ok(nockSendEvent.isDone(), "metrics not properly sent");
        });
    });
});

describe("AssetComputeMetrics (without NR credentials)", function() {
    beforeEach(function() {
        process.env.__OW_ACTION_NAME = "/namespace/package/action";
        process.env.__OW_NAMESPACE = "namespace";
        process.env.__OW_ACTIVATION_ID = "activationId";
        process.env.__OW_DEADLINE = Date.now() + 60000;
    });

    it("does not hang if there are no new relic parameters", async function() {
        let metrics = new AssetComputeMetrics({
            newRelicEventsURL: null,
            newRelicApiKey: NR_FAKE_API_KEY,
            requestId: "requestId"
        });
        await metrics.activationFinished({}, true);

        metrics = new AssetComputeMetrics({
            newRelicEventsURL: null,
            newRelicApiKey: null,
            requestId: "requestId"
        });
        await metrics.activationFinished({}, true);

        metrics = new AssetComputeMetrics({
            newRelicEventsURL: `${NR_FAKE_BASE_URL}${NR_FAKE_EVENTS_PATH}`,
            newRelicApiKey: null,
            requestId: "requestId"
        });
        await metrics.activationFinished({}, true);

        metrics = new AssetComputeMetrics({
            newRelicEventsURL: null,
            newRelicApiKey: NR_FAKE_API_KEY,
            requestId: "requestId"
        });
        await metrics.activationFinished({}, false);

        metrics = new AssetComputeMetrics({
            newRelicEventsURL: null,
            newRelicApiKey: null,
            requestId: "requestId"
        });
        await metrics.activationFinished({}, false);

        metrics = new AssetComputeMetrics({
            newRelicEventsURL: `${NR_FAKE_BASE_URL}${NR_FAKE_EVENTS_PATH}`,
            newRelicApiKey: null,
            requestId: "requestId"
        });
        await metrics.activationFinished({}, false);
    });
});