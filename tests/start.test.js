const { getClients, sleep } = require('../src/utils/general')
const {
  startSyntheticsCanary,
  getSyntheticsCanary,
  getSyntheticsCanaryRuns
} = require('../src/utils/canary')
const { getServerlessSdk, getCredentials, getCommonConfig } = require('./utils')

// set enough timeout for deployment to finish
jest.setTimeout(60 * 1000)

// get aws credentials from env
const credentials = getCredentials()
const { synthetics } = getClients(credentials.aws, process.env.SERVERLESS_REGION)

/**
 * Initial component configuration
 */
const instanceYaml = getCommonConfig()

// get serverless access key from env and construct sdk
const sdk = getServerlessSdk(instanceYaml.org)

/**
 * Tests
 */

it('should successfully execute synthetics canary', async () => {
  const { instance } = await sdk.getInstance(
    instanceYaml.org,
    instanceYaml.stage,
    instanceYaml.app,
    instanceYaml.name
  )

  // start canary
  await startSyntheticsCanary(synthetics, instance.outputs.name)

  // wait until execution ends
  let canary = null
  do {
    canary = await getSyntheticsCanary(synthetics, instance.outputs.name)
    sleep(1)
  } while (canary.status !== 'STOPPED')

  // Get canary runs
  const runs = await getSyntheticsCanaryRuns(synthetics, instance.outputs.name)
  const lastRun = runs.pop()

  expect(lastRun.Status.State).toBe('PASSED')
  expect(lastRun.Status.State).not.toBe('FAILED')
})
