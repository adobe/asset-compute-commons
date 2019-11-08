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

class OpenwhiskActionName {
    constructor(name=""){
        if(process.env.__OW_ACTION_NAME){
            // namespace/package/action
            this.fullname = process.env.__OW_ACTION_NAME;
            const openwhiskDetails = this.fullname.split('/');
            this.name = openwhiskDetails[2];
            this.package = openwhiskDetails[1];
            this.namespace = openwhiskDetails[0];
        } else {
            this.name = name;
            this.package = "";
            this.namespace = "";
            this.fullname = "";
        }
    }
}

module.exports = {
    OpenwhiskActionName
}