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
        const details = new OpenwhiskActionName();
        assert.ok(details.name === "");
    });

    it('return NUI TEST ENV value in test env)', function() {
        const details = new OpenwhiskActionName("test_action");
        assert.equal(details.name, "test_action");
    });

    it('returns value when name has 3 parts', function() {
        process.env.__OW_ACTION_NAME = 'namespace/package/action';
        let details = new OpenwhiskActionName();
        assert.equal(details.name, "action");
        assert.equal(details.package, "package");
        assert.equal(details.namespace, "namespace");
        assert.equal(details.fullname, "namespace/package/action");

        process.env.__OW_ACTION_NAME = 'namespace/package/  ';
        details = new OpenwhiskActionName();
        assert.equal(details.name, "  ");
        assert.equal(details.package, "package");
        assert.equal(details.namespace, "namespace");
        
        process.env.__OW_ACTION_NAME = 'namespace/package/\n';
        details = new OpenwhiskActionName();
        assert.equal(details.name, "\n");
        assert.equal(details.package, "package");
        assert.equal(details.namespace, "namespace");
        delete process.env.__OW_ACTION_NAME;

        details = new OpenwhiskActionName("namespace/package/action");
        assert.equal(details.name, "action");
        assert.equal(details.package, "package");
        assert.equal(details.namespace, "namespace");
        assert.equal(details.fullname, "namespace/package/action");

        details = new OpenwhiskActionName("namespace/package/  ");
        assert.equal(details.name, "  ");
        assert.equal(details.package, "package");
        assert.equal(details.namespace, "namespace");
        
        details = new OpenwhiskActionName("namespace/package/\n");
        assert.equal(details.name, "\n");
        assert.equal(details.package, "package");
        assert.equal(details.namespace, "namespace");
    });

    it('returns value when name has 2 parts', function() {
        process.env.__OW_ACTION_NAME = 'namespace/action';
        let details = new OpenwhiskActionName();
        assert.equal(details.name, "action");
        assert.equal(details.package, "");
        assert.equal(details.namespace, "namespace");
        assert.equal(details.fullname, "namespace/action");

        process.env.__OW_ACTION_NAME = 'namespace/  ';
        details = new OpenwhiskActionName();
        assert.equal(details.name, "  ");
        assert.equal(details.package, "");
        assert.equal(details.namespace, "namespace");
        
        process.env.__OW_ACTION_NAME = 'namespace/\n';
        details = new OpenwhiskActionName();
        assert.equal(details.name, "\n");
        assert.equal(details.package, "");
        assert.equal(details.namespace, "namespace");
        delete process.env.__OW_ACTION_NAME;

        details = new OpenwhiskActionName('namespace/action');
        assert.equal(details.name, "action");
        assert.equal(details.package, "");
        assert.equal(details.namespace, "namespace");
        assert.equal(details.fullname, "namespace/action");

        details = new OpenwhiskActionName('namespace/  ');
        assert.equal(details.name, "  ");
        assert.equal(details.package, "");
        assert.equal(details.namespace, "namespace");
        
        details = new OpenwhiskActionName('namespace/\n');
        assert.equal(details.name, "\n");
        assert.equal(details.package, "");
        assert.equal(details.namespace, "namespace");
    });

    it('returns value when name has 1 part', function() {
        const details = new OpenwhiskActionName("this-is-the-name");
        assert.equal(details.name, "this-is-the-name");
        assert.equal(details.package, "");
        assert.equal(details.namespace, "");
        assert.equal(details.fullname, "this-is-the-name");
    });
});
