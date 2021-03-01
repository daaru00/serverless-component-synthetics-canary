const AWS = require('aws-sdk')
const https = require('https')

const agent = new https.Agent({
  keepAlive: true
})

/**
 * Generate a random ID
 */
const randomId = (length = 6) =>
  Math.random()
    .toString(36)
    .substring(length)

/**
 * Sleep for a certain amount of seconds
 * @param {number} seconds
 */
const sleep = async (seconds = 1) =>
  new Promise((resolve) => setTimeout(() => resolve(), seconds * 1000))

/**
 * Console log replacement
 * @param {*} msg
 */
const log = (msg) => console.log(msg) // eslint-disable-line

/**
 * Console error replacement
 * @param {*} msg
 */
const logError = (msg) => console.error(msg) // eslint-disable-line

/**
 * Get AWS SDK Clients
 * @param {object} credentials
 * @param {string} region
 */
const getClients = (credentials, region) => {
  AWS.config.update({
    httpOptions: {
      agent
    },
    credentials,
    region,
    logger: console
  })

  const synthetics = new AWS.Synthetics()
  const s3 = new AWS.S3()
  const iam = new AWS.IAM()
  const sts = new AWS.STS()
  const lambda = new AWS.Lambda()
  return { synthetics, s3, iam, sts, lambda }
}

/**
 * Get caller account
 * @param {AWS.STS} sts
 * @return {string}
 */
const getCallerAccount = async (sts) => {
  const { Account } = await sts.getCallerIdentity().promise()
  return Account
}

/**
 * Prepare inputs
 * @param {object} inputs
 * @param {object} state
 * @param {object} instance
 */
const prepareInputs = (inputs, state, instance) => {
  return {
    name: inputs.name || state.name || `${instance.name}-${randomId()}`,
    artifactBucket: inputs.artifactBucket || null,
    src: inputs.src || null,
    handler: inputs.handler || 'index.handler',
    runtime: inputs.runtime || 'syn-nodejs-puppeteer-3.0',
    region: inputs.region || 'us-east-1',
    roleArn: inputs.roleArn || null,
    env: inputs.env || {},
    tracing: inputs.tracing === true,
    schedule: {
      expression: inputs.schedule ? inputs.schedule.expression : 'rate(0 hour)',
      duration: inputs.schedule ? parseInt(inputs.schedule.duration) : 0
    },
    timeout: inputs.timeout || 840, // default is the maximum value: 14 minutes
    memory: inputs.memory || null,
    retention: {
      failure: inputs.retention && inputs.retention.failure ? inputs.retention.failure : 31,
      success: inputs.retention && inputs.retention.success ? inputs.retention.success : 31
    },
    vpc: {
      securityGroups: inputs.vpc && inputs.vpc.securityGroups ? inputs.vpc.securityGroups : [],
      subnets: inputs.vpc && inputs.vpc.subnets ? inputs.vpc.subnets : []
    },
    tags: inputs.tags || null
  }
}

/**
 * Remove Role
 * @param {AWS.S3} s3
 * @param {string} bucketName
 */
const isBucketExist = async (s3, bucketName) => {
  try {
    await s3
      .headBucket({
        Bucket: bucketName
      })
      .promise()
  } catch (e) {
    if (e.code === 'NotFound') {
      return false
    }
    throw e
  }

  return true
}

/**
 * Exports
 */
module.exports = {
  log,
  logError,
  randomId,
  sleep,
  getClients,
  getCallerAccount,
  isBucketExist,
  prepareInputs
}
