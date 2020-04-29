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

const assert = require('assert');
const nock = require('nock');
const sleep = require('util').promisify(setTimeout);
const AssetComputeMetrics = require('../lib/metrics');
const { Reason, SourceFormatUnsupportedError, GenericError } = require('../lib/errors');
const MetricsTestHelper = require("@nui/openwhisk-newrelic/lib/testhelper");


const EVENT_TYPE = "myevent";

const FAKE_PARAMS = {
    newRelicEventsURL: MetricsTestHelper.MOCK_URL,
    newRelicApiKey: MetricsTestHelper.MOCK_API_KEY,
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
    newRelicEventsURL: MetricsTestHelper.MOCK_URL,
    newRelicApiKey: MetricsTestHelper.MOCK_API_KEY,
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

describe("AssetComputeMetrics", function() {

    beforeEach(function() {
        process.env.__OW_ACTION_NAME = "/namespace/package/action";
        process.env.__OW_NAMESPACE = "namespace";
        process.env.__OW_ACTIVATION_ID = "activationId";
        process.env.__OW_DEADLINE = Date.now() + 60000;

        nock.cleanAll();
        MetricsTestHelper.beforeEachTest();
    });

    afterEach(function() {
        MetricsTestHelper.afterEachTest();
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
        const receivedMetrics = MetricsTestHelper.mockNewRelic();

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);
        await metrics.sendMetrics(EVENT_TYPE, { test: "value" });
        await metrics.activationFinished({ test: "value" });

        await MetricsTestHelper.metricsDone();
        MetricsTestHelper.assertArrayContains(receivedMetrics, [{
            eventType: EVENT_TYPE,
            test: "value"
        },{
            eventType: "activation",
            duration: /\d+/,
            test: "value"
        }]);
    });

    it("sendMetrics - does nothing on multiple calls to `activationFinished()`", async function() {
        const receivedMetrics = MetricsTestHelper.mockNewRelic();

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);
        await metrics.sendMetrics(EVENT_TYPE, { test: "value" });
        await metrics.activationFinished({ test: "value" });
        await metrics.activationFinished({ test: "value2" }); // should only send activation metrics once

        await MetricsTestHelper.metricsDone(500);
        MetricsTestHelper.assertArrayContains(receivedMetrics, [{
            eventType: EVENT_TYPE,
            test: "value"
        },{
            eventType: "activation",
            duration: /\d+/,
            test: "value"
        }]);
    });

    it("sendMetrics - no activation metrics", async function() {
        const receivedMetrics = MetricsTestHelper.mockNewRelic();

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);
        await metrics.sendMetrics(EVENT_TYPE, { test: "value" });
        await metrics.activationFinished({}, false);

        await MetricsTestHelper.metricsDone();
        MetricsTestHelper.assertArrayContains(receivedMetrics, [{
            eventType: EVENT_TYPE,
            test: "value"
        }]);
    });

    it("sendMetrics - multiple in one instance", async function() {
        const receivedMetrics = MetricsTestHelper.mockNewRelic();

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);
        await metrics.sendMetrics(EVENT_TYPE, { test: "value1", metric: 2 });
        await metrics.sendMetrics(EVENT_TYPE, { test: "value2" });
        await metrics.activationFinished();

        await MetricsTestHelper.metricsDone();
        MetricsTestHelper.assertArrayContains(receivedMetrics, [{
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
    });

    it("sendMetrics - No Source Object", async function() {
        const receivedMetrics = MetricsTestHelper.mockNewRelic();

        const metrics = new AssetComputeMetrics(FAKE_PARAMS_NO_SOURCE);
        await metrics.sendMetrics(EVENT_TYPE);
        await metrics.activationFinished();

        await MetricsTestHelper.metricsDone();
        MetricsTestHelper.assertArrayContains(receivedMetrics, [{
            eventType: "myevent",
            ...EXPECTED_METRICS_NO_SOURCE
        },{
            eventType: "activation",
            duration: /\d+/,
            ...EXPECTED_METRICS_NO_SOURCE
        }]);
    });

    it("sendMetrics - No Source Object at initialization, source metadata defined at time of send", async function() {
        const receivedMetrics = MetricsTestHelper.mockNewRelic();

        const metrics = new AssetComputeMetrics({
            ...FAKE_PARAMS_NO_SOURCE,
            source: 'source'
        });
        await metrics.sendMetrics(EVENT_TYPE, { test: "value", sourceName:'sourceName' });
        await metrics.activationFinished();

        await MetricsTestHelper.metricsDone();
        MetricsTestHelper.assertArrayContains(receivedMetrics, [{
            eventType: EVENT_TYPE,
            sourceName: 'sourceName',
            test: 'value',
            ...EXPECTED_METRICS_NO_SOURCE
        },{
            eventType: "activation",
            duration: /\d+/,
            ...EXPECTED_METRICS_NO_SOURCE
        }]);
    });

    it("sendErrorMetrics", async function() {
        const receivedMetrics = MetricsTestHelper.mockNewRelic();

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);
        await metrics.sendErrorMetrics("location", "message", { test: "value" });
        await metrics.activationFinished();

        await MetricsTestHelper.metricsDone();
        MetricsTestHelper.assertArrayContains(receivedMetrics, [{
            eventType: AssetComputeMetrics.ERROR_EVENT_TYPE,
            message: "message",
            location: "location",
            test: "value"
        },{
            eventType: "activation",
            duration: /\d+/
        }]);
    });

    it("sendClientErrorMetrics", async function() {
        const receivedMetrics = MetricsTestHelper.mockNewRelic();

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);
        await metrics.sendClientErrorMetrics(Reason.SourceCorrupt, "message", { test: "value" });
        await metrics.activationFinished();

        await MetricsTestHelper.metricsDone();
        MetricsTestHelper.assertArrayContains(receivedMetrics, [{
            eventType: AssetComputeMetrics.CLIENT_ERROR_EVENT_TYPE,
            message: "message",
            reason: Reason.SourceCorrupt,
            test: "value"
        },{
            eventType: "activation",
            duration: /\d+/
        }]);
    });

    it("handleError - new Error", async function() {
        const receivedMetrics = MetricsTestHelper.mockNewRelic();

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);
        await metrics.handleError(new Error("message"), {
            location: "location",
            metrics: {
                test: "value"
            }
        });
        await metrics.activationFinished();

        await MetricsTestHelper.metricsDone();
        MetricsTestHelper.assertArrayContains(receivedMetrics, [{
            eventType: AssetComputeMetrics.ERROR_EVENT_TYPE,
            message: "message",
            location: "location",
            test: "value"
        },{
            eventType: "activation",
            duration: /\d+/
        }]);
    });

    it("handleError - new HTTP Error", async function() {
        const receivedMetrics = MetricsTestHelper.mockNewRelic();

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

        await MetricsTestHelper.metricsDone();
        MetricsTestHelper.assertArrayContains(receivedMetrics, [{
            eventType: AssetComputeMetrics.ERROR_EVENT_TYPE,
            message: "http message",
            location: "location",
            statusCode: 400,
            test: "value"
        },{
            eventType: "activation",
            duration: /\d+/
        }]);
    });

    it("handleError - new ClientError/SourceFormatUnsupportedError", async function() {
        const receivedMetrics = MetricsTestHelper.mockNewRelic();

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);
        const httpError = new SourceFormatUnsupportedError("message");
        httpError.statusCode = 400;
        await metrics.handleError(httpError, {
            metrics: {
                test: "value"
            }
        });
        await metrics.activationFinished();

        await MetricsTestHelper.metricsDone();
        MetricsTestHelper.assertArrayContains(receivedMetrics, [{
            eventType: AssetComputeMetrics.CLIENT_ERROR_EVENT_TYPE,
            message: "message",
            reason: Reason.SourceFormatUnsupported,
            test: "value"
        },{
            eventType: "activation",
            duration: /\d+/
        }]);
    });

    it("handleError - new GenericError", async function() {
        const receivedMetrics = MetricsTestHelper.mockNewRelic();

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);
        await metrics.handleError(new GenericError("message", "location"), {
            metrics: {
                test: "value"
            }
        });
        await metrics.activationFinished();

        await MetricsTestHelper.metricsDone();
        MetricsTestHelper.assertArrayContains(receivedMetrics, [{
            eventType: AssetComputeMetrics.ERROR_EVENT_TYPE,
            message: "message",
            location: "location",
            test: "value"
        },{
            eventType: "activation",
            duration: /\d+/
        }]);
    });

    it("handleError - default location", async function() {
        const receivedMetrics = MetricsTestHelper.mockNewRelic();

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);
        await metrics.handleError(new GenericError("message"));
        await metrics.activationFinished();

        await MetricsTestHelper.metricsDone();
        MetricsTestHelper.assertArrayContains(receivedMetrics, [{
            eventType: AssetComputeMetrics.ERROR_EVENT_TYPE,
            message: "message",
            location: "action" // taken from action name
        },{
            eventType: "activation",
            duration: /\d+/
        }]);
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
        const receivedMetrics = MetricsTestHelper.mockNewRelic();

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);
        await metrics.handleError(new GenericError("message"));
        await metrics.activationFinished();

        await MetricsTestHelper.metricsDone();
        MetricsTestHelper.assertArrayContains(receivedMetrics, [{
            eventType: AssetComputeMetrics.ERROR_EVENT_TYPE,
            message: "message",
            location: "",
            ...metrics_no_actionName
        },{
            eventType: "activation",
            duration: /\d+/,
            ...metrics_no_actionName
        }]);
    });

    it("handleError - ignore web action error responses", async function() {
        const receivedMetrics = MetricsTestHelper.mockNewRelic();

        const metrics = new AssetComputeMetrics(FAKE_PARAMS, { disableActionTimeout: true });
        await metrics.handleError({
            statusCode: 400,
            body: {
                ok: false
            }
        });

        await sleep(100);
        assert.equal(receivedMetrics.length, 0, "it did send metrics although it should not")
    });

    it("send timeout metrics", async function() {
        const receivedMetrics = MetricsTestHelper.mockNewRelic();

        process.env.__OW_DEADLINE = Date.now() + 5;
        new AssetComputeMetrics(FAKE_PARAMS);

        await MetricsTestHelper.metricsDone();
        MetricsTestHelper.assertArrayMatches(receivedMetrics, [{
            eventType: "timeout",
            duration: /\d+/
        }]);
    });

    it("add()", async function() {
        const receivedMetrics = MetricsTestHelper.mockNewRelic();

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

        await MetricsTestHelper.metricsDone();
        MetricsTestHelper.assertArrayContains(receivedMetrics, [{
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
    });

    it("get()", async function() {
        const receivedMetrics = MetricsTestHelper.mockNewRelic();

        const metrics = new AssetComputeMetrics(FAKE_PARAMS, {
            disableActionTimeout: true
        });
        metrics.add({
            added: "metric",
            anotherAdded: "metric"
        });

        await metrics.sendMetrics(EVENT_TYPE, { test: "value" });

        const actual = metrics.get();
        const expected = {
            ...EXPECTED_METRICS,
            added: "metric",
            anotherAdded: "metric",
        };

        // ignore dynamic timestamp
        delete actual.timestamp;
        delete expected.timestamp;

        MetricsTestHelper.assertObjectMatches(actual, expected);

        await metrics.activationFinished();

        await MetricsTestHelper.metricsDone();
        MetricsTestHelper.assertArrayContains(receivedMetrics, [{
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
    });

    describe("negative error cases", function() {
        it("sendMetrics fails", async function() {
            const failedMetricsNock = nock(MetricsTestHelper.MOCK_BASE_URL)
                .post(MetricsTestHelper.MOCK_URL_PATH)
                .reply(500)

            const metrics = new AssetComputeMetrics(FAKE_PARAMS);
            await metrics.sendMetrics(EVENT_TYPE, { test: "value" });
            await metrics.activationFinished();

            await sleep(100);
            failedMetricsNock.done();
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
            const receivedMetrics = MetricsTestHelper.mockNewRelic();

            const metrics = new AssetComputeMetrics({
                newRelicEventsURL: MetricsTestHelper.MOCK_URL,
                newRelicApiKey: MetricsTestHelper.MOCK_API_KEY,
                requestId: "requestId"
            });
            await metrics.sendMetrics(EVENT_TYPE, { test: "value" });
            await metrics.activationFinished();

            await MetricsTestHelper.metricsDone();
            MetricsTestHelper.assertArrayContains(receivedMetrics, [{
                eventType: EVENT_TYPE,
                test: "value",
                ...metrics_no_auth
            },{
                eventType: "activation",
                duration: /\d+/,
                ...metrics_no_auth
            }]);
        });


        it("new relic request fails", async function() {
            const failedMetricsNock = nock(MetricsTestHelper.MOCK_BASE_URL)
                .post(MetricsTestHelper.MOCK_URL_PATH)
                .replyWithError({
                    message: 'something awful happened',
                    code: 'AWFUL_ERROR',
                });

            const metrics = new AssetComputeMetrics(FAKE_PARAMS);
            await metrics.sendMetrics(EVENT_TYPE);
            await metrics.activationFinished();

            await sleep(100);
            failedMetricsNock.done();
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
            newRelicApiKey: MetricsTestHelper.MOCK_API_KEY,
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
            newRelicEventsURL: MetricsTestHelper.MOCK_URL,
            newRelicApiKey: null,
            requestId: "requestId"
        });
        await metrics.activationFinished({}, true);

        metrics = new AssetComputeMetrics({
            newRelicEventsURL: null,
            newRelicApiKey: MetricsTestHelper.MOCK_API_KEY,
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
            newRelicEventsURL: MetricsTestHelper.MOCK_URL,
            newRelicApiKey: null,
            requestId: "requestId"
        });
        await metrics.activationFinished({}, false);
    });
});
