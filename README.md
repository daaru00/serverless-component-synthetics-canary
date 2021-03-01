# AWS CloudWatch Synthetics Canary Component 

This component create an [AWS CloudWatch Synthetics Canary](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html).

## Before Starting

This repository is not part of official [Serverless Components repository](https://github.com/serverless/components).
This is an experimental component built following "Building Components" section guide.

## Getting Started

For more information about Serverless Components follow [official guide](https://github.com/serverless/components).

### 1. Install

To get started with component, install the latest version of the Serverless Framework:

```
$ npm install -g serverless
```

### 2. Credentials

Create a new `.env` file in the root of the `aws-synthetics-canary` directory right next to `serverless.yml`, and add your AWS access keys:

```
# .env
AWS_ACCESS_KEY_ID=XXX
AWS_SECRET_ACCESS_KEY=XXX
```

### 3. Configure

Here's a complete reference of the `serverless.yml` file for the `aws-synthetics-canary` component:

```yml
# serverless.yml

component: aws-synthetics-canary # (required) name of the component. In that case, it's aws-synthetics-canary.
name: my-test                    # (required) name of your component instance.
org: daaru                       # (optional) serverless dashboard org. default is the first org you created during signup.
app: myApp                       # (optional) serverless dashboard app. default is the same as the name property.
stage: dev                       # (optional) serverless dashboard stage. default is 'dev'.

inputs:
  region: us-east-1                    # (optional) AWS region. default is 'us-east-1'.
  artifactBucket: 'my-artifcat-bucket' # (required) S3 bucket to store tests artifact.
  src: './src'                         # (required) source code location.
  handler: 'index.handler'             # (optional) source code entrypoint with format <filename without extension>.<exported function>. default is 'index.handler'.
  runtime: 'syn-nodejs-puppeteer-3.0'  # (optional) Canary runtime version.
  roleArn: arn:aws:abc                 # (optional) custom role arn.
  timeout: 300                         # (optional) timeout in seconds. default is Canary frequency. maximum is 14 minutes.
  memory: 64                           # (optional) memory in MB, multiple of 64. default is 64.
  env:                                 # (optional) env vars.
    FOO: BAR
  tracing: false                       # (optional) active AWS X-Ray tracing when it runs.
  schedule:
    expression: 'rate(0 hour)'         # (optional) schedule expression for canary. default is 'rate(0 hour)' that will execute canary only once when manually runs.
    duration: 0                        # (optional) how long, in seconds, for the canary to continue making regular runs.
  tags:                                # (optional) canary tags.
    foo: bar
    foo1: bar1
  retention:
    failure: 31                        # (optional) retention period for failure results in days. default is 31.
    success: 31                        # (optional) retention period for success results in days. default is 31.
  vpc:
    securityGroups:                    # (optional) VPC security group ids configurations.
      - sg-xxxxxxxxxx
    subnets:                           # (optional) VPC subnet ids configurations.
      - subnet-xxxxxxxxxx
```

Check the latest version of Canary runtime at [AWS documentation page](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_Library.html).

Create a Canary Script into `src` directory named `index.js` and export a `handler` function with test script:
```js
// ./src/index.js

const synthetics = require('Synthetics')
const log = require('SyntheticsLogger')

exports.handler = async () => {
  const page = await synthetics.getPage()
  await page.goto(process.env.ENDPOINT)
  await page.screenshot({ path: '/tmp/example.png' })

  const pageTitle = await page.title()
  log.info('Page title: ' + pageTitle)
}
```
if you want to use a different file or function name change `handler` configuration accordingly.

For more information about test script check [AWS Documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_WritingCanary.html)

### 4. Deploy

Once you have the directory set up, you're now ready to deploy. Just run the following command from within the directory containing the `serverless.yml` file:

```
$ serverless deploy
```

Your first deployment might take a little while, but subsequent deployment would just take few seconds. For more information on what's going on during deployment, you could specify the `--debug` flag, which would view deployment logs in realtime:

```
$ serverless deploy --debug
```

### 5. Info

Anytime you need to know more about your created `aws-synthetics-canary` instance, you can run the following command to view the most info. 

```
$ serverless info
```

### 6. Remove

If you wanna tear down your entire `aws-synthetics-canary` infrastructure that was created during deployment, just run the following command in the directory containing the `serverless.yml` file. 
```
$ serverless remove
```

## Custom Commands

Once the component has been deployed you can run some commands:

### Start

Start deployed Canary:

```
$ serverless start
```

### Stop

Stop deployed Canary:

```
$ serverless start
```

**Note:** Only necessary when using a schedule expression with repeated executions. Otherwise canary will be stopped automatically after the first run after "start" command.

### Results

Retrieve Canary runs results:

```
$ serverless results

outputs:
  - 
    Name:              my-test
    Status: 
      State:           PASSED
      StateReason:     
      StateReasonCode: 
    Timeline: 
      Started:   2020-08-29T08:43:27.000Z
      Completed: 2020-08-29T08:43:28.000Z
    ArtifactS3Location: my-artifcat-bucket/my-test/canary/my-test/successes/2020/08/29/08/43-28-405 
  - 
    Name:              my-test
    Status: 
      State:           FAILED
      StateReason:     "TimeoutError: Navigation Timeout Exceeded: 10000ms exceeded Stack: TimeoutError: Navigation Timeout Exceeded: 10000ms exceeded\n    at Promise.then (/opt/nodejs/node_modules/puppeteer-core/lib/LifecycleWatcher.js:143:21)\n  -- ASYNC --\n    at Frame.<anonymous> (/opt/nodejs/node_modules/puppeteer-core/lib/helper.js:110:27)\n    at Page.goto (/opt/nodejs/node_modules/puppeteer-core/lib/Page.js:656:49)\n    at Page.<anonymous> (/opt/nodejs/node_modules/puppeteer-core/lib/helper.js:111:23)\n    at /opt/nodejs/node_modules/index.js:13:16\n    at Synthetics.executeStep (/opt/nodejs/node_modules/Synthetics.js:254:37)"
      StateReasonCode: CANARY_FAILURE
    Timeline: 
      Started:   2020-08-29T08:28:54.000Z
      Completed: 2020-08-29T08:29:05.000Z
    ArtifactS3Location: my-artifcat-bucket/my-test/canary/my-test/failures/2020/08/29/08/29-05-280
```

### Logs

Get last execution logs:

```
$ serverless logs

outputs:
  Name:              my-test
  Status: 
    State:           PASSED
    StateReason:     
    StateReasonCode: 
  Timeline: 
    Started:   2020-08-29T08:43:27.000Z
    Completed: 2020-08-29T08:43:28.000Z
  ArtifactS3Location: my-artifcat-bucket/my-test/canary/my-test/successes/2020/08/29/08/43-28-405
  Log:
    """
      Start Canary
      INFO: Event: {"canaryName":"my-test","s3BaseFilePath":"my-artifact-bucket/my-test/","customerCanaryHandlerName":"index.handler","customerCanaryCodeLocation":"arn:aws:lambda:us-east-1:000000000000:layer:cwsyn-my-test-90ea20c4-156f-4556-83b1-4f5728208018:2","invocationTime":1598690603341}
      INFO: Context: {"callbackWaitsForEmptyEventLoop":true,"functionVersion":"2","functionName":"cwsyn-my-test-90ea20c4-156f-4556-83b1-4f5728208018","memoryLimitInMB":"1000","logGroupName":"/aws/lambda/cwsyn-my-test-90ea20c4-156f-4556-83b1-4f5728208018","logStreamName":"2020/08/29/[2]cc6c02e601b7458388962f97f6e1a339","invokedFunctionArn":"arn:aws:lambda:us-east-1:000000000000:function:cwsyn-my-test-90ea20c4-156f-4556-83b1-4f5728208018:2","awsRequestId":"6ecbbe03-2c53-4d05-a73b-89da6cefec7e"}
      INFO: Recording configuration: 
      INFO: canaryName: my-test
      INFO: s3BaseFilePath: my-artifact-bucket/my-test/
      INFO: awsAccountId: 000000000000
      INFO: region: us-east-1
      INFO: canaryArn: arn:aws:synthetics:us-east-1:000000000000:canary:my-test
      INFO: memoryLimitInMB: 1000
      INFO: awsRequestId: 6ecbbe03-2c53-4d05-a73b-89da6cefec7e
      INFO: timeRemainingInMillis: 839970
      INFO: Launching Puppeteer browser.
      INFO: Adding CloudWatchSynthetics/arn:aws:synthetics:us-east-1:000000000000:canary:my-test to user agent header sent with each outbound request.
      INFO: Start executing customer steps
      INFO: Customer canary entry file name: "index"
      INFO: Customer canary entry function name: "handler"
      INFO: Calling customer canary: /opt/nodejs/node_modules/index.handler()
      INFO: Request:  url: https://example.com/
      INFO: Response:  status: 200 statusText:  url: https://example.com/
      INFO: Customer canary response: undefined
      INFO: Finished executing customer steps
      INFO: Getting S3 bucket and key to upload files into.
      INFO: s3Bucket: my-artifact-bucket s3Key: my-test/canary/my-test/successes/2020/08/29/08/43-28-405
      INFO: Getting list of files under /tmp to upload to S3.
      
    """
```

## Additional resources

A list of available API for Puppeteer [version v5.5.0](https://github.com/puppeteer/puppeteer/blob/v5.5.0/docs/api.md), the one supported by the latest version Canary runtime version `syn-nodejs-puppeteer-3.0`.

If you want to test Canaries locally refer to [aws-synthetics-local](https://github.com/sixleaveakkm/aws-synthetics-local).
