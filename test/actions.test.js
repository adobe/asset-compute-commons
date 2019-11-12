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
    it('returns a default value when name is empty', function() {
        const openwhiskDetails = new OpenwhiskActionName();
        assert.ok(openwhiskDetails.name !== "");
        assert.ok(openwhiskDetails.name !== null);
        assert.ok(openwhiskDetails.name !== undefined);
    });

    it('return NUI TEST ENV value in test env)', function() {
        const openwhiskDetails = new OpenwhiskActionName("test_action");
        assert.equal(openwhiskDetails.name, "test_action");
    });

    it('returns value when name has 3 parts', function() {
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

        openwhiskDetails = new OpenwhiskActionName("namespace/package/action");
        assert.equal(openwhiskDetails.name, "action");
        assert.equal(openwhiskDetails.package, "package");
        assert.equal(openwhiskDetails.namespace, "namespace");
        assert.equal(openwhiskDetails.fullname, "namespace/package/action");

        openwhiskDetails = new OpenwhiskActionName("namespace/package/  ");
        assert.equal(openwhiskDetails.name, "  ");
        assert.equal(openwhiskDetails.package, "package");
        assert.equal(openwhiskDetails.namespace, "namespace");
        
        openwhiskDetails = new OpenwhiskActionName("namespace/package/\n");
        assert.equal(openwhiskDetails.name, "\n");
        assert.equal(openwhiskDetails.package, "package");
        assert.equal(openwhiskDetails.namespace, "namespace");
    });

    it('returns value when name has 2 parts', function() {
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

        openwhiskDetails = new OpenwhiskActionName('namespace/action');
        assert.equal(openwhiskDetails.name, "action");
        assert.equal(openwhiskDetails.package, "");
        assert.equal(openwhiskDetails.namespace, "namespace");
        assert.equal(openwhiskDetails.fullname, "namespace/action");

        openwhiskDetails = new OpenwhiskActionName('namespace/  ');
        assert.equal(openwhiskDetails.name, "  ");
        assert.equal(openwhiskDetails.package, "");
        assert.equal(openwhiskDetails.namespace, "namespace");
        
        openwhiskDetails = new OpenwhiskActionName('namespace/\n');
        assert.equal(openwhiskDetails.name, "\n");
        assert.equal(openwhiskDetails.package, "");
        assert.equal(openwhiskDetails.namespace, "namespace");
    });

    it('returns value when name has 1 part', function() {
        const openwhiskDetails = new OpenwhiskActionName("this-is-the-name");
        assert.equal(openwhiskDetails.name, "this-is-the-name");
        assert.equal(openwhiskDetails.package, "");
        assert.equal(openwhiskDetails.namespace, "");
        assert.equal(openwhiskDetails.fullname, "this-is-the-name");
    });
});

