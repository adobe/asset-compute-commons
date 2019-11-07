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

// classes
const AssetComputeEvents = require('./lib/events');
const AssetComputeMetrics = require('./lib/metrics');
const AssetComputeErrors = require('./lib/errors');

// shared functions
const { actionName } = require('./lib/actions');
const {redactCredentials, redact} = require('./lib/filters');


module.exports = {
  // shared <<static>> functions
  actionName,
  redactCredentials,
  redact,

  // classes
  AssetComputeEvents,
  AssetComputeMetrics,
  ...AssetComputeErrors
};