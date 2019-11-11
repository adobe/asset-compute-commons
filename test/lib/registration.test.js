/**
 *  ADOBE CONFIDENTIAL
 *  __________________
 *
 *  Copyright 2018 Adobe Systems Incorporated
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
const sinon = require('sinon');
const rewire = require('rewire');

const rewiredRegistration = rewire('../lib/registration');
const { checkRegistration, getCache, flushCache } = require('../lib/registration');
const { ClientError } = require('@nui/asset-compute-commons');

const TEST_ORG = "test@AdobeOrg";
const TEST_CONSUMER_ID = "105979";

// created using jwt.io
const TEST_CLIENT_ID = "test-client";
const TEST_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRfaWQiOiJ0ZXN0LWNsaWVudCIsIm5hbWUiOiJKb2huIERvZSIsImlhdCI6MTUxNjIzOTAyMn0.bhi8V5ZiM7gpjWB57QpfxFZMHGUQuTGoA6jIk_2EpFA";

const TEST_APP_ID = "52770";

const TEST_PROVIDER_ID = `asset_compute_${TEST_ORG}_${TEST_CLIENT_ID}`;
const TEST_JOURNAL_URL = `https://api.adobe.io/events/organizations/${TEST_CONSUMER_ID}/integrations/${TEST_APP_ID}/aaa12345-8ac6-4e6b-b7f6-8714247c2ff9`;

describe('registration.js - finds successful registration', function() {
    afterEach(() => {
        nock.cleanAll();
        delete process.env.NUI_UNIT_TEST_MODE;
    });
    beforeEach(() => {
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
        const cachelessCheckRegistration = rewiredRegistration.__get__('checkRegistrationUsingHttp');
        try{
            const params = {};
            params.orgId = TEST_ORG;
            params.clientId = TEST_CLIENT_ID;
            params.auth = {};
            params.auth.accessToken = TEST_TOKEN;

            await cachelessCheckRegistration(params);
        } catch(err){
            assert.fail("Registration check should have worked");
        }
    });
});

describe('registration.js - finds successful registration (no cache)', function() {
    afterEach(() => {
        delete process.env.NUI_BYPASS_CACHE;
        delete process.env.NUI_UNIT_TEST_MODE;
        nock.cleanAll();
    });
    beforeEach(() => {
        process.env.NUI_UNIT_TEST_MODE = true;
        process.env.NUI_BYPASS_CACHE = true;
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
        try{
            const params = {};
            params.orgId = TEST_ORG;
            params.clientId = TEST_CLIENT_ID;
            params.auth = {};
            params.auth.accessToken = TEST_TOKEN;

            await checkRegistration(params);
        } catch(err){
            assert.fail("Registration check should have worked");
        }
    });
});

describe('registration.js - handles missing registrations (no cache)', function() {
    beforeEach(() => {
        delete process.env.NUI_UNIT_TEST_MODE;
    })
    afterEach(() => {
        process.env.NUI_UNIT_TEST_MODE = true;
        nock.cleanAll();
    });
    it('handles not finding the integration (wrong response format)', async function() {
        const cachelessCheckRegistration = rewiredRegistration.__get__('checkRegistrationUsingHttp');

        nock('https://api.adobe.io').get('/console/organizations')
            .reply(200,
                []
            );

        try{
            const params = {};
            params.orgId = TEST_ORG;
            params.clientId = TEST_CLIENT_ID;
            params.auth = {};
            params.auth.accessToken = TEST_TOKEN;

            await cachelessCheckRegistration(params);
            assert.fail("Registration check should not have worked");
        } catch(err){
            assert.ok(err instanceof ClientError);
            assert.equal(err.message, `No registration found for orgId ${TEST_ORG}, and ${TEST_CLIENT_ID}`);

            assert.ok(err.innerError instanceof ClientError);
            assert.equal(err.innerError.message, "IMS org not found or user is not a member of it: test@AdobeOrg");
        }
    });

    it('handles not finding the console', async function() {
        const cachelessCheckRegistration = rewiredRegistration.__get__('checkRegistrationUsingHttp');

        nock('https://api.adobe.io').get('/console/organizations')
            .reply(200);

        try{
            const params = {};
            params.orgId = TEST_ORG;
            params.clientId = TEST_CLIENT_ID;
            params.auth = {};
            params.auth.accessToken = TEST_TOKEN;

            await cachelessCheckRegistration(params);
            assert.fail("Registration check should not have worked");
        } catch(err){
            assert.ok(err instanceof ClientError);
            assert.equal(err.message, `No registration found for orgId ${TEST_ORG}, and ${TEST_CLIENT_ID}`);

            assert.ok(err.innerError.message.includes("invalid json response body"));
        }
    });

    it('handles falsy callbacks', async function() {
        const cachelessCheckRegistration = rewiredRegistration.__get__('checkRegistrationUsingHttp');

        nock('https://api.adobe.io').get('/console/organizations')
            .reply(200, {});

        try{
            const params = {};
            params.orgId = TEST_ORG;
            params.clientId = TEST_CLIENT_ID;
            params.auth = {};
            params.auth.accessToken = TEST_TOKEN;

            await cachelessCheckRegistration(params);
            assert.fail("Registration check should not have worked");
        } catch(err){
            assert.ok(err instanceof ClientError);
            assert.equal(err.message, `No registration found for orgId ${TEST_ORG}, and ${TEST_CLIENT_ID}`);

            assert.ok(err.innerError.message.includes("is not a function"));
        }
    });

    it('handles not finding a console', async function() {
        const cachelessCheckRegistration = rewiredRegistration.__get__('checkRegistrationUsingHttp');

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

        try{
            const params = {};
            params.orgId = TEST_ORG;
            params.clientId = TEST_CLIENT_ID;
            params.auth = {};
            params.auth.accessToken = TEST_TOKEN;

            await cachelessCheckRegistration(params);
            assert.fail("Registration check should not have worked");
        } catch(err){
            assert.ok(err instanceof ClientError);
            assert.equal(err.message, `No registration found for orgId ${TEST_ORG}, and ${TEST_CLIENT_ID}`);

            assert.ok(err.innerError instanceof ClientError);
            assert.equal(err.innerError.message, "IMS org not found or user is not a member of it: test@AdobeOrg");
        }
    });

    it('handles not finding an integration (request does not succeed)', async function() {
        const cachelessCheckRegistration = rewiredRegistration.__get__('checkRegistrationUsingHttp');

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
            
        try {
            const params = {};
            params.orgId = TEST_ORG;
            params.clientId = TEST_CLIENT_ID;
            params.auth = {};
            params.auth.accessToken = TEST_TOKEN;

            await cachelessCheckRegistration(params);
        } catch(err) {
            assert.ok(err instanceof ClientError);
            assert.equal(err.message, `No registration found for orgId ${TEST_ORG}, and ${TEST_CLIENT_ID}`);

            assert.ok(err.innerError instanceof ClientError);
            assert.equal(err.innerError.message, "Integration not found for client id from access token: test-client");

            // Note: Seeing nock complaining about failing requests is normal here. 
            // That's actually that error handling we are testing for
        }
    });

    it('handles not finding a journal ', async function() {
        const cachelessCheckRegistration = rewiredRegistration.__get__('checkRegistrationUsingHttp');

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

        try {
            const params = {};
            params.orgId = TEST_ORG;
            params.clientId = TEST_CLIENT_ID;
            params.auth = {};
            params.auth.accessToken = TEST_TOKEN;

            await cachelessCheckRegistration(params);
        } catch(err) {
            assert.ok(err instanceof ClientError);
            assert.equal(err.message, `No registration found for orgId ${TEST_ORG}, and ${TEST_CLIENT_ID}`);

            assert.ok(err.innerError instanceof ClientError);
            assert.equal(err.innerError.message, `Journal not found for orgId ${TEST_ORG} and clientId ${TEST_CLIENT_ID}`);
        }
    });
});
