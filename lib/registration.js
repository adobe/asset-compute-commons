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
const { ClientError } = require('./errors');

// for now, cacheless. Cache to be handled by caller.

class AssetComputeRegistration {
    constructor(params){
        const orgId = (params.auth ? params.auth.orgId: null) || params.orgId;
        if (!params.auth || !params.auth.accessToken || !orgId) {
            throw new ClientError("no valid `accessToken` and `orgId` in request params", "registration");
        }

        this.orgId = orgId;
        this.clientId = params.clientId;
        this.accessToken = params.auth.accessToken;
        this.providerId = `asset_compute_${this.orgId}_${this.clientId}`;

        this.ioConsole = new AdobeIOConsole({ // turn into singleton
            accessToken: this.accessToken,
            apiKey: this.clientId
        });

        this.ioEvents = new AdobeIOEvents({ // turn into singleton
            accessToken: this.accessToken,
            orgId: this.orgId
        });
    }

    async findIntegrationDetails(){
        const consoleOrg = await this.ioConsole.findOrganization(this.orgId);
        if (!consoleOrg) {
            throw new ClientError(`IMS org not found or user is not a member of it: ${this.orgId}`);
        }
        console.log(`IMS org ${this.orgId} => I/O consumer id ${consoleOrg.id}`);

        const consoleIntegration = await consoleOrg.getIntegrationByClientID(this.clientId);
        if (!consoleIntegration) {
            throw new ClientError(`Integration not found for client id from access token: ${this.clientId}`);
        }
        console.log(`IMS client_id ${this.clientId} => I/O application id ${consoleIntegration.id}, integration name: ${consoleIntegration.name}`);

        // keep integration details
        this.integration = {
            integrationName: consoleIntegration.name,
            consumerId: consoleOrg.id,
            applicationId: consoleIntegration.id,
        };

        return this.integration; 
    }

    static findJournal(consumer, providerId) {
        const DELIVERY_TYPE = "JOURNAL";
        return consumer.delivery_type === DELIVERY_TYPE &&
            Array.isArray(consumer.events_of_interest) &&
            consumer.events_of_interest.some(e => e.provider === providerId);
    }

    async findJournal(findValidJournalFn){
        findValidJournalFn = findValidJournalFn || AssetComputeRegistration.findJournal;
        if(typeof findValidJournalFn !== "function"){
            throw new ClientError("findJournal parameter is not a function");
        }

        if(!this.integration){
            await this.findIntegrationDetails();
        }
    
        const consumers = await this.ioEvents.listConsumerRegistrations(this.integration.consumerId, this.integration.applicationId);
        this.journal = consumers.find(c => { return findValidJournalFn(c, this.providerId); });
    
        if(!this.journal){
            throw new ClientError(`Journal not found for orgId ${this.orgId} and clientId ${this.clientId}`);
        }

        return this.journal;
    }
}

module.exports = {
    AssetComputeRegistration
}