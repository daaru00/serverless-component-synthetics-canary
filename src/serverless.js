const { Component } = require('@serverless/core')

/**
 * Utils
 */
const { log, sleep, prepareInputs, getClients, getCallerAccount } = require('./utils/general')
const { isBucketExist, listBucketObjects, getBucketObjectContent } = require('./utils/s3')
const { deleteLambda, deleteLayer } = require('./utils/lambda')
const {
  getSyntheticsCanary,
  createSyntheticsCanary,
  updateSyntheticsCanary,
  deleteSyntheticsCanary,
  prepareSourceCode,
  startSyntheticsCanary,
  stopSyntheticsCanary,
  getSyntheticsCanaryRuns
} = require('./utils/canary')
const {
  createPolicy,
  createRole,
  removeRole,
  removePolicy,
  attachRolePolicy,
  detachRolePolicy
} = require('./utils/iam')

/**
 * Component class
 */
class AwsSyntheticsCanary extends Component {
  /**
   * Deploy
   * @param {*} inputs
   */
  async deploy(inputs = {}) {
    // Get AWS clients
    const { synthetics, iam, s3, sts } = getClients(this.credentials.aws, inputs.region)

    // Prepare inputs
    inputs = prepareInputs(inputs, this.state, this)

    // Throw error on name change
    if (this.state.name && inputs.name !== undefined && this.state.name !== inputs.name) {
      throw new Error(
        `Changing the name from ${this.state.name} to ${inputs.name} will delete the AWS Synthetics Canary. Please remove it manually, change the name, then re-deploy.`
      )
    }

    // Throw error on region change
    if (this.state.region && this.state.region !== inputs.region) {
      throw new Error(
        `Changing the region from ${this.state.region} to ${inputs.region} will delete the AWS Synthetics Canary. Please remove it manually, change the region, then re-deploy.`
      )
    }

    // Throw error on bucket change
    if (this.state.artifactBucket && this.state.artifactBucket !== inputs.artifactBucket) {
      throw new Error(
        `Changing the artifact bucket from '${this.state.artifactBucket}' to '${inputs.artifactBucket}' will delete the AWS Synthetics Canary. Please remove it manually, change the region, then re-deploy.`
      )
    }

    // Check artifact s3 bucket
    log('Checking if AWS S3 Bucket ' + inputs.artifactBucket + ' exist..')
    if (!inputs.artifactBucket) {
      throw new Error(`required artifactBucket not set`)
    }
    const bucketExist = await isBucketExist(s3, inputs.artifactBucket)
    if (bucketExist === false) {
      throw new Error(`AWS Bucket '${inputs.artifactBucket}' does not exist`)
    }

    // Check role and policy
    let policy = {}
    let role = {}

    if (typeof inputs.roleArn === 'string' && inputs.roleArn.trim() !== '') {
      // Set role arn
      role = {
        arn: inputs.roleArn
      }
    } else {
      // Check policy arn
      const accountId = await getCallerAccount(sts)
      log('Checking if IAM Policy exist..')
      policy = await createPolicy(
        iam,
        this.state.policyName || `CloudWatchSyntheticsPolicy-${inputs.name}`,
        inputs,
        accountId
      )

      // Check role arn
      log('Checking if IAM Role exist..')
      role = await createRole(iam, this.state.roleName || `CloudWatchSyntheticsRole-${inputs.name}`)

      // Attach policy to role
      if (policy.isNew || role.isNew) {
        log('Checking if IAM Policy is attached to IAM Role..')
        await attachRolePolicy(iam, policy.name, role.name, accountId)

        // Workaround for issue "The role defined for the function cannot be assumed by Lambda"
        await sleep(6)
      }
    }

    // Check previous canary
    let prevCanary = null
    log(
      'Checking if an AWS Synthetics Canary has already been created with name: ' +
        inputs.name +
        '..'
    )
    prevCanary = await getSyntheticsCanary(synthetics, inputs.name, inputs.format)

    // Check required inputs
    if (!inputs.schedule || !inputs.schedule.expression) {
      throw new Error(`required schedule.expression not set`)
    }

    // Prepare code path
    inputs.src = await prepareSourceCode(this, inputs.src)

    // Deploy
    if (prevCanary === null) {
      log('Creating new Synthetics Canary..')
      await createSyntheticsCanary(synthetics, inputs, role.arn)
      log('Synthetics Canary created!')
    } else {
      log('Updating existing Synthetics Canary..')
      await updateSyntheticsCanary(synthetics, inputs, role.arn)
      log('Synthetics Canary updated!')
    }

    // Update state
    this.state = await getSyntheticsCanary(synthetics, inputs.name, inputs.format)
    this.state.region = inputs.region
    this.state.policyName = policy.name
    this.state.roleName = role.name

    // Export outputs
    return this.state
  }

