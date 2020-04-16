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

"use strict";

const assert = require('assert');
const sinon = require('sinon');
const rewire = require('rewire');

const AssetComputeLogUtils = require('../lib/log-utils');
const rewiredRedact = rewire('../lib/log-utils');
const AssetComputeMetrics = require('../lib/metrics');

describe("log-utils.js - Credentials redaction", function() {
    it("redacts fields does not throw when object is null", function() {
        const testObj = null;

        const fieldsToRedact = rewiredRedact.__get__("CREDENTIAL_FIELDS_TO_REDACT");
        const redactField = rewiredRedact.__get__("redactField");
        const options = [
            {redactionList: fieldsToRedact, redactionFn: redactField }
        ];

        const redact = rewiredRedact.__get__("redact");

        const redactedObject = redact(testObj, options, false);
        assert.equal(redactedObject, null);
    });

    it("redacts fields does not throw when object is undefined", function() {
        const testObj = undefined;

        const fieldsToRedact = rewiredRedact.__get__("CREDENTIAL_FIELDS_TO_REDACT");
        const redactField = rewiredRedact.__get__("redactField");
        const options = [
            {redactionList: fieldsToRedact, redactionFn: redactField }
        ];

        const redact = rewiredRedact.__get__("redact");

        const redactedObject = redact(testObj, options, false);
        assert.equal(redactedObject, undefined);
    });

    it("redacts fields", function() {
        const testObj = {};
        testObj.newRelicApiKey = "newRelicApiKey";
        testObj.accessToken = "accessToken";
        testObj.uploadToken = "uploadToken";
        testObj.noRedact = "no-redact";

        const fieldsToRedact = rewiredRedact.__get__("CREDENTIAL_FIELDS_TO_REDACT");
        const redactField = rewiredRedact.__get__("redactField");
        const options = [
            {redactionList: fieldsToRedact, redactionFn: redactField }
        ];

        const redact = rewiredRedact.__get__("redact");

        const redactedObject = redact(testObj, options, false);

        assert.equal(redactedObject.newRelicApiKey, "[...REDACTED...]");
        assert.equal(redactedObject.accessToken, "[...REDACTED...]");
        assert.equal(redactedObject.uploadToken, "[...REDACTED...]");
        assert.equal(redactedObject.noRedact, "no-redact");
    });

    it("redacts urls from header fields", function () {
        const testHeaders = {
            'content-length': [ '1290938' ],
            'content-type': [ 'image/jpeg' ],
            'last-modified': [ 'Thu, 05 Sep 2019 19:51:25 GMT' ],
            'accept-ranges': [ 'bytes' ],
            'etag': [ '"0x001234567"' ],
            'server': [ 'Windows-Azure-Blob/1.0 Microsoft-HTTPAPI/2.0' ],
            'x-ms-request-id': [ 'req-id' ],
            'x-ms-version': [ '2019-02-02' ],
            'x-ms-creation-time': [ 'Thu, 05 Sep 2019 19:51:25 GMT' ],
            'x-ms-lease-status': [ 'unlocked' ],
            'x-ms-lease-state': [ 'available' ],
            'x-ms-blob-type': [ 'BlockBlob' ],
            'x-ms-copy-id': [ 'copy-id' ],
            'x-ms-copy-source': [ 'https://this.test.me:8080/this-is-a-test/file.png' ],
            'x-ms-copy-status': [ 'success' ],
            'x-ms-copy-progress': [ '1290938/1290938' ],
            'x-ms-copy-completion-time': [ 'Thu, 05 Sep 2019 19:51:25 GMT' ],
            'x-ms-server-encrypted': [ 'true' ],
            'x-ms-access-tier': [ 'Hot' ],
            'x-ms-access-tier-inferred': [ 'true' ],
            'date': [ 'Mon, 09 Dec 2019 10:19:32 GMT' ],
            'connection': [ 'close' ]
        };

        const res = AssetComputeLogUtils.redactUrl(testHeaders);
        assert.equal(res["x-ms-copy-source"][0], "https://this.test.me:8080");
    });

    it("logs redacted urls only (whitebox)", function () {
        const testHeaders = {
            'content-length': [ '1290938' ],
            'content-type': [ 'image/jpeg' ],
            'last-modified': [ 'Thu, 05 Sep 2019 19:51:25 GMT' ],
            'accept-ranges': [ 'bytes' ],
            'etag': [ '"0x001234567"' ],
            'server': [ 'Windows-Azure-Blob/1.0 Microsoft-HTTPAPI/2.0' ],
            'x-ms-request-id': [ 'req-id' ],
            'x-ms-version': [ '2019-02-02' ],
            'x-ms-creation-time': [ 'Thu, 05 Sep 2019 19:51:25 GMT' ],
            'x-ms-lease-status': [ 'unlocked' ],
            'x-ms-lease-state': [ 'available' ],
            'x-ms-blob-type': [ 'BlockBlob' ],
            'x-ms-copy-id': [ 'copy-id' ],
            'x-ms-copy-source': [ 'https://this.test.me:8080/this-is-a-test/file.png' ],
            'x-ms-copy-status': [ 'success' ],
            'x-ms-copy-progress': [ '1290938/1290938' ],
            'x-ms-copy-completion-time': [ 'Thu, 05 Sep 2019 19:51:25 GMT' ],
            'x-ms-server-encrypted': [ 'true' ],
            'x-ms-access-tier': [ 'Hot' ],
            'x-ms-access-tier-inferred': [ 'true' ],
            'date': [ 'Mon, 09 Dec 2019 10:19:32 GMT' ],
            'connection': [ 'close' ]
        };

        const credsToRedact = rewiredRedact.__get__("CREDENTIAL_FIELDS_TO_REDACT");
        const credRedactFn = rewiredRedact.__get__("redactField");
        const urlFieldsToRedact = rewiredRedact.__get__("URL_FIELDS_TO_REDACT");
        const urlRedactFn = rewiredRedact.__get__("redactUrls");
        const redact = rewiredRedact.__get__("redact");

        const rules = [
            { redactionList: credsToRedact, redactionFn: credRedactFn },
            { redactionList: urlFieldsToRedact, redactionFn: urlRedactFn }
        ];

        const clonedObj = redact(testHeaders, rules, false);

        assert.equal(clonedObj["x-ms-copy-source"][0], "https://this.test.me:8080");
    });


    it("redacts nested fields (all fields in one level)", function() {
        const parentObj = {};
        parentObj.noRedact = "no-redact-parent";

        const testObj = {};
        testObj.newRelicApiKey = "newRelicApiKey";
        testObj.accessToken = "accessToken";
        testObj.uploadToken = "uploadToken";
        testObj.noRedact = "no-redact";

        parentObj.testObj = testObj;

        const fieldsToRedact = rewiredRedact.__get__("CREDENTIAL_FIELDS_TO_REDACT");
        const redactField = rewiredRedact.__get__("redactField");
        const options = [
            {redactionList: fieldsToRedact, redactionFn: redactField }
        ];

        const redact = rewiredRedact.__get__("redact");

        const redactedObject = redact(parentObj, options, false);

        assert.equal(redactedObject.testObj.newRelicApiKey, "[...REDACTED...]");
        assert.equal(redactedObject.testObj.accessToken, "[...REDACTED...]");
        assert.equal(redactedObject.testObj.uploadToken, "[...REDACTED...]");
        assert.equal(redactedObject.testObj.noRedact, "no-redact");
        assert.equal(redactedObject.noRedact, "no-redact-parent");
    });

    it("redacts nested fields (fields at different levels)", function() {
        const parentObj = {};
        parentObj.noRedact = "no-redact-parent";
        parentObj.newRelicApiKey = "newRelicApiKey";
        parentObj.accessToken = "accessToken";

        const testObj = {};
        testObj.uploadToken = "uploadToken";
        testObj.noRedact = "no-redact";

        parentObj.testObj = testObj;

        const fieldsToRedact = rewiredRedact.__get__("CREDENTIAL_FIELDS_TO_REDACT");
        const redactField = rewiredRedact.__get__("redactField");
        const options = [
            {redactionList: fieldsToRedact, redactionFn: redactField }
        ];

        const redact = rewiredRedact.__get__("redact");

        const redactedObject = redact(parentObj, options, false);

        assert.equal(redactedObject.newRelicApiKey, "[...REDACTED...]");
        assert.equal(redactedObject.accessToken, "[...REDACTED...]");
        assert.equal(redactedObject.testObj.uploadToken, "[...REDACTED...]");
        assert.equal(redactedObject.testObj.noRedact, "no-redact");
        assert.equal(redactedObject.noRedact, "no-redact-parent");
    });

    it("does nothing when not needed", function() {
        const testObj = {};
        testObj.noRedact = "no-redact";
        testObj.nestedNoRedact = { aField: "no-redact" };

        const fieldsToRedact = rewiredRedact.__get__("CREDENTIAL_FIELDS_TO_REDACT");
        const redactField = rewiredRedact.__get__("redactField");
        const options = [
            {redactionList: fieldsToRedact, redactionFn: redactField }
        ];

        const redact = rewiredRedact.__get__("redact");

        const redactedObject = redact(testObj, options, false);

        assert.equal(redactedObject.noRedact, "no-redact");
        assert.equal(redactedObject.nestedNoRedact.aField, "no-redact");
    });

    it("does nothing when no rule is entered", function() {
        const testObj = {};
        testObj.noRedact = "no-redact";
        testObj.newRelicApiKey = "newRelicApiKey";
        testObj.nestedNoRedact = { aField: "no-redact" };

        const options = [];
        const redact = rewiredRedact.__get__("redact");

        const redactedObject = redact(testObj, options, false);

        assert.equal(redactedObject.noRedact, "no-redact");
        assert.equal(redactedObject.newRelicApiKey, "newRelicApiKey");
        assert.equal(redactedObject.nestedNoRedact.aField, "no-redact");
    });

    it("does nothing when rules have wrong format", function() {
        const testObj = {};
        testObj.noRedact = "no-redact";
        testObj.newRelicApiKey = "newRelicApiKey";
        testObj.nestedNoRedact = { aField: "no-redact" };

        const fieldsToRedact = rewiredRedact.__get__("CREDENTIAL_FIELDS_TO_REDACT");
        const options = [
            {redactionList: fieldsToRedact, redactionFn: 42}
        ];

        const redact = rewiredRedact.__get__("redact");

        const redactedObject = redact(testObj, options, false);

        assert.equal(redactedObject.noRedact, "no-redact");
        assert.equal(redactedObject.newRelicApiKey, "newRelicApiKey");
        assert.equal(redactedObject.nestedNoRedact.aField, "no-redact");
    });

    it("does nothing when there is no field to handle", function() {
        const testObj = {};
        testObj.noRedact = "no-redact";
        testObj.newRelicApiKey = "newRelicApiKey";
        testObj.nestedNoRedact = { aField: "no-redact" };

        const redactField = rewiredRedact.__get__("redactField");
        const options = [
            {redactionList: [], redactionFn: redactField }
        ];

        const redact = rewiredRedact.__get__("redact");

        const redactedObject = redact(testObj, options, false);

        assert.equal(redactedObject.noRedact, "no-redact");
        assert.equal(redactedObject.newRelicApiKey, "newRelicApiKey");
        assert.equal(redactedObject.nestedNoRedact.aField, "no-redact");
    });
});

