// eslint-disable-next-line no-unused-vars
const AWS = require('aws-sdk')
const path = require('path')
const { readFileSync, renameSync, mkdirSync } = require('fs')
const { sleep } = require('./general')

/**
 * Get Synthetics Canary
 * @param {AWS.Synthetics} synthetics
 * @param {string} canaryName
 * @returns {object|null}
 */
const getSyntheticsCanary = async (synthetics, canaryName) => {
  if (!canaryName) {
    return null
  }
  try {
    const { Canary } = await synthetics
      .getCanary({
        Name: canaryName
      })
      .promise()

    return {
      id: Canary.Id,
      name: Canary.Name,
      artifactBucketArn: Canary.ArtifactS3Location,
      runtime: Canary.RuntimeVersion,
      status: Canary.Status.State,
      statusReason: Canary.Status.StateReason || ''
    }
  } catch (e) {
    if (e.code === 'ResourceNotFoundException') {
      return null
    }
    throw e
  }
}

/**
 * Prepare source code to be compatible with lambda layer
 * @param {object} instance
 * @param {string} src
 * @returns {string}
 */
const prepareSourceCode = async (instance, src) => {
  const sourceDirectory = await instance.unzip(src)

  const layerPath = path.join('/tmp', 'layer')
  mkdirSync(layerPath)
  mkdirSync(path.join(layerPath, 'nodejs'))
  renameSync(sourceDirectory, path.join(layerPath, 'nodejs', 'node_modules'))

  return await instance.zip(layerPath)
}

/**
 * Create a new Synthetics Canary
 * @param {AWS.Synthetics} synthetics
 * @param {object} inputs
 * @param {string} executionRoleArn
 * @returns {object}
 */
const createSyntheticsCanary = async (synthetics, inputs, executionRoleArn) => {
  await synthetics
    .createCanary({
      Name: inputs.name,
      RuntimeVersion: inputs.runtime,
      ExecutionRoleArn: executionRoleArn,
      Schedule: {
        Expression: inputs.schedule.expression,
        DurationInSeconds: inputs.schedule.duration
      },
      ArtifactS3Location: `s3://${inputs.artifactBucket}/${inputs.name}/`,
      Code: {
        Handler: inputs.handler,
        ZipFile: await readFileSync(inputs.src)
      },
      RunConfig: {
        TimeoutInSeconds: inputs.timeout,
        MemoryInMB: inputs.memory,
        EnvironmentVariables: inputs.env,
        ActiveTracing: inputs.tracing
      },
      FailureRetentionPeriodInDays: inputs.retention.failure,
      SuccessRetentionPeriodInDays: inputs.retention.success,
      // VpcConfig: {
      //   SecurityGroupIds: inputs.vpc.securityGroups,
      //   SubnetIds: inputs.vpc.subnets
      // },
      Tags: inputs.tags
    })
    .promise()

  // sleep until canary is fully created
  let canary
  do {
    await sleep(1)
    canary = await getSyntheticsCanary(synthetics, inputs.name)
  } while (canary.status === 'CREATING')

  return canary
}

/**
 * Update existing Synthetics Canary
 * @param {AWS.Synthetics} synthetics
 * @param {object} inputs
 * @param {string} executionRoleArn
 */
const updateSyntheticsCanary = async (synthetics, inputs, executionRoleArn) => {
  await synthetics
    .updateCanary({
      Name: inputs.name,
      RuntimeVersion: inputs.runtime,
      ExecutionRoleArn: executionRoleArn,
      Schedule: {
        Expression: inputs.schedule.expression,
        DurationInSeconds: inputs.schedule.duration
      },
      Code: {
        Handler: inputs.handler,
        ZipFile: await readFileSync(inputs.src)
      },
      RunConfig: {
        TimeoutInSeconds: inputs.timeout,
        MemoryInMB: inputs.memory,
        EnvironmentVariables: inputs.env,
        ActiveTracing: inputs.tracing
      },
      FailureRetentionPeriodInDays: inputs.retention.failure,
      SuccessRetentionPeriodInDays: inputs.retention.success
      // VpcConfig: {
      //   SecurityGroupIds: inputs.vpc.securityGroups,
      //   SubnetIds: inputs.vpc.subnets
      // }
    })
    .promise()

  // sleep until canary is fully created
  let canary
  do {
    await sleep(1)
    canary = await getSyntheticsCanary(synthetics, inputs.name)
  } while (canary.status === 'UPDATING')

  return canary
}

/**
 * Run canary
 * @param {AWS.Synthetics} synthetics
 */
const startSyntheticsCanary = async (synthetics, canaryName) => {
  await synthetics
    .startCanary({
      Name: canaryName
    })
    .promise()

  // sleep until canary is running
  let status
  do {
    await sleep(1)
    const { Canary } = await synthetics
      .getCanary({
        Name: canaryName
      })
      .promise()
    status = Canary.Status
  } while (status === 'STARTING')
}

/**
 * Stop canary
 * @param {AWS.Synthetics} synthetics
 */
const stopSyntheticsCanary = async (synthetics, canaryName) => {
  await synthetics
    .stopCanary({
      Name: canaryName
    })
    .promise()

  // sleep until canary is stopped
  let status
  do {
    await sleep(1)
    const { Canary } = await synthetics
      .getCanary({
        Name: canaryName
      })
      .promise()
    status = Canary.Status
  } while (status === 'STOPPING')
}

/**
 * Get canary runs results
 * @param {AWS.Synthetics} synthetics
 */
const getSyntheticsCanaryRuns = async (synthetics, canaryName) => {
  let { CanaryRuns } = await synthetics
    .getCanaryRuns({
      Name: canaryName
    })
    .promise()
  CanaryRuns = CanaryRuns || []

  return CanaryRuns.sort(
    (firstElem, secondElem) => firstElem.Timeline.Completed > secondElem.Timeline.Completed
  )
}

/**
 * Delete existing Synthetics Canary
 * @param {AWS.Synthetics} synthetics
 * @param {string} canaryName
 */
const deleteSyntheticsCanary = async (synthetics, canaryName) => {
  let canary = await getSyntheticsCanary(synthetics, canaryName)
  if (canary === null) {
    return
  }

  // stop canary
  if (canary.status === 'RUNNING') {
    await stopSyntheticsCanary(synthetics, canaryName)
  }

  // delete canary
  await synthetics
    .deleteCanary({
      Name: canaryName
    })
    .promise()

  // sleep until canary is fully deleted
  do {
    await sleep(1)
    canary = await getSyntheticsCanary(synthetics, canaryName)
  } while (canary !== null && canary.status === 'DELETING')

  return canary
}

/**
 * Exports
 */
module.exports = {
  prepareSourceCode,
  getSyntheticsCanary,
  createSyntheticsCanary,
  updateSyntheticsCanary,
  startSyntheticsCanary,
  stopSyntheticsCanary,
  getSyntheticsCanaryRuns,
  deleteSyntheticsCanary
}
