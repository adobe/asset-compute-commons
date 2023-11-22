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

let privateKey;
let publicKey;
// const  = fs.readFileSync('./test-public.pem');

describe("HMACSignature", function() {
    before(() => {
        const pvtkeyFilePath = path.join(__dirname, 'test-private.pem');
        const pubkeyFilePath = path.join(__dirname, 'test-public.pem');
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

    it("should generate HMACSignature", function() {
        const data = 'Some data to sign';
        const signature = generateHMACSignature(data, privateKey);
        assert.ok(signature);    
    });
    it("should verify HMAC signature", function() {
        const data = 'Some data to sign';
        const signature = generateHMACSignature(data, privateKey);
        assert.ok(verifyHMACSign(data, signature, publicKey));
    });

    it("should fail HMAC signature verification if data changes", function() {
        let data = 'Some data to sign';
        const signature = generateHMACSignature(data, privateKey);
        data = 'data changes';
        assert.ok(!verifyHMACSign(data, signature, publicKey));
    });
});
