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
const jsonwebtoken = require('jsonwebtoken');
const AssetComputeMetrics = require('../lib/metrics');
const { Reason, SourceFormatUnsupportedError, GenericError } = require('../lib/errors');

const NR_FAKE_BASE_URL = "http://newrelic.com";
const NR_FAKE_EVENTS_PATH = "/events";
const NR_FAKE_API_KEY = "new-relic-api-key";
const EVENT_TYPE = "myevent";

const FAKE_PARAMS = {
    newRelicEventsURL: `${NR_FAKE_BASE_URL}${NR_FAKE_EVENTS_PATH}`,
    newRelicApiKey: NR_FAKE_API_KEY,
    ingestionId: "ingestionId",
    source: {
        name: "AssetName.txt",
        mimetype: "mimetype",
        size: "size"
    },
    auth: {
        orgId: "orgId",
        accessToken: jsonwebtoken.sign({client_id: "clientId"}, "key")
    }
};

const EXPECTED_METRICS = {
    actionName: "action",
    namespace: "namespace",
    activationId: "activationId",
    ingestionId: "ingestionId",
    orgId: "orgId",
    clientId: "clientId",
    package: "package",
    sourceName: "AssetName.txt",
    sourceMimetype: "mimetype",
    sourceSize: "size",
    timestamp: /\d+/
};

function gunzip(body) {
    body = Buffer.from(body, 'hex');
    body = zlib.gunzipSync(body).toString();
    console.log("New Relic received:", body);
    return body;
}

function expectNewRelicInsightsEvent(metrics, statusCode=200, defaultExpectedMetrics=true) {
    return nock(NR_FAKE_BASE_URL)
        .filteringRequestBody(gunzip)
        .matchHeader("x-insert-key", NR_FAKE_API_KEY)
        .post(NR_FAKE_EVENTS_PATH, {
            ...(defaultExpectedMetrics ? EXPECTED_METRICS : {}),
            ...metrics
        })
        .reply(statusCode, {});
}

