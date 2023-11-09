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

const AssetComputeWebhookEvents = require('../lib/webhook');
const AssetComputeMetrics = require('../lib/metrics');
const jsonwebtoken = require('jsonwebtoken');
const tmp = require('tmp');
const fs = require('fs');
const nock = require('nock');
const assert = require('assert');
const MetricsTestHelper = require("@adobe/openwhisk-newrelic/lib/testhelper");

const FAKE_WEBHOOK_URL = "https://some-webhook-url.com";
const FAKE_WEBHOOK_OPTIONS = {
    webhookUrl: FAKE_WEBHOOK_URL,
    orgId: "orgId",
    clientId: "clientId"
};
const FAKE_PARAMS = {
    newRelicEventsURL: MetricsTestHelper.MOCK_URL,
    newRelicApiKey: MetricsTestHelper.MOCK_API_KEY,
    requestId:"requestId",
    auth: {
        orgId: "orgId",
        clientId: "clientId",
        accessToken: jsonwebtoken.sign({client_id: "clientId"}, "key"),
        appName:"appName",
        webhookUrl: FAKE_WEBHOOK_URL
    }
};

const FAKE_PARAMS_NO_AUTH = {
    newRelicEventsURL: MetricsTestHelper.MOCK_URL,
    newRelicApiKey: MetricsTestHelper.MOCK_API_KEY,
    requestId:"requestId",
};

describe("AssetComputeWebhookEvents", function() {
    beforeEach(function() {
        delete process.env.ASSET_COMPUTE_UNIT_TEST_OUT;
        MetricsTestHelper.beforeEachTest();
    });

    afterEach(function() {
        MetricsTestHelper.afterEachTest();
    });

    it("constructor should accept empty params", function() {
        assert.ok(new AssetComputeWebhookEvents());

        assert.ok(new AssetComputeWebhookEvents({}));
    });

    it("constructor should accept options", function() {
        assert.ok(new AssetComputeWebhookEvents(FAKE_WEBHOOK_OPTIONS));
    });
    it("getWebhookUrl", function() {
        const events = new AssetComputeWebhookEvents(FAKE_WEBHOOK_OPTIONS);
        assert.equal(events.getWebhookUrl(), FAKE_WEBHOOK_URL);
    });
    
    

});
