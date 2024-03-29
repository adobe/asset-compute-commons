/*
 * Copyright 2023 Adobe. All rights reserved.
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

const fetch = require('@adobe/node-fetch-retry');
const { generateHMACSignature } = require('./hmac-signature');

class AssetComputeWebhookEvents {

    /**
     * Creates a new asset compute webhook events handler.
     *
     * @param {object} params action parameters
     * @param {object} retry http request retry option
     */
    constructor(options) {
        options = options || {};
        this.webhookUrl = options.webhookUrl;
        this.orgId = options.orgId;
        this.clientId = options.clientId;
        this.hmacPrivateKey = options.hmacPrivateKey;
    }

    /**
     * sends an event to the webhook
     * @param {object} event event payload
     * @param {object} retryOptions to be passed to fetch
     */
    async sendEvent(event, retryOptions) {        
        const url = this.webhookUrl;
        const eventBody = JSON.stringify({
            user_guid: this.orgId,
            event_code: event.code,
            event:event.payload || {}
        });
        let signature;
        
        if(this.hmacPrivateKey) {
            try{
                console.log('generating HMAC signature using private key');
                const decodeHmacPrivateKey = Buffer.from(this.hmacPrivateKey, 'base64');
                signature = generateHMACSignature(eventBody, decodeHmacPrivateKey);
            } catch(error) {
                const message = `Error generating HMAC signature: ${error}`;
                console.error(message);
                // throw to send error metrics
                throw Error(message);
            }
        } else {
            console.log('HMAC private key not provided, skipping HMAC signature generation');
            // throw to send error metrics
            throw Error("HMAC private key not provided");
        }
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-ims-org-id': this.orgId,
                'x-api-key': this.clientId,
                'x-ac-hmac-signature' : signature,
            },
            body: eventBody,
            retryOptions: retryOptions
        });
        if (response.status !== 200 && response.status !== 202) {
            // If retry is disabled then anything other than 200 or 202 is considered as an error
            console.log(`sending event failed with ${response.status} ${response.statusText}`);
            throw Error(`${response.status} ${response.statusText}`);
        }
    }

    /**
     * Gets the webhook url
     * @returns the webhook url
     */
    getWebhookUrl() {
        return this.webhookUrl;
    }
    
}

module.exports = AssetComputeWebhookEvents;
