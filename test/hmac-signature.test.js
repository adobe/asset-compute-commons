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

const { generateHMACSignature, verifyHMACSign } = require('../lib/hmac-signature');
const assert = require('assert');
const MetricsTestHelper = require("@adobe/openwhisk-newrelic/lib/testhelper");
const fs = require('fs');
const path = require('path');

let base64privateKey;
let publicKey;

describe("HMACSignature", function() {
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

    it("should generate HMACSignature using base64 pvtkey", function() {
        const data = 'Some data to sign';
        const base64DecodeprivateKey = Buffer.from(base64privateKey, 'base64');
        const signature = generateHMACSignature(data, base64DecodeprivateKey);
        assert.ok(signature);    
    });
    
    it("should verify HMAC signature using base64 pvtkey", function() {
        const data = 'Some data to sign';
        const base64DecodeprivateKey = Buffer.from(base64privateKey, 'base64');
        const signature = generateHMACSignature(data, base64DecodeprivateKey);
        assert.ok(verifyHMACSign(data, signature, publicKey));
    });

    it("should verify HMAC signature payload using base64 pvtkey", function() {
        const jsonData = {
            "user_guid": "test@AdobeOrg",
            "event_code": "asset_compute",
            "event": {
                "rendition": {
                    "fmt": "png",
                    "hei": 200,
                    "height": 200,
                    "name": "rendition.png",
                    "pipeline": false,
                    "url": "bloblstore?sp=racw&st=2023-11-13T23:04:46Z&se=2023-11-14T07:04:46Z&spr=https&sv=2022-11-02&sr=c&sig=CP4qQY1XHOnIOnvdccGcnK%2BuBtNBcdf0MDZ2R0%2Bqi10%3D",
                    "wid": 200,
                    "width": 200
                },
                "errorReason": "GenericError",
                "errorMessage": "PUT 'bloblstore?sp=racw&st=2023-11-13T23:04:46Z&se=2023-11-14T07:04:46Z&spr=https&sv=2022-11-02&sr=c&sig=CP4qQY1XHOnIOnvdccGcnK%2BuBtNBcdf0MDZ2R0%2Bqi10%3D' failed with status 400: ﻿<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<Error><Code>MissingRequiredHeader</Code><Message>An HTTP header that&apos;s mandatory for this request is not specified.\nRequestId:dc15d691-f01e-00b6-57ea-1c678c000000\nTime:2023-11-22T02:17:51.9326608Z</Message><HeaderName>x-ms-blob-type</HeaderName></Error>",
                "type": "rendition_failed",
                "date": "2023-11-22T02:17:51.942Z",
                "requestId": "i0JHLeCEFiknQHhjticS7xJcQhubGRbQ",
                "source": "bloblstore.jpeg?sp=r&st=2023-11-22T00:38:11Z&se=2023-11-22T08:38:11Z&spr=https&sv=2022-11-02&sr=b&sig=cagz7x3kKi2zdIn1SAWohm6MUUSHSRZXuX%2FvvepJFH4%3D",
                "userData": {
                    "assetClass": "file",
                    "companyId": "test",
                    "contentHash": "d5a78270b79dc1242df6d12b70969b660503fc62a81a18c55cd4d6b792fc9716",
                    "imsOrgId": "test@AdobeOrg",
                    "ingestionId": "test-ingestion",
                    "itemId": "https://business.adobe.com/some-media.png",
                    "mimeType": "image/png",
                    "requestId": "test-request"
                }
            }
        };
        const data = JSON.stringify(jsonData);
        const base64DecodeprivateKey = Buffer.from(base64privateKey, 'base64');
        const signature = generateHMACSignature(data, base64DecodeprivateKey);
        assert.ok(verifyHMACSign(data, signature, publicKey));
    });

    it("should fail HMAC signature verification if data changes", function() {
        let data = 'Some data to sign';
        const base64DecodeprivateKey = Buffer.from(base64privateKey, 'base64');
        const signature = generateHMACSignature(data, base64DecodeprivateKey);
        data = 'data changes';
        assert.ok(!verifyHMACSign(data, signature, publicKey));
    });
});
