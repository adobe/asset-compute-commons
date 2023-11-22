/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

'use strict';

const crypto = require('crypto');

function generateHMACSignature(data, privateKey) {
    const sign = crypto.createSign('RSA-SHA256');
    sign.write(data);
    sign.end();
    const signature = sign.sign(privateKey, 'base64');
    return signature;
}

function verifyHMACSign(data, signature, pubKey) {
    const verify = crypto.createVerify('RSA-SHA256');
    verify.write(data);
    verify.end();
    const verified = verify.verify(pubKey, signature, 'base64');
    return verified;
}


module.exports = {
    generateHMACSignature,
    verifyHMACSign
};
