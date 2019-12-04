/**
 *  ADOBE CONFIDENTIAL
 *  __________________
 *
 *  Copyright 2019 Adobe Systems Incorporated
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

const process = require('process');

const EMPTY_NAME = "";
const EMPTY_PACKAGE = "";
const EMPTY_NAMESPACE = "";
const EMPTY_FULLNAME = "";

// splits with limit but keeping the leftover in the last part
function split(str, delim, limit) {
    const parts = str.split(delim);
    // parts = [];
    if (parts.length > limit) {
        const trailing = parts.slice(limit-1).join(delim);
        return parts.slice(0, limit-1).concat(trailing);
    }
    return parts;
}

class OpenwhiskActionName {
    constructor(entityName){
        entityName = entityName || process.env.__OW_ACTION_NAME;

        if (entityName) {
            this.fullname = entityName;

            if (entityName.startsWith("/")) {
                // expected to start with slash
                entityName = entityName.substring(1);

                // there can be max 3 parts, if there are more slashes in the action name
                // it would be an invalid entity name which we don't expect in __OW_ACTION_NAME
                const parts = split(entityName, "/", 3);
                if (parts.length === 3) {
                    // normal case 1
                    // fully qualified name, with package
                    // /namespace/package/action
                    this.namespace = parts[0];
                    this.package = parts[1];
                    this.name = parts[2];
                } else if (parts.length === 2) {
                    // normal case 2
                    // fully qualified name, no package
                    // /namespace/action
                    this.namespace = parts[0];
                    this.package = EMPTY_PACKAGE;
                    this.name = parts[1];
                } else {
                    // unusual case, only one part
                    // if starts with slash, it is a namespace only
                    this.namespace = entityName;
                    this.package = EMPTY_PACKAGE;
                    this.name = EMPTY_NAME;
                }
            } else {
                // if starts without slash, we assume it's a relative path
                // inside a namespace, but we don't know the namespace
                // can only have max 2 parts
                const parts = split(entityName, "/", 2);
                if (parts.length === 2) {
                    // assume fully qualified name, with package
                    // package/action
                    this.namespace = EMPTY_NAMESPACE;
                    this.package = parts[0];
                    this.name = parts[1];
                } else {
                    // assume just action name, no package
                    this.namespace = EMPTY_NAMESPACE;
                    this.package = EMPTY_PACKAGE;
                    this.name = parts[0];
                }
            }

        } else {
            this.name = EMPTY_NAME;
            this.package = EMPTY_PACKAGE;
            this.namespace = EMPTY_NAMESPACE;
            this.fullname = EMPTY_FULLNAME;
        }
    }
}

module.exports = OpenwhiskActionName;