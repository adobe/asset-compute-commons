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

const assert = require('assert');
const {
    GenericError,
    ClientError,
    Reason,
    RenditionFormatUnsupportedError,
    SourceFormatUnsupportedError,
    SourceUnsupportedError,
    SourceCorruptError,
    RenditionTooLarge,
    ServiceOverLoadError
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

    it("RenditionTooLarge", function() {
        try {
            throw new RenditionTooLarge("hi ho");
        } catch (e) {
            assert.ok(e instanceof ClientError);
            assert.ok(e instanceof RenditionTooLarge);
            assert.equal(e.name, "RenditionTooLarge");
            assert.equal(e.message, "hi ho");
            assert.equal(e.reason, Reason.RenditionTooLarge);
        }
    });

    it("ServiceOverLoadError", function() {
        try {
            throw new ServiceOverLoadError("too many requests");
        } catch (e) {
            assert.ok(e instanceof ClientError);
            assert.ok(e instanceof ServiceOverLoadError);
            assert.equal(e.name, "ServiceOverLoadError");
            assert.equal(e.message, "too many requests");
            assert.equal(e.reason, Reason.ServiceOverLoad);
        }
    });
});
