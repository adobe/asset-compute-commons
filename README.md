<!--- when a new release happens, the VERSION and URL in the badge have to be manually updated because it's a private registry --->
[![npm version](https://img.shields.io/badge/%40nui%2Fasset--compute--commons-15.0.0-blue.svg)](https://artifactory.corp.adobe.com/artifactory/npm-nui-release/@nui/asset-compute-commons/-/@nui/asset-compute-commons-15.0.0.tgz)

- [asset-compute-commons](#asset-compute-commons)
	- [Installation](#installation)
	- [API Details](#api-details)
		- [Asset Compute Events](#asset-compute-events)
			- [Constructor parameters](#constructor-parameters)
			- [Sending Events](#sending-events)
			- [Examples](#examples)
		- [Asset Compute Metrics](#asset-compute-metrics)
			- [Constructor parameters](#constructor-parameters-1)
			- [Simple example](#simple-example)
			- [Other additional functions](#other-additional-functions)
		- [Asset Compute Errors](#asset-compute-errors)
			- [Error types](#error-types)
			- [Error Properties](#error-properties)
			- [Custom Errors](#custom-errors)
			- [Examples](#examples-1)
		- [Asset Compute Log Utils](#asset-compute-log-utils)
			- [Examples](#examples-2)
		- [Apache OpenWhisk Action Name](#apache-openwhisk-action-name)
			- [Properties (all default to empty strings)](#properties-all-default-to-empty-strings)
			- [Examples:](#examples-3)
		- [Contributing](#contributing)
		- [Licensing](#licensing)

# asset-compute-commons
Common utilities needed by all Asset Compute serverless actions

## Installation
```bash
npm install @adobe/asset-compute-commons
```
## API Details
Asset Compute commons contains many different libraries that take care of common functionalities for workers like Adobe IO Events, New Relic metrics, and custom errors.
### Asset Compute Events
Asset Compute event handler for sending Adobe IO Events

#### Constructor parameters
_`AssetComputeEvents` constructor supports the following mandatory parameters:_
- **params**: object must contain authorization parameters:
	- `auth.accessToken`
	- `orgId` or `auth.orgId`
	- `clientId` or `auth.clientId`

_`AssetComputeEvents` constructor supports the following optional parameters:_
- **retry**: retry options from [node-fetch-retry](https://github.com/adobe/node-fetch-retry#optional-custom-parameters) for sending IO events. (defaults to `node-fetch-retry` default options)

#### Sending Events
The `sendEvent` method sends an Adobe IO Event.

`AssetComputeEvents.sendEvent` method takes in two required parameters: `type` and `payload`.
- **type**: String containing the Adobe IO Event type (either `rendition_created` or `rendition_failed`)
- **payload**: Object containing the event payload
<!-- assuming we OS the api document below -->
_see [Asset Compute API Document: Asynchronous Events](https://git.corp.adobe.com/nui/nui/blob/master/doc/api.md#asynchronous-events) for more on this topic_

#### Examples
Example with custom retry options:
```js
const { AssetComputeEvents } = require('@adobe/asset-compute-commons');

const params = {
	auth: {
		accessToken: '12345',
		orgId: 'orgId',
		clientId: 'clientId`
	}
}
const retry = {
	retryMaxDuration: 1000 // in ms
}
const eventsHandler  = new AssetComputeEvents(params, retry);

await eventsHandler.sendEvent('rendition_created', {
            rendition: {
				name: 'rendition.jpg',
				fmt: 'jpg'
			}
      });
```

Example with a `rendition_failed` event type:
```js
const { AssetComputeEvents } = require('@adobe/asset-compute-commons');

const params = {
	auth: {
		accessToken: '12345',
		orgId: 'orgId',
		clientId: 'clientId`
	}
}
const eventsHandler  = new AssetComputeEvents(params);

await eventsHandler.sendEvent('rendition_failed', {
            rendition: {
				name: 'rendition.21',
				fmt: '21'
			},
			errorReason: 'RenditionFormatUnsupported',
			errorMessage: 'Rendition format `21` is not supported'
     });
```

### Asset Compute Metrics
Asset Compute metrics handler for sending New Relic metrics. It uses a node js agent [node-openwhisk-newrelic](https://github.com/adobe/node-openwhisk-newrelic) to send metrics to New Relic.

#### Constructor parameters
_`AssetComputeMetrics` constructor supports the following mandatory parameters:_
- **params**: Object must contain New Relic metrics parameters:
	- `newRelicEventsURL`: New Relic Insights Events url (should be of the form: `https://insights-collector.newrelic.com/v1/accounts/<YOUR_ACOUNT_ID>/events`)
	- `newRelicApiKey`: New Relic Insights API key (see the "Register an Insert API key" section [here](https://docs.newrelic.com/docs/insights/insights-data-sources/custom-data/introduction-event-api))

_`AssetComputeMetrics` constructor supports the following optional parameters:_
- **options**: Other New Relic metric options supported by [node-openwhisk-newrelic](https://github.com/adobe/node-openwhisk-newrelic/blob/master/lib/newrelic.js#L35-L45)



#### Simple example
Initiates metrics handler, sends metrics and stops metrics agent:
```js
const { AssetComputeMetrics } = require('@adobe/asset-compute-commons');

const params = {
	newRelicEventsURL: 'https://insights-collector.newrelic.com/v1/accounts/<YOUR_ACOUNT_ID>/events',
	newRelicApiKey: 'YOUR_API_KEY',
	// ... rest of the Asset Compute parameters

}
const metricsHandler = new AssetComputeMetrics(params);
const metrics = {
	downloadDuration: 200,
	size: 3000
}
await metricsHandler.sendMetrics('rendition', metrics);
await metricsHandler.activationFinished(); // see https://github.com/adobe/node-openwhisk-newrelic#usage for information about `activationFinished()`
```

#### Other additional functions
Adding custom metrics:
```js
metricsHandler.add({
	uuid: '12345',
	count: 2
});
```

Get current state of `metrics`:
```js
console.log(metricsHandler.get()); // should print out metrics added in `metricsHandler.add()`
```

Sending error metrics (sends metrics with event type `error`):
```js
const location = 'upload_worker_flite';
const message = 'Invalid file format';
const metrics = {
	downloadDuration: 200,
	size: 3000
}
await metricsHandler.sendErrorMetrics(location, message, metrics);
```

Sending client error metrics (sends metrics with event type `client_error`):
```js
const location = 'upload_worker_flite';
const message = 'Invalid file format';
const metrics = {
	downloadDuration: 200,
	size: 3000
}
await metricsHandler.sendClientErrorMetrics(location, message, metrics);
```

Sending error metrics by exceptions thrown (sends metrics with event type `client_error` or `error` depending on the error):
```js
foo() {
	try {
		console.log('hello!');
	} catch (error) {
		metricsHandler.handleError(error, {
			location: "mylocation",
			message: "something failed",
			metrics: {}
		});
	}
}
```

### Asset Compute Errors

There are several custom errors used in Asset Compute workers:
#### Error types
| Type | Description | Properties |
| ---- | ----------- | ---------- |
| `error` | unexpected errors and exceptions | `message`, `date`, `location` |
| `client_error` | errors caused by client misconfiguration | `message`, `date`, `reason` |

#### Error Properties
- `message`: error message
- `date`: current time in UTC of when the error was thrown
- `location`: location where the error took place (only in type `error`)
- `reason`: the reason for the error (only in client errors)
	- must be one of list: "SourceFormatUnsupported", "RenditionFormatUnsupported", "SourceUnsupported", "SourceCorrupt", "RenditionTooLarge"
}

#### Custom Errors
| Name  | Description | Type |
|--------|-------------|
| `SourceFormatUnsupportedError` | The source is of an unsupported type. | client error |
| `RenditionFormatUnsupportedError` | The requested format is unsupported. | client error |
| `SourceUnsupportedError` | The specific source is unsupported even though the type is supported. | client error |
| `SourceCorruptError` | The source data is corrupt.  Includes empty files. | client error |
| `RenditionTooLargeError` | The rendition could not be uploaded using the pre-signed URL(s) provided in `target`. The actual rendition size is available as metadata in `repo:size` and can be used by the client to re-process this rendition with the right number of pre-signed URLs. | client error |
| `ArgumentError` | Wrong arguments (type, structure, etc.) | error |
| `GenericError` | Any other error. | error |

#### Examples
Generic error downloading the source file in action `worker-pie`:
```js
const { GenericError } = require('@adobe/asset-compute-commons');

const message = 'Error while downloading source file!'
const location = 'download_worker_pie'
throw new GenericError(message, location);
```

Rendition format is unsupported:
```js
const { RenditionFormatUnsupportedError } = require('@adobe/asset-compute-commons');

const message = 'Rendition format `sdfg` is not supported'
throw new RenditionFormatUnsupportedError(message);
```

### Asset Compute Log Utils

Utilities for removing sensitive information from Asset Compute worker logs

#### Examples
Redacting access token from logs:
```js
const { AssetComputeLogUtils } = require('@nui/asset-compute-commons');

params = {
	accessToken: '123453467',
	fmt: 200
}
console.log("Asset Compute parameters:", AssetComputeLogUtils.redactUrl(params)); // should replace access token with "[...REDACTED...]"

```

Prints out exact same logs using `AssetComputeLogUtils.log` method:
```js
const { AssetComputeLogUtils } = require('@nui/asset-compute-commons');

params = {
	accessToken: '123453467',
	fmt: 200
}
AssetComputeLogUtils.log(params, "Asset Compute parameters"); // should replace access token with "[...REDACTED...]"

```

### Apache OpenWhisk Action Name

A simple way to get information about the Apache OpenWhisk action.

#### Properties (all default to empty strings)
- name: base  Apache OpenWhisk action name
- package: Apache OpenWhisk package name
- namespace: Apache OpenWhisk namespace
- fullname: full  Apache OpenWhisk action name, including namespace, package and action name from environment variable `__OW_ACTION_NAME`

#### Examples:
```js
const actionInfo = new OpenwhiskActionName();
console.log(actionInfo.name) // prints out something like `worker-pie`
console.log(actionInfo.package) // prints package name, ex: `experimental`
console.log(actionInfo.namespace) // prints namespace, ex: `stage`
console.log(actionInfo.fullname) // prints full name, ex: /stage/experimental/worker-pie
```

### Contributing
Contributions are welcomed! Read the [Contributing Guide](./.github/CONTRIBUTING.md) for more information.

### Licensing
This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.
