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

const urlValidator = require('valid-url');
const urlParser = require('url');

// <----------------------- Fields to redact ----------------------->
const CREDENTIAL_FIELDS_TO_REDACT = [
                                        "newRelicApiKey", 
                                        "accessToken", 
                                        "uploadToken"
                                    ];
const URL_FIELDS_TO_REDACT = [
                                "url",
                                "urls",
                                "source",
                                "target"
                            ];

// <---------------------- Redaction helpers ---------------------->
// redacts a field by replacing it with "[...REDACTED...]"
function redactField(){
    return "[...REDACTED...]";
}

// redacts a url field keeping only protocol and hostname (host+port)
function redactUrlField(url){
    if(url && urlValidator.isHttpsUri(url)){
        const urlParts = urlParser.parse(url);
        return urlParts.protocol.concat("//", urlParts.host);
    } else {
        return url;
    }
}

// redacts an url or url array by keeping only protocol and hostname
function redactUrls(url){
    if(Array.isArray(url)){ // redact content of array, one by one
        for(let i = 0; i < url.length; i++){
            url[i] = redactUrlField(url[i]);
        }
        return url;
    } else if(typeof url === "string"){ // single field
        return redactUrlField(url);
    } else {
        return url;
    }
}

// <--------------------- Redaction functions --------------------->
/**
 * Prevent credentials from ending in activation results etc.
 * Recursively goes through the object and redact values for the
 * list of known fields. Note: this modifies the object!
 *
 * @param {object} obj object with credentials to redact
 * @param {boolean} silentRemove remove field when true, marks it as redacted when false
 */
function redactCredentials(obj, silentRemove=false) {
    return redact(obj, CREDENTIAL_FIELDS_TO_REDACT, silentRemove, redactField);
}

/**
 * Recursively goes through an object and redacts values for the
 * list of known fields. Note: this modifies the object!
 *
 * @param {object} obj object with fields to redact
 * @param {array} redactionList list of fields to remove/redact
 * @param {boolean} silentRemove remove field when true, marks it as redacted when false
 * @param {function} redactionFn optional, function to use for field redaction
 */
function redact(obj, redactionList, silentRemove, redactionFn) {
    if(!redactionFn || typeof redactionFn !== "function") {
        // in doubt, default to field redaction
        redactionFn = redactField;
    }

    if(typeof obj === "string" || Array.isArray(obj)){
        obj = redactionFn(obj);
    } else {
        Object.keys(obj).forEach(key => {
            if (redactionList.includes(key)) {
                if(silentRemove){
                    delete obj[key];
                } else {
                    obj[key] = redactionFn(obj[key]);
                }
            } else {
                const value = obj[key];
                if ((typeof value === 'object') && (value !== null)) {
                    redact(value, redactionList, silentRemove, redactionFn);
                }
            }
        });
    }
    
    return obj;
}

// <--------------------- Redacted fields logger --------------------->
class AssetComputeLogUtils{
    /**
     * Prevent full urls from ending in activation results etc.
     * Recursively goes through the object and redact values for the
     * list of known fields. Note: this modifies the object!
     *
     * @param {object} obj object with url to redact
     */
    static redactUrl(obj) {
        return redact(obj, URL_FIELDS_TO_REDACT, false, redactUrls);
    }

    /**
     * Log an object, redacts credential and url fields
     *
     * @param {object} params object to log. Credentials will be redacted
     * @param {string} message message for log function
     */
    static log(obj, message){
        let redactedObj = redactCredentials(obj);
        redactedObj = AssetComputeLogUtils.redactUrl(obj);

        if(message) {
            console.log(message, ":", redactedObj);
        } else {
            console.log(redactedObj);
        }        
    }
}

module.exports = {
    AssetComputeLogUtils
};