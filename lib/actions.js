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
        const nameToParse = name || process.env.__OW_ACTION_NAME;

        if(nameToParse){
            // namespace/package/action
            this.fullname = nameToParse;
            const nameComponents = this.fullname.split('/');

            if(nameComponents.length > 2){
                this.name = nameComponents[2];
                this.package = nameComponents[1];
                this.namespace = nameComponents[0];
            } else if(nameComponents.length === 1){
                this.name = nameComponents[1];
                this.package = DEFAULT_PACKAGE;  
                this.namespace = DEFAULT_NAMESPACE;
            } else {
                this.name = nameToParse;
                this.package = DEFAULT_PACKAGE;
                this.namespace = DEFAULT_NAMESPACE;
            }            
        } else {
            this.name = name || (Date.now().toString());
            this.package = DEFAULT_PACKAGE;
            this.namespace = DEFAULT_NAMESPACE;
            this.fullname = DEFAULT_FULLNAME;
        }
    }
}

module.exports = {
    OpenwhiskActionName
}