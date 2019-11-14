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

"use strict";

const assert = require('assert');
const sinon = require('sinon');
const rewire = require('rewire');

const {AssetComputeLogUtils} = require('../lib/log-utils');
const rewiredRedact = rewire('../lib/log-utils');

describe("log-utils.js - Credentials redaction", function() {
    it("redacts fields", function() {
        const testObj = {};
        testObj.newRelicApiKey = "newRelicApiKey";
        testObj.accessToken = "accessToken";
        testObj.uploadToken = "uploadToken";
        testObj.noRedact = "no-redact";

        const redactCredentials = rewiredRedact.__get__("redactCredentials");
        const redactedObject = redactCredentials(testObj);
        assert.equal(redactedObject.newRelicApiKey, "[...REDACTED...]");
        assert.equal(redactedObject.accessToken, "[...REDACTED...]");
        assert.equal(redactedObject.uploadToken, "[...REDACTED...]");
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

        const redactCredentials = rewiredRedact.__get__("redactCredentials");
        const redactedObject = redactCredentials(parentObj);
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

        const redactCredentials = rewiredRedact.__get__("redactCredentials");
        const redactedObject = redactCredentials(parentObj);
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

        const redactCredentials = rewiredRedact.__get__("redactCredentials");
        const redactedObject = redactCredentials(testObj);
        assert.equal(redactedObject.noRedact, "no-redact");
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

        const redactCredentials = rewiredRedact.__get__("redactCredentials");
        const redactedObject = redactCredentials(testObj, true);
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

        const redactCredentials = rewiredRedact.__get__("redactCredentials");
        const redactedObject = redactCredentials(parentObj, true);
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

        const redactCredentials = rewiredRedact.__get__("redactCredentials");
        const redactedObject = redactCredentials(parentObj, true);
        console.log(redactedObject);
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

        const redactCredentials = rewiredRedact.__get__("redactCredentials");
        const redactedObject = redactCredentials(testObj, true);
        assert.equal(redactedObject.noRedact, "no-redact");
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

        const redact = rewiredRedact.__get__("redact");
        const redactedObject = redact(parentObj, ["threeField", "oneField", "twoField"], false);
        console.log(redactedObject);
        assert.equal(redactedObject.oneField, "[...REDACTED...]");
        assert.equal(redactedObject.twoField, "[...REDACTED...]");
        assert.equal(redactedObject.testObj.threeField, "[...REDACTED...]");
        assert.equal(redactedObject.testObj.noRedact, "no-redact");
        assert.equal(redactedObject.noRedact, "no-redact-parent");
    });

    it("redacts nested fields (fields at different levels) - defaults to redaction", function() {
        const parentObj = {};
        parentObj.noRedact = "no-redact-parent";
        parentObj.oneField = "newRelicApiKey";
        parentObj.twoField = "accessToken";

        const testObj = {};
        testObj.threeField = "uploadToken";
        testObj.noRedact = "no-redact";

        parentObj.testObj = testObj;

        const redact = rewiredRedact.__get__("redact");
        const redactedObject = redact(parentObj, ["threeField", "oneField", "twoField"]);
        console.log(redactedObject);
        assert.equal(redactedObject.oneField, "[...REDACTED...]");
        assert.equal(redactedObject.twoField, "[...REDACTED...]");
        assert.equal(redactedObject.testObj.threeField, "[...REDACTED...]");
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

        const redact = rewiredRedact.__get__("redact");
        const redactedObject = redact(parentObj, ["threeField", "oneField", "twoField"], true);
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
});