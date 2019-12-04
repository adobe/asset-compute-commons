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

const assert = require('assert');
const nock = require('nock');

const AssetComputeRegistration = require('../lib/registration');
const { ClientError, ArgumentError } = require('../lib/errors');

const TEST_ORG = "test@AdobeOrg";
const TEST_CONSUMER_ID = "105979";

// created using jwt.io
const TEST_CLIENT_ID = "test-client";
const TEST_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRfaWQiOiJ0ZXN0LWNsaWVudCIsIm5hbWUiOiJKb2huIERvZSIsImlhdCI6MTUxNjIzOTAyMn0.bhi8V5ZiM7gpjWB57QpfxFZMHGUQuTGoA6jIk_2EpFA";

const TEST_APP_ID = "52770";

const TEST_PROVIDER_ID = `asset_compute_${TEST_ORG}_${TEST_CLIENT_ID}`;
const TEST_JOURNAL_URL = `https://api.adobe.io/events/organizations/${TEST_CONSUMER_ID}/integrations/${TEST_APP_ID}/aaa12345-8ac6-4e6b-b7f6-8714247c2ff9`;

describe('registration.js - finds successful registration', function() {
    afterEach(function() {
        nock.cleanAll();
        delete process.env.NUI_UNIT_TEST_MODE;
    });
    beforeEach(function() {
        process.env.NUI_UNIT_TEST_MODE = true;

        nock('https://api.adobe.io').get('/console/organizations')
            .reply(200,
                [{
                    "id": TEST_CONSUMER_ID,
                    "code": TEST_ORG,
                    "name": "Project Nui",
                    "description": null,
                    "type": "entp"
                }]
            );

        nock('https://api.adobe.io').get('/console/organizations/105979/integrations')
            .reply(200,
                [{
                    "id": TEST_CONSUMER_ID,
                    "code": TEST_ORG,
                    "name": "Project Nui",
                    "description": null,
                    "type": "entp"
                }]
            );

        nock('https://api.adobe.io').get('/console/organizations/105979/integrations?size=50&page=0')
            .reply(200,
                { content: [{
                        apiKey: TEST_CLIENT_ID,
                        id: TEST_CONSUMER_ID,
                        status: "status",
                        name: "Project Nui",
                        description: null
                    }]
                }
            );
        
        nock('https://api.adobe.io').get(`/events/organizations/${TEST_CONSUMER_ID}/integrations/${TEST_CONSUMER_ID}/registrations`)
        .reply(200, [
            {
                "id": 33841,
                "client_id": TEST_CLIENT_ID,
                "name": "Asset Compute Journal",
                "description": `Asset Compute Journal - ${TEST_CLIENT_ID}`,
                "parent_client_id": TEST_CLIENT_ID,
                "webhook_url": null,
                "status": "VERIFIED",
                "type": "APP",
                "integration_status": "ENABLED",
                "events_of_interest": [
                    {
                        "event_code": "asset_compute",
                        "provider": TEST_PROVIDER_ID,
                        "eventWithProvider": "adobe_io_event-asset_compute-759"
                    }
                ],
                "registration_id": "ddd75855-8ac6-4e6b-b7f6-8714247c2ff9",
                "delivery_type": "JOURNAL",
                "events_url": TEST_JOURNAL_URL,
                "created_date": "2018-12-14T01:52:20.000Z",
                "updated_date": "2018-12-14T01:52:20.000Z",
                "runtime_action": ""
            }
        ]);
    });

    it('finds an integration', async function() {
        const params = {};
        
        params.auth = {};
        params.auth.orgId = TEST_ORG;
        params.auth.accessToken = TEST_TOKEN;
        params.auth.clientId = TEST_CLIENT_ID;

        const registration = new AssetComputeRegistration(params);
        await registration.getJournal();

    });

    it('finds an integration (cached)', async function() {
        const params = {};
        
        params.auth = {};
        params.auth.orgId = TEST_ORG;
        params.auth.accessToken = TEST_TOKEN;
        params.auth.clientId = TEST_CLIENT_ID;

        const registration = new AssetComputeRegistration(params);
        await registration.getJournal();
        await registration.getJournal();
    });

    it('finds an integration when given custom journal finder function', async function() {
        try{
            const params = {};
            
            params.auth = {};
            params.auth.orgId = TEST_ORG;
            params.auth.accessToken = TEST_TOKEN;
            params.auth.clientId = TEST_CLIENT_ID;

            const journalFinder = function(consumer, providerId) {
                return consumer.delivery_type === "JOURNAL" &&
                    Array.isArray(consumer.events_of_interest) &&
                    consumer.events_of_interest.some(e => e.provider === providerId);
            };

            const registration = new AssetComputeRegistration(params);
            await registration.getJournal(journalFinder);
        } catch(err){
            console.log(err);
            assert.fail("Registration check should have worked");
        }
    });

    it('finds a journal (orgId in different place)', async function() {
        try{
            const params = {};
            
            params.auth = {};
            params.auth.orgId = TEST_ORG;
            params.auth.accessToken = TEST_TOKEN;
            params.auth.clientId = TEST_CLIENT_ID;

            const registration = new AssetComputeRegistration(params);
            await registration.getJournal();
        } catch(err){
            console.log(err);
            assert.fail("Registration check should have worked");
        }
    });

    it('finds a journal when integration is known', async function() {
        
        try{
            const params = {};
            
            params.auth = {};
            params.auth.orgId = TEST_ORG;
            params.auth.accessToken = TEST_TOKEN;
            params.auth.clientId = TEST_CLIENT_ID;

            const registration = new AssetComputeRegistration(params);
            registration.integration =  {
                applicationId:"105979",
                consumerId:"105979",
                integrationName:"Project Nui"
            };

            await registration.getJournal();
        } catch(err){
            console.log(err);
            assert.fail("Registration check should have worked");
        }
    });

    it('finds an integration, then finds a journal', async function() {
        try{
            const params = {};
            
            params.auth = {};
            params.auth.orgId = TEST_ORG;
            params.auth.accessToken = TEST_TOKEN;
            params.auth.clientId = TEST_CLIENT_ID;

            const registration = new AssetComputeRegistration(params);

            await registration.getIntegrationDetails();
            await registration.getJournal();
        } catch(err){
            console.log(err);
            assert.fail("Registration check should have worked");
        }
    });

    it('finds an integration, then finds a journal (legacy headers)', async function() {
        try{
            const params = {};
            
            params.auth = {};
            params.auth.accessToken = TEST_TOKEN;

            params.orgId = TEST_ORG;
            params.clientId = TEST_CLIENT_ID;

            const registration = new AssetComputeRegistration(params);

            await registration.getIntegrationDetails();
            await registration.getJournal();
        } catch(err){
            console.log(err);
            assert.fail("Registration check should have worked");
        }
    });

    it('finds an integration, sets it, then finds a journal', async function() {
        try{
            const params = {};
            
            params.auth = {};
            params.auth.orgId = TEST_ORG;
            params.auth.accessToken = TEST_TOKEN;
            params.auth.clientId = TEST_CLIENT_ID;

            const registration = new AssetComputeRegistration(params);

            const integration = await registration.getIntegrationDetails();
            registration.integration = integration;
            await registration.getJournal();
        } catch(err){
            console.log(err);
            assert.fail("Registration check should have worked");
        }
    });

    it('throws if auth token is missing', async function() {
        try{
            const params = {};
            
            params.auth = {};
            params.auth.orgId = TEST_ORG;
            params.auth.clientId = TEST_CLIENT_ID;
            //params.auth.accessToken = TEST_TOKEN;

            new AssetComputeRegistration(params);

            assert.fail("Registration check should not have worked");
        } catch(err){
            console.log(err);
            assert.ok(err instanceof ArgumentError);
            assert.equal(err.message, "no valid `accessToken` and `orgId` in request params");
        }
    });

    it('throws if client_id is missing', async function() {
        try{
            const params = {};
            //params.clientId = TEST_CLIENT_ID;
            params.auth = {};
            params.auth.orgId = TEST_ORG;
            params.auth.accessToken = TEST_TOKEN;

            new AssetComputeRegistration(params);

            assert.fail("Registration check should not have worked");
        } catch(err){
            console.log(err);
            assert.ok(err instanceof ArgumentError);
            assert.equal(err.message, "no valid `clientId` in request params");
        }
    });

    it('throws if auth token is not formed properly', async function() {
        try{
            const params = {};
            
            params.auth = {};
            params.auth.orgId = TEST_ORG;
            params.auth.accessToken = "wrongly formed token";
            params.auth.clientId = TEST_CLIENT_ID;

            new AssetComputeRegistration(params);

            assert.fail("Registration check should not have worked");
        } catch(err){
            console.log(err);
            assert.ok(err instanceof ClientError);
            assert.ok(err.innerError.message.includes("Cannot read property 'client_id' of null"));
        }
    });

    it('throws if auth is missing', async function() {
        try{
            const params = {};
            
            params.auth = {};
            params.auth.orgId = TEST_ORG;
            //params.auth.accessToken = TEST_TOKEN;
            params.auth.clientId = TEST_CLIENT_ID;

            new AssetComputeRegistration(params);

            assert.fail("Registration check should not have worked");
        } catch(err){
            console.log(err);
            assert.ok(err instanceof ArgumentError);
            assert.equal(err.message, "no valid `accessToken` and `orgId` in request params");
        }
    });

    it('throws if orgId is missing', async function() {
        try{
            const params = {};
            
            params.auth = {};
            //params.auth.orgId = TEST_ORG;
            params.auth.accessToken = TEST_TOKEN;
            params.auth.clientId = TEST_CLIENT_ID;

            new AssetComputeRegistration(params);

            assert.fail("Registration check should not have worked");
        } catch(err){
            console.log(err);
            assert.ok(err instanceof ArgumentError);
            assert.equal(err.message, "no valid `accessToken` and `orgId` in request params");
        }
    });
});


