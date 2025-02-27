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

/* Asset Compute custom error library */

// Object. Error reason must be one of the following
const Reason = Object.freeze({
    GenericError: "GenericError",
    SourceFormatUnsupported: "SourceFormatUnsupported",
    RenditionFormatUnsupported: "RenditionFormatUnsupported",
    SourceUnsupported: "SourceUnsupported",
    SourceCorrupt: "SourceCorrupt",
    RenditionTooLarge: "RenditionTooLarge",
    ServiceOverLoad: "ServiceOverLoad"
});


/**
 * Unhandled internal Asset Compute service error
 * @param message Error message
 * @param location Error location, a short greppable string describing the exception location (e.g. "sdk_rendition_upload")
 */
class GenericError extends Error {
    constructor(message, location) {
        super(message);

        Error.captureStackTrace(this, GenericError);
        this.name = "GenericError";

        // Custom debugging information
        this.location = location;
        this.date = Date.now();
    }
}

/**
 * Argument error: Wrong arguments (type, structure, ...)
 * @param message Error message
 * @param location Error location, a short greppable string describing the exception location (e.g. "sdk_rendition_upload")
 */
class ArgumentError extends Error {
    constructor(message, location) {
        super(message);

        Error.captureStackTrace(this, ArgumentError);
        this.name = "ArgumentError";

        // Custom debugging information
        this.location = location;
        this.date = Date.now();
    }
}

/**
 * Base class for Asset Compute client errors (in the spirit of HTTP 4xx)
 */
class ClientError extends Error {
    constructor(message, name, reason) {
        super(message);

        this.name = name;
        this.reason = reason;
        this.date = Date.now();
    }
}


// The requested format is unsupported.
// To throw error: throw new RenditionFormatUnsupportedError(`The requested format is unsupported`);
class RenditionFormatUnsupportedError extends ClientError {
    constructor(message) {
        super(message, "RenditionFormatUnsupportedError", Reason.RenditionFormatUnsupported);

        Error.captureStackTrace(this, RenditionFormatUnsupportedError);
    }
}

// The source is of an unsupported type.
class SourceFormatUnsupportedError extends ClientError {
    constructor(message) {
        super(message, "SourceFormatUnsupportedError", Reason.SourceFormatUnsupported);

        Error.captureStackTrace(this, SourceFormatUnsupportedError);
    }
}

// The specific source is unsupported even though the type is supported.
class SourceUnsupportedError extends ClientError {
    constructor(message) {
        super(message, "SourceUnsupportedError", Reason.SourceUnsupported);

        Error.captureStackTrace(this, SourceUnsupportedError);
    }
}

// The source data is corrupt. Includes empty files.
class SourceCorruptError extends ClientError {
    constructor(message) {
        super(message, "SourceCorruptError", Reason.SourceCorrupt);

        Error.captureStackTrace(this, SourceCorruptError);
    }
}

// The rendition was too large to send
class RenditionTooLarge extends ClientError {
    constructor(message) {
        super(message, "RenditionTooLarge", Reason.RenditionTooLarge);

        Error.captureStackTrace(this, RenditionTooLarge);
    }
}

// Worker encountered upstream API rate limiting. Client may resubmit request after some time.
class ServiceOverLoadError extends ClientError {
    constructor(message) {
        super(message, "ServiceOverLoadError", Reason.ServiceOverLoad);

        Error.captureStackTrace(this, ServiceOverLoadError);
    }
}

module.exports = {
    GenericError,
    ClientError,
    Reason,
    RenditionFormatUnsupportedError,
    SourceFormatUnsupportedError,
    SourceUnsupportedError,
    SourceCorruptError,
    RenditionTooLarge,
    ArgumentError,
    ServiceOverLoadError
};
