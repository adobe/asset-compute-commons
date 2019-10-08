/**
 *  ADOBE CONFIDENTIAL
 *  __________________
 *
 *  Copyright 2018 Adobe Systems Incorporated
 *  All Rights Reserved.
 *
 *  NOTICE:  All information contained herein is, and remains
 *  the property of Adobe Systems Incorporated and its suppliers,
 *  if any.  The intellectual and technical concepts contained
 *  herein are proprietary to Adobe Systems Incorporated and its
 *  suppliers and are protected by trade secret or copyright law.
 *  Dissemination of this information or reproduction of this material
 *  is strictly forbidden unless prior written permission is obtained
 *  from Adobe Systems Incorporated.
 */

'use strict';

/* Asset Compute custom error library */

// Object. Error reason must be one of the following
const Reason = Object.freeze({
    GenericError: "GenericError",
    SourceFormatUnsupported: "SourceFormatUnsupported",
    RenditionFormatUnsupported: "RenditionFormatUnsupported",
    SourceUnsupported: "SourceUnsupported",
    SourceCorrupt: "SourceCorrupt"
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

module.exports = {
    GenericError,
    ClientError,
    Reason,
    RenditionFormatUnsupportedError,
    SourceFormatUnsupportedError,
    SourceUnsupportedError,
    SourceCorruptError
}