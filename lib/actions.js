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

const DEFAULT_NAME = "";
const DEFAULT_PACKAGE = "";
const DEFAULT_NAMESPACE = "";
const DEFAULT_FULLNAME = "";


class OpenwhiskActionName {
    constructor(name=DEFAULT_NAME){
        if(process.env.__OW_ACTION_NAME){
            // namespace/package/action
            this.fullname = process.env.__OW_ACTION_NAME;
            const openwhiskDetails = this.fullname.split('/');

            if(openwhiskDetails.length > 2){
                this.name = openwhiskDetails[2];
                this.package = openwhiskDetails[1];
            } else {
                this.name = openwhiskDetails[1];
                this.package = DEFAULT_PACKAGE;  
            }
            this.namespace = openwhiskDetails[0];
        } else {
            this.name = name;
            this.package = DEFAULT_PACKAGE;
            this.namespace = DEFAULT_NAMESPACE;
            this.fullname = DEFAULT_FULLNAME;
        }
    }
}

module.exports = {
    OpenwhiskActionName
}