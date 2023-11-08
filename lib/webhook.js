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

class AssetComputeWebhookEvents {

    /**
     * Creates a new asset compute webhook events handler.
     *
     * @param {object} params action parameters
     * @param {object} retry http request retry option
     */
    constructor(options) {
        this.webhookUrl = options.webhookUrl;
        this.orgId = options.orgId;
        this.clientId = options.clientId;
    }

    async sendEvent(event, retryOptions) {
        const url = this.webhookUrl;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-ims-org-id': this.orgId,
                'x-api-key': this.clientId
            },
            body: JSON.stringify({
                user_guid: this.orgId,
                event_code: event.code,
                event: Buffer.from(JSON.stringify(event.payload || {})).toString('base64')
            }),
            retryOptions: retryOptions
        });
        if (response.status !== 200) {
            // If retry is disabled then anything other than 200 is considered an error

            console.log(`sending event failed with ${response.status} ${response.statusText}`);
            throw Error(`${response.status} ${response.statusText}`);
        }
    }
    
}

module.exports = AssetComputeWebhookEvents;