  /**
   * Remove
   * @param {*} inputs
   */
  async remove() {
    const canaryName = this.state.name
    if (!canaryName) {
      log('No components found. Components seems already removed.')
      return {}
    }

    // Retrieve data
    const { synthetics, iam, sts, lambda } = getClients(this.credentials.aws, this.state.region)

    // Delete canary
    log('Removing AWS Synthetics Canary..')
    await deleteSyntheticsCanary(synthetics, canaryName)

    // Detach policy to role
    let accountId = null
    if (this.state.policyName && this.state.roleName) {
      accountId = await getCallerAccount(sts)
      await detachRolePolicy(iam, this.state.policyName, this.state.roleName, accountId)
    }

    // Delete Policy if created
    if (this.state.policyName) {
      log('Removing AWS IAM Policy..')
      await removePolicy(iam, this.state.policyName, accountId)
      log('AWS IAM Policy removed!')
    }

    // Delete Role if created
    if (this.state.roleName) {
      log('Removing AWS IAM Role..')
      await removeRole(iam, this.state.roleName)
      log('AWS IAM Role removed!')
    }

    // Delete Lambda
    log('Removing AWS Lambda..')
    await deleteLambda(lambda, this.state.name, this.state.id)
    log('AWS Lambda removed!')

    // Delete Lambda Layer
    log('Removing AWS Lambda Layer..')
    await deleteLayer(lambda, this.state.name, this.state.id)
    log('AWS Lambda Layer removed!')

    this.state = {}
    return {}
  }

  /**
   * Start canary execution
   */
  async start() {
    // Check if canary is already been deployed
    const canaryName = this.state.name
    if (!canaryName) {
      log('No components found. Components seems not been deployed yet.')
      return
    }

    // Get AWS clients
    const { synthetics } = getClients(this.credentials.aws, this.state.region)

    // Start canary
    log('Starting Synthetics Canary..')
    await startSyntheticsCanary(synthetics, canaryName)
    log('Synthetics Canary started!')

    return {}
  }

  /**
   * Stop canary execution
   */
  async stop() {
    // Check if canary is already been deployed
    const canaryName = this.state.name
    if (!canaryName) {
      log('No components found. Components seems not been deployed yet.')
      return
    }

    // Get AWS clients
    const { synthetics } = getClients(this.credentials.aws, this.state.region)

    // Stop canary
    log('Stopping Synthetics Canary..')
    await stopSyntheticsCanary(synthetics, canaryName)
    log('Synthetics Canary stopped!')

    return {}
  }

  /**
   * List canary runs results
   */
  async results() {
    // Check if canary is already been deployed
    const canaryName = this.state.name
    if (!canaryName) {
      log('No components found. Components seems not been deployed yet.')
      return
    }

    // Get AWS clients
    const { synthetics } = getClients(this.credentials.aws, this.state.region)

    // Retrieve canary runs
    log('Retrieving Synthetics Canary runs..')
    const runs = await getSyntheticsCanaryRuns(synthetics, canaryName)
    log('Canary runs retrieved!')

    // Export last 5 runs
    return {
      outputs: runs.slice(0, 5)
    }
  }

  /**
   * Show Canary Lambda Function logs
   */
  async logs() {
    // Check if canary is already been deployed
    const canaryName = this.state.name
    if (!canaryName) {
      log('No components found. Components seems not been deployed yet.')
      return
    }

    // Get AWS clients
    const { synthetics, s3 } = getClients(this.credentials.aws, this.state.region)

    // Retrieve canary runs
    log('Retrieving Synthetics Canary runs..')
    const runs = await getSyntheticsCanaryRuns(synthetics, canaryName)
    log('Canary runs retrieved!')

    // Is no runs found skipping execution
    if (runs.length === 0) {
      log('No Canary runs found.')
      return {}
    }

    // Retrieve last execution logs
    const lastRun = runs[0]
    log('Retrieving Synthetics Canary run logs..')
    const bucketName = lastRun.ArtifactS3Location.split('/')[0]
    const artifactObjects = await listBucketObjects(
      s3,
      bucketName,
      lastRun.ArtifactS3Location.substr(bucketName.length + 1)
    )

    // Find .txt log file
    const logObjectKey = artifactObjects.find((objectKey) => objectKey.endsWith('.txt'))
    if (!logObjectKey) {
      log('No txt log found in artifact bucket location.')
      return {}
    }

    // Get Log file content
    const logs = await getBucketObjectContent(s3, bucketName, logObjectKey)

    // Export last run with logs
    return {
      outputs: {
        ...lastRun,
        Log: logs.toString()
      }
    }
  }
}

module.exports = AwsSyntheticsCanary
