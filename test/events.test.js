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

const AssetComputeEvents = require('../lib/events');
const AssetComputeMetrics = require('../lib/metrics');
const jsonwebtoken = require('jsonwebtoken');
const tmp = require('tmp');
const fs = require('fs');
const path = require('path');
const nock = require('nock');
const assert = require('assert');
const MetricsTestHelper = require("@adobe/openwhisk-newrelic/lib/testhelper");
const { verifyHMACSign } = require('../lib/hmac-signature');


const FAKE_PARAMS = {
    newRelicEventsURL: MetricsTestHelper.MOCK_URL,
    newRelicApiKey: MetricsTestHelper.MOCK_API_KEY,
    requestId:"requestId",
    auth: {
        orgId: "orgId",
        clientId: "clientId",
        accessToken: jsonwebtoken.sign({client_id: "clientId"}, "key"),
        appName:"appName"
    }
};

const FAKE_PARAMS_NO_AUTH = {
    newRelicEventsURL: MetricsTestHelper.MOCK_URL,
    newRelicApiKey: MetricsTestHelper.MOCK_API_KEY,
    requestId:"requestId",
};

const FAKE_WEBHOOK_URL = "https://some-webhook-url.com";
const FAKE_WEBHOOK_PARAMS = {
    newRelicEventsURL: MetricsTestHelper.MOCK_URL,
    newRelicApiKey: MetricsTestHelper.MOCK_API_KEY,
    requestId:"requestId",
    auth: {
        orgId: "orgId",
        clientId: "clientId",
        accessToken: jsonwebtoken.sign({client_id: "clientId"}, "key"),
        appName:"appName",
        isServiceAccount: true,
        webhookUrl: FAKE_WEBHOOK_URL
    }
};
const FAKE_WEBHOOK_PARAMS_NO_WEBHOOK = {
    newRelicEventsURL: MetricsTestHelper.MOCK_URL,
    newRelicApiKey: MetricsTestHelper.MOCK_API_KEY,
    requestId:"requestId",
    auth: {
        orgId: "orgId",
        clientId: "clientId",
        accessToken: jsonwebtoken.sign({client_id: "clientId"}, "key"),
        appName:"appName"
    }
};

let base64privateKey;
let publicKey;

describe("AssetComputeEvents", function() {
    beforeEach(function() {
        delete process.env.ASSET_COMPUTE_UNIT_TEST_OUT;
        MetricsTestHelper.beforeEachTest();
    });

    afterEach(function() {
        MetricsTestHelper.afterEachTest();
    });

    it("constructor should accept empty params", function() {
        assert.ok(new AssetComputeEvents());

        assert.ok(new AssetComputeEvents({}));
    });

    it("getProviderId", function() {
        const events = new AssetComputeEvents(FAKE_PARAMS);
        assert.equal(events.getProviderId(), "asset_compute_orgId_clientId");
    });

    it("getProviderId - clientId in auth", function() {
        const events = new AssetComputeEvents(FAKE_PARAMS);
        assert.equal(events.getProviderId(), "asset_compute_orgId_clientId");
    });


    it("sendEvent - file system", async function() {
        const fsEventDir = tmp.dirSync().name;
        process.env.ASSET_COMPUTE_UNIT_TEST_OUT = fsEventDir;

        // make sure to not include params.auth since that is missing for unit tests
        const events = new AssetComputeEvents(FAKE_PARAMS_NO_AUTH);
        await events.sendEvent("my_event", {test: "value"});

        const writtenEvent = JSON.parse(fs.readFileSync(`${fsEventDir}/events/event0.json`).toString());
        delete writtenEvent.date; // ignore
        assert.deepStrictEqual(writtenEvent, {
            type: "my_event",
            test: "value",
            requestId: "requestId"
        });

        await events.sendEvent("my_event", {test: "value2"});
        const writtenEvent2 = JSON.parse(fs.readFileSync(`${fsEventDir}/events/event1.json`).toString());
        delete writtenEvent2.date; // ignore
        assert.deepStrictEqual(writtenEvent2, {
            type: "my_event",
            test: "value2",
            requestId: "requestId"
        });
    });

    it("sendEvent - handled error if no auth", async function() {
        // not setting this
        delete process.env.ASSET_COMPUTE_UNIT_TEST_OUT;

        // ...and not setting params.auth
        const events = new AssetComputeEvents(FAKE_PARAMS_NO_AUTH);
        await events.sendEvent("my_event", {test: "value"});
        // should not throw an error
    });

    it("sendEvent - IO events", async function() {
        const nockSendEvent = nock("https://eg-ingress.adobe.io")
            .filteringRequestBody(body => {
                body = JSON.parse(body);
                body.event = JSON.parse(Buffer.from(body.event, 'base64').toString());
                delete body.event.date;
                // console.log("IO Events mock received:", body);
                return body;
            })
            .post("/api/events", {
                user_guid: "orgId",
                provider_id: "asset_compute_orgId_clientId",
                event_code: AssetComputeEvents.EVENT_CODE,
                event: {
                    type: "my_event",
                    test: "value",
                    requestId: "requestId"
                }
            })
            .reply(200, {});

        const events = new AssetComputeEvents(FAKE_PARAMS);
        await events.sendEvent("my_event", {test: "value"});

        assert.ok(nockSendEvent.isDone(), "io event not properly sent");
    });

    it("sendEvent - IO events failure, triggering error metric", async function() {
        const nockSendEvent = nock("https://eg-ingress.adobe.io")
            .post("/api/events")
            .reply(500, {});
        const receivedMetrics = MetricsTestHelper.mockNewRelic();

        process.env.__OW_DEADLINE = Date.now() + 2000;

        const events = new AssetComputeEvents({
            ...FAKE_PARAMS,
            metrics: new AssetComputeMetrics(FAKE_PARAMS, { sendImmediately: true })
        },
        false
        );
        await events.sendEvent("my_event", {test: "value"});

        assert.ok(nockSendEvent.isDone(), "io event not tried");

        await MetricsTestHelper.metricsDone();
        MetricsTestHelper.assertArrayContains(receivedMetrics, [{
            eventType: "error",
            location: "IOEvents"
        }]);
    });
});

