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