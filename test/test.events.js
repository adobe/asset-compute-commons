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

const jsonwebtoken = require('jsonwebtoken');
const tmp = require('tmp');
const fs = require('fs');
const nock = require('nock');
const assert = require('assert');
const AssetComputeEvents = require('../lib/events');

const NR_FAKE_BASE_URL = "http://newrelic.com";
const NR_FAKE_EVENTS_PATH = "/events";
const NR_FAKE_API_KEY = "new-relic-api-key";

const FAKE_PARAMS = {
    newRelicEventsURL: `${NR_FAKE_BASE_URL}${NR_FAKE_EVENTS_PATH}`,
    newRelicApiKey: NR_FAKE_API_KEY,
    ingestionId: "ingestionId",
    auth: {
        orgId: "orgId",
        accessToken: jsonwebtoken.sign({client_id: "clientId"}, "key")
    }
};

describe("AssetComputeEvents", function() {
    beforeEach(function() {
        delete process.env.NUI_UNIT_TEST_OUT;
    })

    it("constructor should accept empty params", function() {
        assert.ok(new AssetComputeEvents());

        assert.ok(new AssetComputeEvents({}));
    });

    it("getProviderId", function() {
        const events = new AssetComputeEvents(FAKE_PARAMS);
        assert.equal(events.getProviderId(), "asset_compute_orgId_clientId");
    });

    it("sendEvent - file system", async function() {
        const fsEventDir = tmp.dirSync().name;
        process.env.NUI_UNIT_TEST_OUT = fsEventDir;

        const events = new AssetComputeEvents(FAKE_PARAMS);
        await events.sendEvent("my_event", {test: "value"});

        const writtenEvent = JSON.parse(fs.readFileSync(`${fsEventDir}/events/event0.json`).toString());
        delete writtenEvent.date; // ignore
        assert.deepStrictEqual(writtenEvent, {
            type: "my_event",
            test: "value",
            requestId: "ingestionId"
        });

        await events.sendEvent("my_event", {test: "value2"});
        const writtenEvent2 = JSON.parse(fs.readFileSync(`${fsEventDir}/events/event1.json`).toString());
        delete writtenEvent2.date; // ignore
        assert.deepStrictEqual(writtenEvent2, {
            type: "my_event",
            test: "value2",
            requestId: "ingestionId"
        });
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
                    requestId: "ingestionId"
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
        const nockSendMetrics = nock(NR_FAKE_BASE_URL)
            .matchHeader("x-insert-key", NR_FAKE_API_KEY)
            .post(NR_FAKE_EVENTS_PATH)
            .reply(200, {});

        process.env.__OW_DEADLINE = Date.now() + 2000;

        const events = new AssetComputeEvents(FAKE_PARAMS, {
            // hack to make adobe-io-events-client not retry
            maxSeconds: -1
        });
        await events.sendEvent("my_event", {test: "value"});

        assert.ok(nockSendEvent.isDone(), "io event not tried");
        assert.ok(nockSendMetrics.isDone(), "error metrics not sent");
    });
});