describe('registration.js - handles missing registrations (no cache)', function() {
    beforeEach(function() {
        delete process.env.NUI_UNIT_TEST_MODE;
    })
    afterEach(function() {
        process.env.NUI_UNIT_TEST_MODE = true;
        nock.cleanAll();
    });

    it('handles falsy callbacks', async function() {
        nock('https://api.adobe.io').get('/console/organizations')
            .reply(200, {});

        try{
            const params = {};
            
            params.auth = {};
            params.auth.orgId = TEST_ORG;
            params.auth.accessToken = TEST_TOKEN;
            params.auth.clientId = TEST_CLIENT_ID;

            const registration = new AssetComputeRegistration(params);
            await registration.getJournal(42);
            assert.fail("Registration check should not have worked");
        } catch(err){
            assert.ok(err instanceof ArgumentError);
            assert.ok(err.message.includes("is not a function"));
        }
    });

    it('handles not finding a console', async function() {
        nock('https://api.adobe.io').get('/console/organizations')
            .reply(200,
                [{
                    "id": TEST_CONSUMER_ID,
                    "code": "not-existing-org",
                    "name": "Project Nui",
                    "description": null,
                    "type": "entp"
                }]
            );

        const params = {};
        
        params.auth = {};
        params.auth.orgId = TEST_ORG;
        params.auth.accessToken = TEST_TOKEN;
        params.auth.clientId = TEST_CLIENT_ID;

        const registration = new AssetComputeRegistration(params);
        const res = await registration.getJournal();
        assert.equal(res, null);
    });

    it('handles not finding an integration (request does not succeed)', async function() {
        nock('https://api.adobe.io').get('/console/organizations')
            .reply(200,
                [{
                    "id": TEST_CONSUMER_ID,
                    "code": TEST_ORG,
                    "name": "Project Nui",
                    "description": null,
                    "type": "entp"
                }]
            );

        nock('https://api.adobe.io').get('/console/organizations/105979/integrations?size=50&page=0')
            .reply(200,
                { content: [{
                        apiKey: "another api key",
                        id: TEST_CONSUMER_ID,
                        status: "status",
                        name: "Project Nui",
                        description: null
                    }]
                }
            );
            

        const params = {};
        
        params.auth = {};
        params.auth.orgId = TEST_ORG;
        params.auth.accessToken = TEST_TOKEN;
        params.auth.clientId = TEST_CLIENT_ID;

        const registration = new AssetComputeRegistration(params);
        const res = await registration.getJournal();
        assert.equal(res, null);

        // Note: Seeing nock complaining about failing requests is normal here. 
        // That's actually that error handling we are testing for
    });

    it('handles not finding a journal ', async function() {
        nock('https://api.adobe.io').get('/console/organizations')
            .reply(200,
                [{
                    "id": TEST_CONSUMER_ID,
                    "code": TEST_ORG,
                    "name": "Project Nui",
                    "description": null,
                    "type": "entp"
                }]
            );

        nock('https://api.adobe.io').get('/console/organizations/105979/integrations')
            .reply(200,
                [{
                    "id": TEST_CONSUMER_ID,
                    "code": TEST_ORG,
                    "name": "Project Nui",
                    "description": null,
                    "type": "entp"
                }]
            );

        nock('https://api.adobe.io').get('/console/organizations/105979/integrations?size=50&page=0')
            .reply(200,
                { content: [{
                        apiKey: TEST_CLIENT_ID,
                        id: TEST_CONSUMER_ID,
                        status: "status",
                        name: "Project Nui",
                        description: null
                    }]
                }
            );
        
        nock('https://api.adobe.io').get(`/events/organizations/${TEST_CONSUMER_ID}/integrations/${TEST_CONSUMER_ID}/registrations`)
        .reply(200, [
            {
                "id": 33841,
                "client_id": TEST_CLIENT_ID,
                "name": "Asset Compute Journal",
                "description": `Asset Compute Journal - ${TEST_CLIENT_ID}`,
                "parent_client_id": TEST_CLIENT_ID,
                "webhook_url": null,
                "status": "VERIFIED",
                "type": "APP",
                "integration_status": "ENABLED",
                "events_of_interest": [
                    {
                        "event_code": "asset_compute",
                        "provider": TEST_PROVIDER_ID,
                        "eventWithProvider": "adobe_io_event-asset_compute-759"
                    }
                ],
                "registration_id": "ddd75855-8ac6-4e6b-b7f6-8714247c2ff9",
                "delivery_type": "NOT_JOURNAL",
                "events_url": TEST_JOURNAL_URL,
                "created_date": "2018-12-14T01:52:20.000Z",
                "updated_date": "2018-12-14T01:52:20.000Z",
                "runtime_action": ""
            }
        ]);

        const params = {};
        
        params.auth = {};
        params.auth.orgId = TEST_ORG;
        params.auth.accessToken = TEST_TOKEN;
        params.auth.clientId = TEST_CLIENT_ID;

        const failingJournalFinder = function(consumer) {
            console.log("Custom journal finder")
            return consumer.delivery_type === "JOURNAL" &&
                Array.isArray(consumer.events_of_interest) &&
                consumer.events_of_interest.some(e => e.provider === 'unknown-provider');
        };

        const registration = new AssetComputeRegistration(params);
        const res = await registration.getJournal(failingJournalFinder);
        assert.equal(res, null);

    });

    it('handles unknown errors in getJournal gracefully', async function() {
        process.env.NUI_UNIT_TEST_MODE = true;

        nock('https://api.adobe.io').get('/console/organizations')
            .reply(200,
                [{
                    "id": TEST_CONSUMER_ID,
                    "code": TEST_ORG,
                    "name": "Project Nui",
                    "description": null,
                    "type": "entp"
                }]
            );

        nock('https://api.adobe.io').get('/console/organizations/105979/integrations')
            .reply(200,
                [{
                    "id": TEST_CONSUMER_ID,
                    "code": TEST_ORG,
                    "name": "Project Nui",
                    "description": null,
                    "type": "entp"
                }]
            );

        nock('https://api.adobe.io').get('/console/organizations/105979/integrations?size=50&page=0')
            .reply(200,
                { content: [{
                        apiKey: TEST_CLIENT_ID,
                        id: TEST_CONSUMER_ID,
                        status: "status",
                        name: "Project Nui",
                        description: null
                    }]
                }
            );
        
        nock('https://api.adobe.io').get(`/events/organizations/${TEST_CONSUMER_ID}/integrations/${TEST_CONSUMER_ID}/registrations`)
        .reply(200, [
            {
                "id": 33841,
                "client_id": TEST_CLIENT_ID,
                "name": "Asset Compute Journal",
                "description": `Asset Compute Journal - ${TEST_CLIENT_ID}`,
                "parent_client_id": TEST_CLIENT_ID,
                "webhook_url": null,
                "status": "VERIFIED",
                "type": "APP",
                "integration_status": "ENABLED",
                "events_of_interest": [
                    {
                        "event_code": "asset_compute",
                        "provider": TEST_PROVIDER_ID,
                        "eventWithProvider": "adobe_io_event-asset_compute-759"
                    }
                ],
                "registration_id": "ddd75855-8ac6-4e6b-b7f6-8714247c2ff9",
                "delivery_type": "JOURNAL",
                "events_url": TEST_JOURNAL_URL,
                "created_date": "2018-12-14T01:52:20.000Z",
                "updated_date": "2018-12-14T01:52:20.000Z",
                "runtime_action": ""
            }
        ]);

        try{
            const params = {};
            
            params.auth = {};
            params.auth.orgId = TEST_ORG;
            params.auth.accessToken = TEST_TOKEN;
            params.auth.clientId = TEST_CLIENT_ID;

            const journalFinder = function() {
                throw new Error("Unknown custom error (from unit test)");
            };

            const registration = new AssetComputeRegistration(params);
            await registration.getJournal(journalFinder);

            assert.fail("Registration check should not have worked");
        } catch(err){
            assert.ok(err.message, "Unknown custom error (from unit test)");
        }

        delete process.env.NUI_UNIT_TEST_MODE;
    });

    it("handles not having registered consumers", async function (){
        nock.cleanAll();
        nock('https://api.adobe.io')
            .get('/console/organizations')
            .reply(200,
                [{
                    "id": TEST_CONSUMER_ID,
                    "code": TEST_ORG,
                    "name": "Project Nui",
                    "description": null,
                    "type": "entp"
                }]
            );
        nock('https://api.adobe.io')
            .get(`/console/organizations/${TEST_CONSUMER_ID}/integrations`)
            .reply(200,
                [{
                    "id": TEST_CONSUMER_ID,
                    "code": TEST_ORG,
                    "name": "Project Nui",
                    "description": null,
                    "type": "entp"
                }]
            );
        nock('https://api.adobe.io')
            .get('/console/organizations/105979/integrations?size=50&page=0')
            .reply(200,
                { content: [{
                        apiKey: TEST_CLIENT_ID,
                        id: TEST_CONSUMER_ID,
                        status: "status",
                        name: "Project Nui",
                        description: null
                    }]
                }
            );
        nock('https://api.adobe.io')
            .get(`/events/organizations/${TEST_CONSUMER_ID}/integrations/${TEST_CONSUMER_ID}/registrations`)
            .reply(404);

        const params = {};
        
        params.auth = {};
        params.auth.orgId = TEST_ORG;
        params.auth.accessToken = TEST_TOKEN;
        params.auth.clientId = TEST_CLIENT_ID;
    
        const registration = new AssetComputeRegistration(params);
        const res = await registration.getJournal();
        assert.equal(res, null);
    });
});
