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
const { OpenwhiskActionName } = require('../lib/actions');

describe("actions.js - Custom fields removal", function() {
    it('returns empty string (0 length) when nothing is set', function() {
        const openwhiskDetails = new OpenwhiskActionName();
        assert.equal(openwhiskDetails.name, "");
    });

    it('return NUI TEST ENV value in test env)', function() {
        const openwhiskDetails = new OpenwhiskActionName("test_action");
        assert.equal(openwhiskDetails.name, "test_action");
    });

    it('returns value set as env variable (3 parts)', function() {
        process.env.__OW_ACTION_NAME = 'namespace/package/action';
        let openwhiskDetails = new OpenwhiskActionName();
        assert.equal(openwhiskDetails.name, "action");
        assert.equal(openwhiskDetails.package, "package");
        assert.equal(openwhiskDetails.namespace, "namespace");
        assert.equal(openwhiskDetails.fullname, "namespace/package/action");

        process.env.__OW_ACTION_NAME = 'namespace/package/  ';
        openwhiskDetails = new OpenwhiskActionName();
        assert.equal(openwhiskDetails.name, "  ");
        assert.equal(openwhiskDetails.package, "package");
        assert.equal(openwhiskDetails.namespace, "namespace");
        
        process.env.__OW_ACTION_NAME = 'namespace/package/\n';
        openwhiskDetails = new OpenwhiskActionName();
        assert.equal(openwhiskDetails.name, "\n");
        assert.equal(openwhiskDetails.package, "package");
        assert.equal(openwhiskDetails.namespace, "namespace");

        delete process.env.__OW_ACTION_NAME;
    });

    it('returns value set as env variable (2 parts)', function() {
        process.env.__OW_ACTION_NAME = 'namespace/action';
        let openwhiskDetails = new OpenwhiskActionName();
        assert.equal(openwhiskDetails.name, "action");
        assert.equal(openwhiskDetails.package, "");
        assert.equal(openwhiskDetails.namespace, "namespace");
        assert.equal(openwhiskDetails.fullname, "namespace/action");

        process.env.__OW_ACTION_NAME = 'namespace/  ';
        openwhiskDetails = new OpenwhiskActionName();
        assert.equal(openwhiskDetails.name, "  ");
        assert.equal(openwhiskDetails.package, "");
        assert.equal(openwhiskDetails.namespace, "namespace");
        
        process.env.__OW_ACTION_NAME = 'namespace/\n';
        openwhiskDetails = new OpenwhiskActionName();
        assert.equal(openwhiskDetails.name, "\n");
        assert.equal(openwhiskDetails.package, "");
        assert.equal(openwhiskDetails.namespace, "namespace");

        delete process.env.__OW_ACTION_NAME;
    });
});