describe("AssetComputeMetrics", function() {

    beforeEach(function() {
        process.env.__OW_ACTION_NAME = "/namespace/package/action";
        process.env.__OW_NAMESPACE = "namespace";
        process.env.__OW_ACTIVATION_ID = "activationId";
        process.env.__OW_DEADLINE = Date.now() + 60000;
    })

    it("constructor and all methods should be lenient and accept empty argument lists", async function() {
        let metrics = new AssetComputeMetrics();
        assert.ok(metrics);
        metrics.start();
        await metrics.sendMetrics();
        await metrics.sendErrorMetrics();
        await metrics.sendClientErrorMetrics();
        await metrics.handleError();
        metrics.close();

        metrics = new AssetComputeMetrics({});
        assert.ok(metrics);
        metrics.start();
        await metrics.sendMetrics();
        await metrics.sendErrorMetrics();
        await metrics.sendClientErrorMetrics();
        await metrics.handleError();
        metrics.close();
    });

    it("sendMetrics", async function() {
        const nockSendEvent = expectNewRelicInsightsEvent({
            eventType: EVENT_TYPE,
            test: "value"
        });

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);
        metrics.start();
        await metrics.sendMetrics(EVENT_TYPE, { test: "value" });
        assert.ok(nockSendEvent.isDone(), "metrics not properly sent");
        metrics.close();
    });

    it("sendMetrics - No Source Object", async function() {

        const params = {
            newRelicEventsURL: `${NR_FAKE_BASE_URL}${NR_FAKE_EVENTS_PATH}`,
            newRelicApiKey: NR_FAKE_API_KEY,
            ingestionId: "ingestionId",
            auth: {
                orgId: "orgId",
                accessToken: jsonwebtoken.sign({client_id: "clientId"}, "key")
            }
        };

        const nockSendEvent = expectNewRelicInsightsEvent({
            eventType: EVENT_TYPE,
            test: "value",
            activationId: "activationId",
            ingestionId: "ingestionId",
            namespace: "namespace",
            package: "package",
            actionName: "action",
            orgId: "orgId",
            clientId: "clientId",
            timestamp: /\d+/
        }, 200, false);

        const metrics = new AssetComputeMetrics(params);
        metrics.start();
        await metrics.sendMetrics(EVENT_TYPE, { test: "value" });
        assert.ok(nockSendEvent.isDone(), "metrics not properly sent");
        metrics.close();
    });

    it("sendMetrics - Source Object empty", async function() {

        const params = {
            newRelicEventsURL: `${NR_FAKE_BASE_URL}${NR_FAKE_EVENTS_PATH}`,
            newRelicApiKey: NR_FAKE_API_KEY,
            ingestionId: "ingestionId",
            source: {},
            auth: {
                orgId: "orgId",
                accessToken: jsonwebtoken.sign({client_id: "clientId"}, "key")
            }
        };

        const nockSendEvent = expectNewRelicInsightsEvent({
            eventType: EVENT_TYPE,
            test: "value",
            activationId: "activationId",
            ingestionId: "ingestionId",
            namespace: "namespace",
            package: "package",
            actionName: "action",
            orgId: "orgId",
            clientId: "clientId",
            timestamp: /\d+/
        }, 200, false);

        const metrics = new AssetComputeMetrics(params);
        metrics.start();
        await metrics.sendMetrics(EVENT_TYPE, { test: "value" });
        assert.ok(nockSendEvent.isDone(), "metrics not properly sent");
        metrics.close();
    });

    it("sendErrorMetrics", async function() {
        const nockSendEvent = expectNewRelicInsightsEvent({
            eventType: AssetComputeMetrics.ERROR_EVENT_TYPE,
            message: "message",
            location: "location",
            test: "value"
        });

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);
        metrics.start();
        await metrics.sendErrorMetrics("location", "message", { test: "value" });
        assert.ok(nockSendEvent.isDone(), "metrics not properly sent");
        metrics.close();
    });

    it("sendClientErrorMetrics", async function() {
        const nockSendEvent = expectNewRelicInsightsEvent({
            eventType: AssetComputeMetrics.CLIENT_ERROR_EVENT_TYPE,
            message: "message",
            reason: Reason.SourceCorrupt,
            test: "value"
        });

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);
        metrics.start();
        await metrics.sendClientErrorMetrics(Reason.SourceCorrupt, "message", { test: "value" });
        assert.ok(nockSendEvent.isDone(), "metrics not properly sent");
        metrics.close();
    });

    it("handleError - new Error", async function() {
        const nockSendEvent = expectNewRelicInsightsEvent({
            eventType: AssetComputeMetrics.ERROR_EVENT_TYPE,
            message: "message",
            location: "location",
            test: "value"
        });

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);
        metrics.start();
        await metrics.handleError(new Error("message"), {
            location: "location",
            metrics: {
                test: "value"
            }
        });
        assert.ok(nockSendEvent.isDone(), "metrics not properly sent");
        metrics.close();
    });

    it("handleError - new HTTP Error", async function() {
        const nockSendEvent = expectNewRelicInsightsEvent({
            eventType: AssetComputeMetrics.ERROR_EVENT_TYPE,
            message: "http message",
            location: "location",
            statusCode: 400,
            test: "value"
        });

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);
        metrics.start();
        const httpError = new Error("http message");
        httpError.statusCode = 400;
        await metrics.handleError(httpError, {
            location: "location",
            metrics: {
                test: "value"
            }
        });
        assert.ok(nockSendEvent.isDone(), "metrics not properly sent");
        metrics.close();
    });

    it("handleError - new ClientError/SourceFormatUnsupportedError", async function() {
        const nockSendEvent = expectNewRelicInsightsEvent({
            eventType: AssetComputeMetrics.CLIENT_ERROR_EVENT_TYPE,
            message: "message",
            reason: Reason.SourceFormatUnsupported,
            test: "value"
        });

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);
        metrics.start();
        const httpError = new SourceFormatUnsupportedError("message");
        httpError.statusCode = 400;
        await metrics.handleError(httpError, {
            metrics: {
                test: "value"
            }
        });
        assert.ok(nockSendEvent.isDone(), "metrics not properly sent");
        metrics.close();
    });

    it("handleError - new GenericError", async function() {
        const nockSendEvent = expectNewRelicInsightsEvent({
            eventType: AssetComputeMetrics.ERROR_EVENT_TYPE,
            message: "message",
            location: "location",
            test: "value"
        });

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);
        metrics.start();
        await metrics.handleError(new GenericError("message", "location"), {
            metrics: {
                test: "value"
            }
        });
        assert.ok(nockSendEvent.isDone(), "metrics not properly sent");
        metrics.close();
    });

    it("handleError - default location", async function() {
        const nockSendEvent = expectNewRelicInsightsEvent({
            eventType: AssetComputeMetrics.ERROR_EVENT_TYPE,
            message: "message",
            location: "action" // taken from action name
        });

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);
        await metrics.handleError(new GenericError("message"));
        assert.ok(nockSendEvent.isDone(), "metrics not properly sent");
        metrics.close();
    });

    it("handleError - missing __OW_ACTION_NAME", async function() {
        delete process.env.__OW_ACTION_NAME;
        const nockSendEvent = expectNewRelicInsightsEvent({
            eventType: AssetComputeMetrics.ERROR_EVENT_TYPE,
            message: "message",
            location: "",
            namespace: "namespace",
            activationId: "activationId",
            ingestionId: "ingestionId",
            orgId: "orgId",
            clientId: "clientId",
            sourceName: "AssetName.txt",
            sourceMimetype: "mimetype",
            sourceSize: "size",
            timestamp: /\d+/
        }, 200, false);

        const metrics = new AssetComputeMetrics(FAKE_PARAMS);
        metrics.start();
        await metrics.handleError(new GenericError("message"));
        assert.ok(nockSendEvent.isDone(), "metrics not properly sent");
        metrics.close();
    });

    it("send timeout metrics", async function() {
        let metrics;
        try {
            const nockSendEvent = expectNewRelicInsightsEvent({
                eventType: "timeout"
            }, 200, true);
            process.env.__OW_DEADLINE = Date.now() + 5;
            metrics = new AssetComputeMetrics(FAKE_PARAMS);
            metrics.start();
            const { promisify } = require('util');
            const sleep = promisify(setTimeout);
            await sleep(1000);
            assert.ok(nockSendEvent.isDone(), "metrics not properly sent");
        }
        finally {
            metrics.close();
        }
	});

    describe("negative error cases", function() {
        it("sendMetrics fails", async function() {
            const nockSendEvent = expectNewRelicInsightsEvent({
                eventType: EVENT_TYPE,
                test: "value"
            }, 500);

            const metrics = new AssetComputeMetrics(FAKE_PARAMS);
            metrics.start();
            await metrics.sendMetrics(EVENT_TYPE, { test: "value" });
            assert.ok(nockSendEvent.isDone(), "metrics not properly sent");
            metrics.close();
        });

        it("auth is missing", async function() {
            const nockSendEvent = expectNewRelicInsightsEvent({
                eventType: EVENT_TYPE,
                test: "value",
                actionName: "action",
                namespace: "namespace",
                activationId: "activationId",
                ingestionId: "ingestionId",
                package: "package",
                timestamp: /\d+/
                // no orgId or clientId
            }, 200, false);

            const metrics = new AssetComputeMetrics({
                newRelicEventsURL: `${NR_FAKE_BASE_URL}${NR_FAKE_EVENTS_PATH}`,
                newRelicApiKey: NR_FAKE_API_KEY,
                ingestionId: "ingestionId"
            });
            metrics.start();
            await metrics.sendMetrics(EVENT_TYPE, { test: "value" });
            assert.ok(nockSendEvent.isDone(), "metrics not properly sent");
            metrics.close();
        });

        it("auth.accessToken is invalid", async function() {
            const nockSendEvent = expectNewRelicInsightsEvent({
                eventType: EVENT_TYPE,
                test: "value",
                actionName: "action",
                namespace: "namespace",
                activationId: "activationId",
                ingestionId: "ingestionId",
                orgId: "orgId",
                package: "package",
                timestamp: /\d+/
                // no clientId because of invalid token
            }, 200, false);

            const metrics = new AssetComputeMetrics({
                newRelicEventsURL: `${NR_FAKE_BASE_URL}${NR_FAKE_EVENTS_PATH}`,
                newRelicApiKey: NR_FAKE_API_KEY,
                ingestionId: "ingestionId",
                auth: {
                    orgId: "orgId",
                    accessToken: "INVALID-TOKEN"
                }
            });
            metrics.start();
            await metrics.sendMetrics(EVENT_TYPE, { test: "value" });
            assert.ok(nockSendEvent.isDone(), "metrics not properly sent");
            metrics.close();
        });

        it("auth.accessToken parsing throws", async function() {
            const originalDecode = jsonwebtoken.decode;
            jsonwebtoken.decode = function() {
                throw new Error("Parsing error");
            };

            try {
                const nockSendEvent = expectNewRelicInsightsEvent({
                    eventType: EVENT_TYPE,
                    test: "value",
                    actionName: "action",
                    namespace: "namespace",
                    activationId: "activationId",
                    ingestionId: "ingestionId",
                    orgId: "orgId",
                    package: "package",
                    sourceName: "AssetName.txt",
                    sourceMimetype: "mimetype",
                    sourceSize: "size",
                    timestamp: /\d+/
                    // no clientId because of parsing error token
                }, 200, false);

                const metrics = new AssetComputeMetrics(FAKE_PARAMS);
                metrics.start();
                await metrics.sendMetrics(EVENT_TYPE, { test: "value" });
                assert.ok(nockSendEvent.isDone(), "metrics not properly sent");
                metrics.close();

            } finally {
                jsonwebtoken.decode = originalDecode;
            }
        });

        it("new relic request fails", async function() {
            const nockSendEvent = nock(NR_FAKE_BASE_URL)
                .filteringRequestBody(gunzip)
                .matchHeader("x-insert-key", NR_FAKE_API_KEY)
                .post(NR_FAKE_EVENTS_PATH, {
                    ...EXPECTED_METRICS,
                    eventType: EVENT_TYPE
                })
                .replyWithError({
                    message: 'something awful happened',
                    code: 'AWFUL_ERROR',
                });

            const metrics = new AssetComputeMetrics(FAKE_PARAMS);
            metrics.start();
            await metrics.sendMetrics(EVENT_TYPE);
            assert.ok(nockSendEvent.isDone(), "metrics not properly sent");
            metrics.close();
        });
    });
});