describe("log-utils.js - Credentials removal", function() {
    it("redacts fields", function() {
        const testObj = {};
        testObj.newRelicApiKey = "newRelicApiKey";
        testObj.accessToken = "accessToken";
        testObj.uploadToken = "uploadToken";
        testObj.noRedact = "no-redact";

        const fieldsToRedact = rewiredRedact.__get__("CREDENTIAL_FIELDS_TO_REDACT");
        const redactField = rewiredRedact.__get__("redactField");
        const options = [
            {redactionList: fieldsToRedact, redactionFn: redactField }
        ];

        const redact = rewiredRedact.__get__("redact");

        const redactedObject = redact(testObj, options, true);

        assert.equal(redactedObject.newRelicApiKey, undefined);
        assert.equal(redactedObject.accessToken, undefined);
        assert.equal(redactedObject.uploadToken, undefined);
        assert.equal(redactedObject.noRedact, "no-redact");
    });

    it("redacts nested fields (all fields in one level)", function() {
        const parentObj = {};
        parentObj.noRedact = "no-redact-parent";

        const testObj = {};
        testObj.newRelicApiKey = "newRelicApiKey";
        testObj.accessToken = "accessToken";
        testObj.uploadToken = "uploadToken";
        testObj.noRedact = "no-redact";

        parentObj.testObj = testObj;

        const fieldsToRedact = rewiredRedact.__get__("CREDENTIAL_FIELDS_TO_REDACT");
        const redactField = rewiredRedact.__get__("redactField");
        const options = [
            {redactionList: fieldsToRedact, redactionFn: redactField }
        ];

        const redact = rewiredRedact.__get__("redact");

        const redactedObject = redact(parentObj, options, true);

        assert.equal(redactedObject.testObj.newRelicApiKey, undefined);
        assert.equal(redactedObject.testObj.accessToken, undefined);
        assert.equal(redactedObject.testObj.uploadToken, undefined);
        assert.equal(redactedObject.testObj.noRedact, "no-redact");
        assert.equal(redactedObject.noRedact, "no-redact-parent");
    });

    it("redacts nested fields (fields at different levels)", function() {
        const parentObj = {};
        parentObj.noRedact = "no-redact-parent";
        parentObj.newRelicApiKey = "newRelicApiKey";
        parentObj.accessToken = "accessToken";

        const testObj = {};
        testObj.uploadToken = "uploadToken";
        testObj.noRedact = "no-redact";

        parentObj.testObj = testObj;

        const fieldsToRedact = rewiredRedact.__get__("CREDENTIAL_FIELDS_TO_REDACT");
        const redactField = rewiredRedact.__get__("redactField");
        const options = [
            {redactionList: fieldsToRedact, redactionFn: redactField }
        ];

        const redact = rewiredRedact.__get__("redact");

        const redactedObject = redact(parentObj, options, true);

        assert.equal(redactedObject.newRelicApiKey, undefined);
        assert.equal(redactedObject.accessToken, undefined);
        assert.equal(redactedObject.testObj.uploadToken, undefined);
        assert.equal(redactedObject.testObj.noRedact, "no-redact");
        assert.equal(redactedObject.noRedact, "no-redact-parent");
    });

    it("does nothing when not needed", function() {
        const testObj = {};
        testObj.noRedact = "no-redact";
        testObj.nestedNoRedact = { aField: "no-redact" };

        const fieldsToRedact = rewiredRedact.__get__("CREDENTIAL_FIELDS_TO_REDACT");
        const redactField = rewiredRedact.__get__("redactField");
        const options = [
            {redactionList: fieldsToRedact, redactionFn: redactField }
        ];

        const redact = rewiredRedact.__get__("redact");

        const redactedObject = redact(testObj, options, false);

        assert.equal(redactedObject.noRedact, "no-redact");
        assert.equal(redactedObject.nestedNoRedact.aField, "no-redact");
    });

    it("does nothing when no rule is entered and silent remove is true", function() {
        const testObj = {};
        testObj.noRedact = "no-redact";
        testObj.newRelicApiKey = "newRelicApiKey";
        testObj.nestedNoRedact = { aField: "no-redact" };

        const options = [];
        const redact = rewiredRedact.__get__("redact");

        const redactedObject = redact(testObj, options, true);

        assert.equal(redactedObject.noRedact, "no-redact");
        assert.equal(redactedObject.newRelicApiKey, "newRelicApiKey");
        assert.equal(redactedObject.nestedNoRedact.aField, "no-redact");
    });

    it("ignores functions when rules have wrong format and silent remove is true", function() {
        const testObj = {};
        testObj.noRedact = "no-redact";
        testObj.newRelicApiKey = "newRelicApiKey";
        testObj.nestedNoRedact = { aField: "no-redact" };

        const fieldsToRedact = rewiredRedact.__get__("CREDENTIAL_FIELDS_TO_REDACT");
        const options = [
            {redactionList: fieldsToRedact, redactionFn: 42}
        ];

        const redact = rewiredRedact.__get__("redact");

        const redactedObject = redact(testObj, options, true);

        assert.equal(redactedObject.noRedact, "no-redact");
        assert.equal(redactedObject.newRelicApiKey, undefined);
        assert.equal(redactedObject.nestedNoRedact.aField, "no-redact");
    });

    it("does nothing when there is no field to handle", function() {
        const testObj = {};
        testObj.noRedact = "no-redact";
        testObj.newRelicApiKey = "newRelicApiKey";
        testObj.nestedNoRedact = { aField: "no-redact" };

        const redactField = rewiredRedact.__get__("redactField");
        const options = [
            {redactionList: [], redactionFn: redactField }
        ];

        const redact = rewiredRedact.__get__("redact");

        const redactedObject = redact(testObj, options, true);

        assert.equal(redactedObject.noRedact, "no-redact");
        assert.equal(redactedObject.newRelicApiKey, "newRelicApiKey");
        assert.equal(redactedObject.nestedNoRedact.aField, "no-redact");
    });
});

