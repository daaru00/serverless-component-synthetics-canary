// eslint-disable-next-line no-unused-vars
const AWS = require('aws-sdk')

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
 * List Objects file content
 *
 * @param {AWS.S3} s3
 * @param {string} bucketName
 * @param {string} prefix
 */
const listBucketObjects = async (s3, bucketName, prefix) => {
  let objects = []
  try {
    const { Contents } = await s3
      .listObjects({
        Bucket: bucketName,
        Prefix: prefix
      })
      .promise()
    objects = Contents
  } catch (e) {
    if (e.code === 'NotFound') {
      return ''
    }
    throw e
  }

  // Return only keys
  return objects.map((object) => object.Key)
}

/**
 * Get Object file content
 *
 * @param {AWS.S3} s3
 * @param {string} bucketName
 * @param {string} objectKey
 */
const getBucketObjectContent = async (s3, bucketName, objectKey) => {
  let object = null
  try {
    object = await s3
      .getObject({
        Bucket: bucketName,
        Key: objectKey
      })
      .promise()
  } catch (e) {
    if (e.code === 'NotFound') {
      return ''
    }
    throw e
  }

  return object ? object.Body : ''
}

/**
 * Exports
 */
module.exports = {
  isBucketExist,
  listBucketObjects,
  getBucketObjectContent
}
