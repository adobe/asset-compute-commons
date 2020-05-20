/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

'use strict';

const assert = require('assert');
const AssetComputeErrors = require("../lib/errors");

describe("index.js", function() {

    it("should export all API", function() {
        const commons = require("../index");

        assert.strictEqual(typeof commons.OpenwhiskActionName, "function");
        assert.strictEqual(typeof commons.AssetComputeLogUtils, "function");
        assert.strictEqual(typeof commons.AssetComputeEvents, "function");
        assert.strictEqual(typeof commons.AssetComputeMetrics, "function");
        Object.keys(AssetComputeErrors).forEach(key => {
            assert.strictEqual(commons[key], AssetComputeErrors[key]);
        });
        assert.strictEqual(typeof commons.actionWrapper, "function");
        assert.strictEqual(typeof commons.MetricsTestHelper, "object");
    });
});