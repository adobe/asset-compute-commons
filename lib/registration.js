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

const { AdobeIOEvents } = require('@nui/adobe-io-events-client');
const { AdobeIOConsole } = require('@nui/adobe-io-console-client');
const { ClientError, ArgumentError } = require('./errors');

// for now, cacheless. Cache to be handled by caller.

function findJournalByProviderId(consumer, providerId) {
    const DELIVERY_TYPE = "JOURNAL";
    return consumer.delivery_type === DELIVERY_TYPE &&
        Array.isArray(consumer.events_of_interest) &&
        consumer.events_of_interest.some(e => e !== null && e.provider === providerId);
}
class AssetComputeRegistration {
    constructor(params){
        const orgId = (params.auth ? params.auth.orgId: null) || params.orgId;
        if (!params.auth || !params.auth.accessToken || !orgId) {
            throw new ArgumentError("no valid `accessToken` and `orgId` in request params", "registration");
        }
        if (!params.clientId) {
            throw new ArgumentError("no valid `clientId` in request params", "registration");
        }

        this.journal = null;

        this.orgId = orgId;
        this.clientId = params.clientId;
        this.accessToken = params.auth.accessToken;
        this.providerId = `asset_compute_${this.orgId}_${this.clientId}`;
        
        try{
            this.ioConsole = new AdobeIOConsole({
                accessToken: this.accessToken,
                apiKey: this.clientId
            });

            this.ioEvents = new AdobeIOEvents({
                accessToken: this.accessToken,
                orgId: this.orgId
            });
        } catch(err){
            const error = new ClientError("invalid `accessToken` and/or `orgId`", "registration");
            error.innerError = err;
            throw error;
        }
    }

    async getIntegrationDetails(){
        if(!this.integration){
            const consoleOrg = await this.ioConsole.findOrganization(this.orgId);
            if (!consoleOrg) {
                return null;
            }
            console.log(`IMS org ${this.orgId} => I/O consumer id ${consoleOrg.id}`);

            const consoleIntegration = await consoleOrg.getIntegrationByClientID(this.clientId);
            if (!consoleIntegration) {
                return null;
            }
            console.log(`IMS client_id ${this.clientId} => I/O application id ${consoleIntegration.id}, integration name: ${consoleIntegration.name}`);

            this.integration = {
                integrationName: consoleIntegration.name,
                consumerId: consoleOrg.id,
                applicationId: consoleIntegration.id,
            };
        } 
        return this.integration;
    }

    async getJournal(findValidJournalFn){
        findValidJournalFn = findValidJournalFn || findJournalByProviderId;
        if(typeof findValidJournalFn !== "function"){
            throw new ArgumentError("`findValidJournalFn` is not a function", "registration");
        }

        if(!this.journal){
            const integration = await this.getIntegrationDetails();
            if(!integration) {
                return null;
            }
            
            let consumers = null; // explicit null
            try {
                consumers = await this.ioEvents.listConsumerRegistrations(integration.consumerId, integration.applicationId);
            } catch(err){
                if(err.httpStatus !== 404)
                    throw(err);
                // else no consumer found, so no journal, so return null
            }

            if(consumers){
                this.journal = consumers.find(c => { return findValidJournalFn(c, this.providerId); }) || null;
            }
        }
        
        return this.journal;    
    }
}

module.exports = AssetComputeRegistration;
