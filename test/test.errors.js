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
const {
    GenericError,
    ClientError,
    Reason,
    RenditionFormatUnsupportedError,
    SourceFormatUnsupportedError,
    SourceUnsupportedError,
    SourceCorruptError
} = require('../lib/errors');

describe("errors", function() {

    it("GenericError", function() {
        try {
            throw new GenericError("hi", "my_code");
        } catch (e) {
            assert.ok(e instanceof GenericError);
            assert.equal(e.name, "GenericError");
            assert.equal(e.message, "hi");
            assert.equal(e.location, "my_code");
            const now = Date.now();
            assert.ok((now - 1000) < e.date && e.date <= now);
        }
    });

    it("RenditionFormatUnsupportedError", function() {
        try {
            throw new RenditionFormatUnsupportedError("hi");
        } catch (e) {
            assert.ok(e instanceof ClientError);
            assert.ok(e instanceof RenditionFormatUnsupportedError);
            assert.equal(e.name, "RenditionFormatUnsupportedError");
            assert.equal(e.message, "hi");
            assert.equal(e.reason, Reason.RenditionFormatUnsupported);
        }
    });

    it("SourceFormatUnsupportedError", function() {
        try {
            throw new SourceFormatUnsupportedError("hi");
        } catch (e) {
            assert.ok(e instanceof ClientError);
            assert.ok(e instanceof SourceFormatUnsupportedError);
            assert.equal(e.name, "SourceFormatUnsupportedError");
            assert.equal(e.message, "hi");
            assert.equal(e.reason, Reason.SourceFormatUnsupported);
        }
    });

    it("SourceUnsupportedError", function() {
        try {
            throw new SourceUnsupportedError("hi");
        } catch (e) {
            assert.ok(e instanceof ClientError);
            assert.ok(e instanceof SourceUnsupportedError);
            assert.equal(e.name, "SourceUnsupportedError");
            assert.equal(e.message, "hi");
            assert.equal(e.reason, Reason.SourceUnsupported);
        }
    });

    it("SourceCorruptError", function() {
        try {
            throw new SourceCorruptError("hi");
        } catch (e) {
            assert.ok(e instanceof ClientError);
            assert.ok(e instanceof SourceCorruptError);
            assert.equal(e.name, "SourceCorruptError");
            assert.equal(e.message, "hi");
            assert.equal(e.reason, Reason.SourceCorrupt);
        }
    });
});