describe("HMACSignature sendEvent - Webhook events with hmac signature", function() {
    before(() => {
        const base64pvtkeyFilePath = path.join(__dirname, 'resources/test-private-base64.txt');
        const pubkeyFilePath = path.join(__dirname, 'resources/test-public.pem');
        base64privateKey = fs.readFileSync(base64pvtkeyFilePath, 'utf8');
        publicKey = fs.readFileSync(pubkeyFilePath, 'utf8');
    });
    beforeEach(function() {
        delete process.env.ASSET_COMPUTE_UNIT_TEST_OUT;
        MetricsTestHelper.beforeEachTest();
    });

    afterEach(function() {
        MetricsTestHelper.afterEachTest();
    });

    it("sendEvent - Webhook events", async function() {
        // not setting this
        delete process.env.ASSET_COMPUTE_UNIT_TEST_OUT;
        const nockSendEventWebHook = nock(FAKE_WEBHOOK_URL)
            .filteringRequestBody(body => {
                body = JSON.parse(body);
                delete body.event.date;
                console.log("Webhook mock received:", body);
                return body;
            })
            .post("/", {
                user_guid: "orgId",
                event_code: AssetComputeEvents.EVENT_CODE,
                event: {
                    test: "value",
                    type: "my_event",
                    requestId: "requestId"
                }
            })
            .reply(200, {});
        FAKE_WEBHOOK_PARAMS.hmacPrivateKey = base64privateKey;
        const events = new AssetComputeEvents(FAKE_WEBHOOK_PARAMS);
        await events.sendEvent("my_event", {test: "value"});
        assert.ok(nockSendEventWebHook.isDone(), "webhook event not properly sent");
    });

    it("sendEvent - webhook handled error if no webhook", async function() {
        // not setting this
        delete process.env.ASSET_COMPUTE_UNIT_TEST_OUT;

        // ...and not setting params.auth.webhookurl
        // fallbacks to send events to IO and should fail
        const events = new AssetComputeEvents(FAKE_WEBHOOK_PARAMS_NO_WEBHOOK);
        await events.sendEvent("my_event", {test: "value"});
        // should not throw an error
    });

    it("sendEvent - Webhook events failure, triggering error metric", async function() {
        const nockSendEventWebHook = nock(FAKE_WEBHOOK_URL)
            .post("/")
            .reply(500, {});
        const receivedMetrics = MetricsTestHelper.mockNewRelic();

        process.env.__OW_DEADLINE = Date.now() + 2000;
        FAKE_WEBHOOK_PARAMS.hmacPrivateKey = base64privateKey;
        const events = new AssetComputeEvents({
            ...FAKE_WEBHOOK_PARAMS,
            metrics: new AssetComputeMetrics(FAKE_WEBHOOK_PARAMS, { sendImmediately: true })
        },
        false
        );
        await events.sendEvent("my_event", {test: "value"});

        assert.ok(nockSendEventWebHook.isDone(), "webhook event not tried");

        await MetricsTestHelper.metricsDone();
        MetricsTestHelper.assertArrayContains(receivedMetrics, [{
            eventType: "error",
            location: "WebhookEvents"
        }]);
    });
});

