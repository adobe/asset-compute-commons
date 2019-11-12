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
const { actionName } = require('../lib/actions');

describe("actions.js - Custom fields removal", function() {
    it('returns empty string (0 length) when nothing is set', function() {
        const name = actionName();
        assert.equal(name, "");
        assert.equal(name.length, 0);
    });

    it('return NUI TEST ENV value in test env)', function() {
        process.env.NUI_UNIT_TEST_MODE = true;

        const name = actionName();
        assert.equal(name, "test_action");

        delete process.env.NUI_UNIT_TEST_MODE;
    });

    it('returns value set as env variable', function() {
        process.env.__OW_ACTION_NAME = 'namespace/package/action';
        let name = actionName();
        assert.equal(name, "action");

        process.env.__OW_ACTION_NAME = 'namespace/package/  ';
        name = actionName();
        assert.equal(name, "  ");

        process.env.__OW_ACTION_NAME = 'namespace/package/\n';
        name = actionName();
        assert.equal(name, "\n");

        delete process.env.__OW_ACTION_NAME;
    });
});