describe("log-utils.js - Custom fields redaction", function() {
    it("redacts nested fields (fields at different levels)", function() {
        const parentObj = {};
        parentObj.noRedact = "no-redact-parent";
        parentObj.oneField = "newRelicApiKey";
        parentObj.twoField = "accessToken";

        const testObj = {};
        testObj.threeField = "uploadToken";
        testObj.noRedact = "no-redact";

        parentObj.testObj = testObj;

        const options = [
            {redactionList: ["oneField", "twoField", "threeField"], redactionFn: function (){ return "[...REDACTED...]"} }
        ];

        const redact = rewiredRedact.__get__("redact");
        const redactedObject = redact(parentObj, options, false);
        console.log(redactedObject);
        assert.equal(redactedObject.oneField, "[...REDACTED...]");
        assert.equal(redactedObject.twoField, "[...REDACTED...]");
        assert.equal(redactedObject.testObj.threeField, "[...REDACTED...]");
        assert.equal(redactedObject.testObj.noRedact, "no-redact");
        assert.equal(redactedObject.noRedact, "no-redact-parent");
    });

    it("redacts nested fields (fields at different levels) - can use custom rules", function() {
        const parentObj = {};
        parentObj.noRedact = "no-redact-parent";
        parentObj.oneField = "newRelicApiKey";
        parentObj.twoField = "accessToken";

        const testObj = {};
        testObj.threeField = "uploadToken";
        testObj.noRedact = "no-redact";

        parentObj.testObj = testObj;

        const options = [
                            {redactionList: ["oneField", "twoField"], redactionFn: function (){ return "[...REDACTED2...]"} },
                            {redactionList: ["threeField"], redactionFn: function (){ return "[...REDACTED3...]"} },
                        ];

        const redact = rewiredRedact.__get__("redact");
        const redactedObject = redact(parentObj, options);
        console.log(redactedObject);
        assert.equal(redactedObject.oneField, "[...REDACTED2...]");
        assert.equal(redactedObject.twoField, "[...REDACTED2...]");
        assert.equal(redactedObject.testObj.threeField, "[...REDACTED3...]");
        assert.equal(redactedObject.testObj.noRedact, "no-redact");
        assert.equal(redactedObject.noRedact, "no-redact-parent");
    });
});