describe("HMACSignature sendEvent - Webhook events with hmac signature", function() {
    before(() => {
        const pvtkeyFilePath = path.join(__dirname, 'resources/test-private.pem');
        const pubkeyFilePath = path.join(__dirname, 'resources/test-public.pem');
        privateKey = fs.readFileSync(pvtkeyFilePath, 'utf8');
        publicKey = fs.readFileSync(pubkeyFilePath, 'utf8');
    });
    beforeEach(function() {
        delete process.env.ASSET_COMPUTE_UNIT_TEST_OUT;
        MetricsTestHelper.beforeEachTest();
    });

    afterEach(function() {
        MetricsTestHelper.afterEachTest();
    });

    it("sendEvent - Webhook events with hmac signature exists", async function() {
        const nockSendEventWebHook = nock(FAKE_WEBHOOK_URL,{
            reqheaders: {
                'x-ims-org-id': () => true,
                'x-ac-hmac-signature': (val) => val && val.length > 0
            }
        })
            .filteringRequestBody(body => {
                body = JSON.parse(body);
                delete body.event.date;
                console.log("Webhook mock received:", body);
                return body;
            })
            .post("/", {
                user_guid: "orgId",
                event_code: AssetComputeEvents.EVENT_CODE,
                event: {
                    test: "value",
                    type: "my_event",
                    requestId: "requestId"
                }
            })
            .reply(200, {});
        FAKE_WEBHOOK_PARAMS.hmacPrivateKey = base64privateKey;
        const events = new AssetComputeEvents(FAKE_WEBHOOK_PARAMS);
        await events.sendEvent("my_event", {test: "value"});
        assert.ok(nockSendEventWebHook.isDone(), "webhook event not properly sent");
    });
  
    it("sendEvent - Webhook events with hmac signature using pvt-pub keypair", async function() {
        let webhookPayload;        
        let signatureHeader;
        const nockSendEventWebHook = nock(FAKE_WEBHOOK_URL,{
            reqheaders: {
                'x-ims-org-id': () => true,
                'x-ac-hmac-signature': (val) => {
                    signatureHeader = val;
                    return val && val.length > 0;
                }
            }
        })
            .filteringRequestBody(body => {
                webhookPayload = body;
                body = JSON.parse(body);
                delete body.event.date;
                console.log("Webhook mock received:", body);
                return body;
            })
            .post("/", {
                user_guid: "orgId",
                event_code: AssetComputeEvents.EVENT_CODE,
                event: {
                    test: "value",
                    type: "my_event",
                    requestId: "requestId"
                }
            })
            .reply(200, {});
        FAKE_WEBHOOK_PARAMS.hmacPrivateKey = base64privateKey;
        const events = new AssetComputeEvents(FAKE_WEBHOOK_PARAMS);
        await events.sendEvent("my_event", {test: "value"});
        assert.ok(nockSendEventWebHook.isDone(), "webhook event not properly sent");
        assert.ok(verifyHMACSign(webhookPayload, signatureHeader, publicKey));
    });
  
    it("sendEvent - Webhook events with hmac signature errors for invalid pvt key, sends metrics", async function() {
        const nockSendEventWebHook = nock(FAKE_WEBHOOK_URL)
            .filteringRequestBody(body => {
                body = JSON.parse(body);
                delete body.event.date;
                console.log("Webhook mock received:", body);
                return body;
            })
            .post("/", {
                user_guid: "orgId",
                event_code: AssetComputeEvents.EVENT_CODE,
                event: {
                    test: "value",
                    type: "my_event",
                    requestId: "requestId"
                }
            })
            .reply(200, {});
        
        const receivedMetrics = MetricsTestHelper.mockNewRelic();
        process.env.__OW_DEADLINE = Date.now() + 2000;
        FAKE_WEBHOOK_PARAMS.hmacPrivateKey = "invalid-privateKey";
        const events = new AssetComputeEvents({...FAKE_WEBHOOK_PARAMS,
            metrics: new AssetComputeMetrics(FAKE_WEBHOOK_PARAMS, { sendImmediately: true })});
        await events.sendEvent("my_event", {test: "value"});

        assert.ok(!nockSendEventWebHook.isDone(), "webhook event should not be tried");

        await MetricsTestHelper.metricsDone();
        MetricsTestHelper.assertArrayContains(receivedMetrics, [{
            eventType: "error",
            location: "WebhookEvents"
        }]);
    });

    it("sendEvent - Webhook events when pvt key is not available", async function() {
        const nockSendEventWebHook = nock(FAKE_WEBHOOK_URL,{
            reqheaders: {
                'x-ims-org-id': () => true,
                'x-ac-hmac-signature': (val) => {
                    console.log('val: ',val);
                    return val === "undefined";
                }
            }
        })
            .filteringRequestBody(body => {
                body = JSON.parse(body);
                delete body.event.date;
                console.log("Webhook mock received:", body);
                return body;
            })
            .post("/", {
                user_guid: "orgId",
                event_code: AssetComputeEvents.EVENT_CODE,
                event: {
                    test: "value",
                    type: "my_event",
                    requestId: "requestId"
                }
            })
            .reply(200, {});

        const receivedMetrics = MetricsTestHelper.mockNewRelic();
        process.env.__OW_DEADLINE = Date.now() + 2000;
        const events = new AssetComputeEvents({...FAKE_WEBHOOK_PARAMS,
            metrics: new AssetComputeMetrics(FAKE_WEBHOOK_PARAMS, { sendImmediately: true })});
        await events.sendEvent("my_event", {test: "value"});
        assert.ok(!nockSendEventWebHook.isDone(), "webhook event not properly sent");
        await MetricsTestHelper.metricsDone();
        MetricsTestHelper.assertArrayContains(receivedMetrics, [{
            eventType: "error",
            location: "WebhookEvents"
        }]);
    });

});
