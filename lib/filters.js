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

const FIELDS_TO_REDACT = ["newRelicApiKey", 
                            "accessToken", 
                            "uploadToken"];

class AssetComputeFilters{
    /**
     * Prevent credentials from ending in activation results etc.
     * Recursively goes through the object and redact values for the
     * list of known fields. Note: this modifies the object!
     *
     * @param {object} obj object with credentials to redact
     * @param {boolean} silentRemove remove field when true, marks it as redacted when false
     */
    static redactCredentials(obj, silentRemove=false) {
        return AssetComputeFilters.redact(obj, FIELDS_TO_REDACT, silentRemove);
    }

    /**
     * Recursively goes through an object and redacts values for the
     * list of known fields. Note: this modifies the object!
     *
     * @param {object} obj object with fields to redact
     * @param {array} redactionList list of fields to remove/redact
     * @param {boolean} silentRemove remove field when true, marks it as redacted when false
     */
    static redact(obj, redactionList, silentRemove) {
        Object.keys(obj).forEach(key => {
            if (redactionList.includes(key)) {
                if(silentRemove){
                    delete obj[key];
                } else {
                    obj[key] = "[...REDACTED...]";
                }
            } else {
                const value = obj[key];
                if ((typeof value === 'object') && (value !== null)) {
                    AssetComputeFilters.redact(value, redactionList, silentRemove);
                }
            }
        });
        return obj;
    }
}

module.exports = {
    AssetComputeFilters
};