const { getClients } = require('../src/utils/general')
const { getSyntheticsCanary } = require('../src/utils/canary')
const { getServerlessSdk, getCredentials, getCommonConfig } = require('./utils')

// set enough timeout for deployment to finish
jest.setTimeout(60 * 1000)

// configurations
const slsConfig = {
  debug: true
}

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

it('should successfully deploy synthetics canary', async () => {
  const instance = await sdk.deploy(instanceYaml, credentials, slsConfig)
  expect(instance.outputs.name).toBeDefined()

  const canary = await getSyntheticsCanary(synthetics, instance.outputs.name)
  expect(canary).not.toBeNull()
  expect(canary.name).toEqual(instance.outputs.name)
})
