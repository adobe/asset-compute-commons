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
const { GenericError } = require('@nui/asset-compute-commons');

// for now, cacheless. Cache to be handled by caller.

class AssetComputeRegistration {
    constructor(params){
        if (!params.auth || !params.auth.accessToken || !params.auth.orgId) {
            throw new GenericError("no valid `accessToken` and `orgId` in request params", "registration");
        }

        this.orgId = params.orgId;
        this.clientId = params.clientId;
        this.accessToken = params.auth.accessToken;
        this.providerId = `asset_compute_${this.orgId}_${this.clientId}`;

        this.ioConsole = new AdobeIOConsole({ // turn into singleton
            accessToken: token,
            apiKey: clientId
        });

        this.ioEvents = new AdobeIOEvents({ // turn into singleton
            accessToken: token,
            orgId: orgId
        });
    }

    async findIntegrationDetails(token, orgId, clientId){
        token = token || this.accessToken;
        orgId = orgId || this.orgId;
        clientId = clientId || this.clientId;

        const consoleOrg = await this.ioConsole.findOrganization(orgId);
        if (!consoleOrg) {
            throw new ClientError(`IMS org not found or user is not a member of it: ${orgId}`);
        }
        console.log(`IMS org ${orgId} => I/O consumer id ${consoleOrg.id}`);

        const integration = await consoleOrg.getIntegrationByClientID(clientId);
        if (!integration) {
            throw new ClientError(`Integration not found for client id from access token: ${clientId}`);
        }
        console.log(`IMS client_id ${clientId} => I/O application id ${integration.id}, integration name: ${integration.name}`);

        // not going to pollute validated and normalized params
        this.integration = {
            integrationName: integration.name,
            consumerId: consoleOrg.id,
            applicationId: integration.id,
        };

        return this.integration; 
    }

    findJournal(consumer, providerId) {
        const DELIVERY_TYPE = "JOURNAL";
        return consumer.delivery_type === DELIVERY_TYPE &&
            Array.isArray(consumer.events_of_interest) &&
            consumer.events_of_interest.some(e => e.provider === providerId);
    }

    async checkJournal(orgId, clientId, consumerId, applicationId, findValidJournalFn){
        orgId = orgId || this.orgId;
        clientId = clientId || this.clientId;
        consumerId = consumerId || this.integration.consumerId;
        applicationId = applicationId || this.integration.applicationId;

        findValidJournalFn = findValidJournalFn || this.findJournal;
    
        const consumers = await this.ioEvents.listConsumerRegistrations(consumerId, applicationId);
        this.journal = consumers.find(c => { return findValidJournalFn(c, this.providerId); });
    
        if(!this.journal){
            throw new ClientError(`Journal not found for orgId ${orgId} and clientId ${clientId}`);
        }

        return this.journal;
    }
}