describe("log-utils.js - Custom fields removal", function() {
    it("redacts nested fields (fields at different levels)", function() {
        const parentObj = {};
        parentObj.noRedact = "no-redact-parent";
        parentObj.oneField = "newRelicApiKey";
        parentObj.twoField = "accessToken";

        const testObj = {};
        testObj.threeField = "uploadToken";
        testObj.noRedact = "no-redact";

        parentObj.testObj = testObj;

        const options = [ {redactionList: ["threeField", "oneField", "twoField"], redactionFn: function (){ return "[...REDACTED...]"} } ];

        const redact = rewiredRedact.__get__("redact");
        const redactedObject = redact(parentObj, options, true);
        console.log(redactedObject);
        assert.equal(redactedObject.oneField, undefined);
        assert.equal(redactedObject.twoField, undefined);
        assert.equal(redactedObject.testObj.threeField, undefined);
        assert.equal(redactedObject.testObj.noRedact, "no-redact");
        assert.equal(redactedObject.noRedact, "no-redact-parent");
    });

    it("logs something", function(){
        const consoleSpy = sinon.spy(console, "log");

        AssetComputeLogUtils.log({test: "test"}, "my message");
        AssetComputeLogUtils.log({test: "test"});

        assert.ok(consoleSpy.calledTwice);
        let spyCallArgs = consoleSpy.getCall(0).args[0];
        assert.equal(spyCallArgs, "my message");

        spyCallArgs = consoleSpy.getCall(1).args[0];
        assert.equal(spyCallArgs.test, "test");

        console.log.restore();
    });
});

