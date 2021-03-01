// eslint-disable-next-line no-unused-vars
const AWS = require('aws-sdk')

/**
 * Remove connected Lambda
 * @param {require('aws-sdk').Lambda} lambda
 * @param {string} canaryName
 * @param {string} canaryId
 * @returns {object|null}
 */
const deleteLambda = async (lambda, canaryName, canaryId) => {
  try {
    await lambda
      .deleteFunction({
        FunctionName: `cwsyn-${canaryName}-${canaryId}`
      })
      .promise()
  } catch (e) {
    if (e.code !== 'ResourceNotFoundException') {
      throw e
    }
  }
}

/**
 * Remove connected Lambda Layer
 * @param {AWS.Lambda} lambda
 * @param {string} canaryName
 * @param {string} canaryId
 * @returns {object|null}
 */
const deleteLayer = async (lambda, canaryName, canaryId) => {
  let versions = []
  try {
    const { LayerVersions } = await lambda
      .listLayerVersions({
        LayerName: `cwsyn-${canaryName}-${canaryId}`
      })
      .promise()
    versions = LayerVersions
  } catch (e) {
    if (e.code === 'ResourceNotFoundException') {
      return
    }
    throw e
  }

  for (const version of versions) {
    await lambda
      .deleteLayerVersion({
        LayerName: `cwsyn-${canaryName}-${canaryId}`,
        VersionNumber: version.Version
      })
      .promise()
  }
}

/**
 * Exports
 */
module.exports = {
  deleteLambda,
  deleteLayer
}