describe("log-utils.js - Url redaction", function(){
    it("redact an url", function (){
        const testObj = {};
        testObj.url = "https://adobe.com/something?query=stuff";
        testObj.source = "https://adobe.com:8888/something?query=stuff";
        testObj.target = "https://wwww.adobe.com";
        testObj.noRedact = "no-redact";

        const res = AssetComputeLogUtils.redactUrl(testObj);

        assert.equal(res.url, "https://adobe.com");
        assert.equal(res.source, "https://adobe.com:8888");
        assert.equal(res.target, "https://wwww.adobe.com");
        assert.equal(res.noRedact, "no-redact");
    });

    it("redact a single url string (non object)", function (){
        const testObj = "https://adobe.com/something?query=stuff";

        const res = AssetComputeLogUtils.redactUrl(testObj);

        assert.equal(res, "https://adobe.com");
    });

    it("redact a url array (non-object)", function (){
        const testObj = [
            "https://adobe.com/something?query=stuff",
            "https://adobe.com:1234/something?query=stuff",
            "https://very.long.host.name.adobe.com/something?query=stuff",
            "https://adobe.com:80/something?query=stuff&otherstuff=somethingelse",
            "https://adobe.com:8080/something?query=stuff",
            "https://adobe1.com:8181/file.jpg",
            "https://adobe80.com:8080/something?query=stuff",
            "https://adobe.80.com:8080/something?query=stuff"
        ];

        const res = AssetComputeLogUtils.redactUrl(testObj);

        assert.equal(res[0], "https://adobe.com");
        assert.equal(res[1], "https://adobe.com:1234");
        assert.equal(res[2], "https://very.long.host.name.adobe.com");
        assert.equal(res[3], "https://adobe.com:80");
        assert.equal(res[4], "https://adobe.com:8080");
        assert.equal(res[5], "https://adobe1.com:8181");
        assert.equal(res[6], "https://adobe80.com:8080");
        assert.equal(res[7], "https://adobe.80.com:8080");
    });

    it("redact an url array", function (){
        const testObj = {};
        testObj.url = "https://adobe.com/something?query=stuff";
        testObj.source = "https://adobe.com:8888/something?query=stuff";
        testObj.target = "https://wwww.adobe.com";
        testObj.noRedact = "no-redact";
        testObj.urls = [
            "https://adobe.com/something?query=stuff",
            "https://adobe.com:1234/something?query=stuff",
            "https://very.long.host.name.adobe.com/something?query=stuff",
            "https://adobe.com:80/something?query=stuff&otherstuff=somethingelse",
            "https://adobe.com:8080/something?query=stuff",
            "https://adobe1.com:8181/file.jpg",
            "https://adobe80.com:8080/something?query=stuff",
            "https://adobe.80.com:8080/something?query=stuff"
        ];

        const res = AssetComputeLogUtils.redactUrl(testObj);

        assert.equal(res.source, "https://adobe.com:8888");
        assert.equal(res.target, "https://wwww.adobe.com");
        assert.equal(res.noRedact, "no-redact");

        assert.equal(res.urls[0], "https://adobe.com");
        assert.equal(res.urls[1], "https://adobe.com:1234");
        assert.equal(res.urls[2], "https://very.long.host.name.adobe.com");
        assert.equal(res.urls[3], "https://adobe.com:80");
        assert.equal(res.urls[4], "https://adobe.com:8080");
        assert.equal(res.urls[5], "https://adobe1.com:8181");
        assert.equal(res.urls[6], "https://adobe80.com:8080");
        assert.equal(res.urls[7], "https://adobe.80.com:8080");
    });

    it("ignores non-urls", function (){
        const testObj = {};
        testObj.url = "ftp://adobe.com/something?query=stuff";
        testObj.noRedact = "no-redact";
        testObj.target = 42;

        const res = AssetComputeLogUtils.redactUrl(testObj);

        assert.equal(res.url, "ftp://adobe.com/something?query=stuff");
        assert.equal(res.noRedact, "no-redact");
        assert.equal(res.target, 42);
    });

    it("logs something", function(){
        const consoleSpy = sinon.spy(console, "log");

        const testObj = {};
        testObj.url = "https://adobe.com/something?query=stuff";
        testObj.source = "https://adobe.com:8888/something?query=stuff";
        testObj.target = "https://www.adobe.com";
        testObj.noRedact = "no-redact";
        testObj.urls = [
            "https://adobe.com/something?query=stuff",
            "https://adobe.com:1234/something?query=stuff",
            "https://very.long.host.name.adobe.com/something?query=stuff",
            "https://adobe.com:80/something?query=stuff&otherstuff=somethingelse",
            "https://adobe.com:8080/something?query=stuff",
            "https://adobe1.com:8181/file.jpg",
            "https://adobe80.com:8080/something?query=stuff",
            "https://adobe.80.com:8080/something?query=stuff"
        ];

        AssetComputeLogUtils.log(testObj, "my message");
        AssetComputeLogUtils.log(testObj);

        assert.ok(consoleSpy.calledTwice);
        let spyCallArgs = consoleSpy.getCall(0).args[0];
        assert.equal(spyCallArgs, "my message");

        spyCallArgs = consoleSpy.getCall(1).args[0];
        assert.equal(spyCallArgs.url, "https://adobe.com");
        assert.equal(spyCallArgs.source, "https://adobe.com:8888");
        assert.equal(spyCallArgs.target, "https://www.adobe.com");
        assert.equal(spyCallArgs.noRedact, "no-redact");
        assert.equal(spyCallArgs.urls[0], "https://adobe.com");
        assert.equal(spyCallArgs.urls[1], "https://adobe.com:1234");
        assert.equal(spyCallArgs.urls[2], "https://very.long.host.name.adobe.com");
        assert.equal(spyCallArgs.urls[3], "https://adobe.com:80");
        assert.equal(spyCallArgs.urls[4], "https://adobe.com:8080");
        assert.equal(spyCallArgs.urls[5], "https://adobe1.com:8181");
        assert.equal(spyCallArgs.urls[6], "https://adobe80.com:8080");
        assert.equal(spyCallArgs.urls[7], "https://adobe.80.com:8080");

        console.log.restore();
    });

    it("clones the original object", function() {
        const testObj = {};
        testObj.url = "https://adobe.com/something?query=stuff";
        testObj.source = "https://adobe.com:8888/something?query=stuff";
        testObj.target = "https://www.adobe.com";
        testObj.noRedact = "no-redact";
        testObj.urls = [
            "https://adobe.com/something?query=stuff",
            "https://adobe.com:1234/something?query=stuff",
            "https://very.long.host.name.adobe.com/something?query=stuff",
            "https://adobe.com:80/something?query=stuff&otherstuff=somethingelse",
            "https://adobe.com:8080/something?query=stuff",
            "https://adobe1.com:8181/file.jpg",
            "https://adobe80.com:8080/something?query=stuff",
            "https://adobe.80.com:8080/something?query=stuff"
        ];

        const fieldsToRedact = rewiredRedact.__get__("URL_FIELDS_TO_REDACT");
        const redactFn = rewiredRedact.__get__("redactUrls");
        const options = [
            {redactionList: fieldsToRedact, redactionFn: redactFn}
        ];

        const redact = rewiredRedact.__get__("redact");

        const redactedObject = redact(testObj, options, false);

        assert.ok(redactedObject.source !== testObj.source);
        assert.equal(redactedObject.target, testObj.target);
        assert.equal(redactedObject.noRedact, testObj.noRedact);

        assert.ok(redactedObject.urls[0] !== testObj.urls[0]);
        assert.ok(redactedObject.urls[1] !== testObj.urls[1]);
        assert.ok(redactedObject.urls[2] !== testObj.urls[2]);
        assert.ok(redactedObject.urls[3] !== testObj.urls[3]);
        assert.ok(redactedObject.urls[4] !== testObj.urls[4]);
        assert.ok(redactedObject.urls[5] !== testObj.urls[5]);
        assert.ok(redactedObject.urls[6] !== testObj.urls[6]);
        assert.ok(redactedObject.urls[7] !== testObj.urls[7]);
    });

    it("does nothing when no rule is entered", function() {
        const testObj = {};
        testObj.url = "https://adobe.com/something?query=stuff";
        testObj.source = "https://adobe.com:8888/something?query=stuff";
        testObj.target = "https://www.adobe.com";
        testObj.noRedact = "no-redact";
        testObj.urls = [
            "https://adobe.com/something?query=stuff",
            "https://adobe.com:1234/something?query=stuff",
            "https://very.long.host.name.adobe.com/something?query=stuff",
            "https://adobe.com:80/something?query=stuff&otherstuff=somethingelse",
            "https://adobe.com:8080/something?query=stuff",
            "https://adobe1.com:8181/file.jpg",
            "https://adobe80.com:8080/something?query=stuff",
            "https://adobe.80.com:8080/something?query=stuff"
        ];

        const options = [];
        const redact = rewiredRedact.__get__("redact");

        const redactedObject = redact(testObj, options, false);

        assert.equal(redactedObject.source, testObj.source);
        assert.equal(redactedObject.target, testObj.target);
        assert.equal(redactedObject.noRedact, testObj.noRedact);

        assert.equal(redactedObject.urls[0], testObj.urls[0]);
        assert.equal(redactedObject.urls[1], testObj.urls[1]);
        assert.equal(redactedObject.urls[2], testObj.urls[2]);
        assert.equal(redactedObject.urls[3], testObj.urls[3]);
        assert.equal(redactedObject.urls[4], testObj.urls[4]);
        assert.equal(redactedObject.urls[5], testObj.urls[5]);
        assert.equal(redactedObject.urls[6], testObj.urls[6]);
        assert.equal(redactedObject.urls[7], testObj.urls[7]);
    });

    it("does nothing when rules have wrong format", function() {
        const testObj = {};
        testObj.url = "https://adobe.com/something?query=stuff";
        testObj.source = "https://adobe.com:8888/something?query=stuff";
        testObj.target = "https://www.adobe.com";
        testObj.noRedact = "no-redact";
        testObj.urls = [
            "https://adobe.com/something?query=stuff",
            "https://adobe.com:1234/something?query=stuff",
            "https://very.long.host.name.adobe.com/something?query=stuff",
            "https://adobe.com:80/something?query=stuff&otherstuff=somethingelse",
            "https://adobe.com:8080/something?query=stuff",
            "https://adobe1.com:8181/file.jpg",
            "https://adobe80.com:8080/something?query=stuff",
            "https://adobe.80.com:8080/something?query=stuff"
        ];

        const fieldsToRedact = rewiredRedact.__get__("URL_FIELDS_TO_REDACT");
        const options = [
            {redactionList: fieldsToRedact, redactionFn: 42}
        ];

        const redact = rewiredRedact.__get__("redact");

        const redactedObject = redact(testObj, options, false);

        assert.equal(redactedObject.source, testObj.source);
        assert.equal(redactedObject.target, testObj.target);
        assert.equal(redactedObject.noRedact, testObj.noRedact);

        assert.equal(redactedObject.urls[0], testObj.urls[0]);
        assert.equal(redactedObject.urls[1], testObj.urls[1]);
        assert.equal(redactedObject.urls[2], testObj.urls[2]);
        assert.equal(redactedObject.urls[3], testObj.urls[3]);
        assert.equal(redactedObject.urls[4], testObj.urls[4]);
        assert.equal(redactedObject.urls[5], testObj.urls[5]);
        assert.equal(redactedObject.urls[6], testObj.urls[6]);
        assert.equal(redactedObject.urls[7], testObj.urls[7]);
    });

    it("does nothing when rules are not an array", function() {
        const testObj = {};
        testObj.url = "https://adobe.com/something?query=stuff";
        testObj.source = "https://adobe.com:8888/something?query=stuff";
        testObj.target = "https://www.adobe.com";
        testObj.noRedact = "no-redact";
        testObj.urls = [
            "https://adobe.com/something?query=stuff",
            "https://adobe.com:1234/something?query=stuff",
            "https://very.long.host.name.adobe.com/something?query=stuff",
            "https://adobe.com:80/something?query=stuff&otherstuff=somethingelse",
            "https://adobe.com:8080/something?query=stuff",
            "https://adobe1.com:8181/file.jpg",
            "https://adobe80.com:8080/something?query=stuff",
            "https://adobe.80.com:8080/something?query=stuff"
        ];

        const redact = rewiredRedact.__get__("redact");

        let redactedObject = redact(testObj, {}, false);

        assert.equal(redactedObject.source, testObj.source);
        assert.equal(redactedObject.target, testObj.target);
        assert.equal(redactedObject.noRedact, testObj.noRedact);

        assert.equal(redactedObject.urls[0], testObj.urls[0]);
        assert.equal(redactedObject.urls[1], testObj.urls[1]);
        assert.equal(redactedObject.urls[2], testObj.urls[2]);
        assert.equal(redactedObject.urls[3], testObj.urls[3]);
        assert.equal(redactedObject.urls[4], testObj.urls[4]);
        assert.equal(redactedObject.urls[5], testObj.urls[5]);
        assert.equal(redactedObject.urls[6], testObj.urls[6]);
        assert.equal(redactedObject.urls[7], testObj.urls[7]);

        redactedObject = redact(testObj, 42, false);

        assert.equal(redactedObject.source, testObj.source);
        assert.equal(redactedObject.target, testObj.target);
        assert.equal(redactedObject.noRedact, testObj.noRedact);

        assert.equal(redactedObject.urls[0], testObj.urls[0]);
        assert.equal(redactedObject.urls[1], testObj.urls[1]);
        assert.equal(redactedObject.urls[2], testObj.urls[2]);
        assert.equal(redactedObject.urls[3], testObj.urls[3]);
        assert.equal(redactedObject.urls[4], testObj.urls[4]);
        assert.equal(redactedObject.urls[5], testObj.urls[5]);
        assert.equal(redactedObject.urls[6], testObj.urls[6]);
        assert.equal(redactedObject.urls[7], testObj.urls[7]);

        redactedObject = redact(testObj, "", false);

        assert.equal(redactedObject.source, testObj.source);
        assert.equal(redactedObject.target, testObj.target);
        assert.equal(redactedObject.noRedact, testObj.noRedact);

        assert.equal(redactedObject.urls[0], testObj.urls[0]);
        assert.equal(redactedObject.urls[1], testObj.urls[1]);
        assert.equal(redactedObject.urls[2], testObj.urls[2]);
        assert.equal(redactedObject.urls[3], testObj.urls[3]);
        assert.equal(redactedObject.urls[4], testObj.urls[4]);
        assert.equal(redactedObject.urls[5], testObj.urls[5]);
        assert.equal(redactedObject.urls[6], testObj.urls[6]);
        assert.equal(redactedObject.urls[7], testObj.urls[7]);
    });

    it("does nothing when there is no field to handle", function() {
        const testObj = {};
        testObj.url = "https://adobe.com/something?query=stuff";
        testObj.source = "https://adobe.com:8888/something?query=stuff";
        testObj.target = "https://www.adobe.com";
        testObj.noRedact = "no-redact";
        testObj.urls = [
            "https://adobe.com/something?query=stuff",
            "https://adobe.com:1234/something?query=stuff",
            "https://very.long.host.name.adobe.com/something?query=stuff",
            "https://adobe.com:80/something?query=stuff&otherstuff=somethingelse",
            "https://adobe.com:8080/something?query=stuff",
            "https://adobe1.com:8181/file.jpg",
            "https://adobe80.com:8080/something?query=stuff",
            "https://adobe.80.com:8080/something?query=stuff"
        ];

        const redactField = rewiredRedact.__get__("redactField");
        const options = [
            {redactionList: [], redactionFn: redactField }
        ];

        const redact = rewiredRedact.__get__("redact");

        const redactedObject = redact(testObj, options, false);

        assert.equal(redactedObject.source, testObj.source);
        assert.equal(redactedObject.target, testObj.target);
        assert.equal(redactedObject.noRedact, testObj.noRedact);

        assert.equal(redactedObject.urls[0], testObj.urls[0]);
        assert.equal(redactedObject.urls[1], testObj.urls[1]);
        assert.equal(redactedObject.urls[2], testObj.urls[2]);
        assert.equal(redactedObject.urls[3], testObj.urls[3]);
        assert.equal(redactedObject.urls[4], testObj.urls[4]);
        assert.equal(redactedObject.urls[5], testObj.urls[5]);
        assert.equal(redactedObject.urls[6], testObj.urls[6]);
        assert.equal(redactedObject.urls[7], testObj.urls[7]);
    });

    it("redact() can handle circular dependencies without throwing", function() {
        const params = {
            key: "value"
        };
        params.bad = {
            params
        };
        const redact = rewiredRedact.__get__("redact");
        const redacted = redact(params);
        assert.equal(typeof redacted, "object");
        assert.equal(redacted.key, "value");
    });

    it("redact() ignores internal objects", function() {
        const params = {
            key: "value"
        };
        params.metrics = new AssetComputeMetrics(params);
        const redact = rewiredRedact.__get__("redact");
        const redacted = redact(params);
        assert.equal(typeof redacted, "object");
        assert.equal(redacted.key, "value");
        assert.equal(redacted.metrics, undefined);
    });
});