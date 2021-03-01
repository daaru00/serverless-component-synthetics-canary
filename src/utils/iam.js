// eslint-disable-next-line no-unused-vars
const AWS = require('aws-sdk')

/**
 * Create policy
 * @param {AWS.IAM} iam
 * @param {string} policyName
 * @param {object} inputs
 * @param {string} accountId
 */
const createPolicy = async (iam, policyName, inputs, accountId) => {
  let isNew = false
  let policyArn = null

  try {
    policyArn = `arn:aws:iam::${accountId}:policy/${policyName}`
    const { Policy } = await iam
      .getPolicy({
        PolicyArn: policyArn
      })
      .promise()
    policyArn = Policy.Arn
  } catch (e) {
    if (e.code !== 'NoSuchEntity') {
      throw e
    }
    policyArn = null
  }

  if (!policyArn) {
    const { Policy } = await iam
      .createPolicy({
        PolicyName: policyName,
        PolicyDocument: `{
          "Version": "2012-10-17",
          "Statement": [{
            "Effect": "Allow",
            "Action": [
              "s3:PutObject",
              "s3:GetBucketLocation"
            ],
            "Resource": [
              "arn:aws:s3:::${inputs.artifactBucket}",
              "arn:aws:s3:::${inputs.artifactBucket}/*"
            ]
          },
          {
            "Effect": "Allow",
            "Action": [
              "logs:CreateLogStream",
              "logs:PutLogEvents",
              "logs:CreateLogGroup"
            ],
            "Resource": [
              "arn:aws:logs:${inputs.region}:${accountId}:log-group:/aws/lambda/cwsyn-${inputs.name}-*"
            ]
          },
          {
            "Effect": "Allow",
            "Action": [
              "s3:ListAllMyBuckets"
            ],
            "Resource": [
              "*"
            ]
          },
          {
            "Effect": "Allow",
            "Resource": "*",
            "Action": "cloudwatch:PutMetricData",
            "Condition": {
              "StringEquals": {
                "cloudwatch:namespace": "CloudWatchSynthetics"
              }
            }
          }
        ]}`
      })
      .promise()
    policyArn = Policy.Arn
    isNew = true
  }

  return {
    name: policyName,
    arn: policyArn,
    isNew
  }
}

/**
 * Get role arn
 * @param {AWS.IAM} iam
 * @param {string} roleName
 */
const createRole = async (iam, roleName) => {
  let isNew = false
  let roleArn = null

  try {
    const { Role } = await iam
      .getRole({
        RoleName: roleName
      })
      .promise()
    roleArn = Role.Arn
  } catch (e) {
    if (e.code !== 'NoSuchEntity') {
      throw e
    }
    roleArn = null
  }

  if (!roleArn) {
    const { Role } = await iam
      .createRole({
        RoleName: roleName,
        AssumeRolePolicyDocument: `{
          "Version": "2012-10-17",
          "Statement": [{
            "Effect": "Allow",
            "Principal": {
              "Service": [
                "lambda.amazonaws.com"
              ]
            },
            "Action": [
              "sts:AssumeRole"
            ]
          }]
        }`
      })
      .promise()
    roleArn = Role.Arn
    isNew = true
  }

  return {
    name: roleName,
    arn: roleArn,
    isNew
  }
}

/**
 * Attach role policy
 * @param {AWS.IAM} iam
 * @param {string} policyName
 * @param {string} roleName
 * @param {string} accountId
 */
const attachRolePolicy = async (iam, policyName, roleName, accountId) => {
  await iam
    .attachRolePolicy({
      PolicyArn: `arn:aws:iam::${accountId}:policy/${policyName}`,
      RoleName: roleName
    })
    .promise()
}

/**
 * Detach role policy
 * @param {AWS.IAM} iam
 * @param {string} policyName
 * @param {string} roleName
 * @param {string} accountId
 */
const detachRolePolicy = async (iam, policyName, roleName, accountId) => {
  try {
    await iam
      .detachRolePolicy({
        PolicyArn: `arn:aws:iam::${accountId}:policy/${policyName}`,
        RoleName: roleName
      })
      .promise()
  } catch (e) {
    if (e.code !== 'NoSuchEntity') {
      throw e
    }
  }
}

/**
 * Remove policy
 * @param {AWS.IAM} iam
 * @param {string} policyName
 * @param {object} inputs
 * @param {string} accountId
 */
const removePolicy = async (iam, policyName, accountId) => {
  try {
    await iam
      .deletePolicy({
        PolicyArn: `arn:aws:iam::${accountId}:policy/${policyName}`
      })
      .promise()
  } catch (e) {
    if (e.code !== 'NoSuchEntity') {
      throw e
    }
  }
}

/**
 * Remove Role
 * @param {AWS.IAM} iam
 * @param {string} roleName
 */
const removeRole = async (iam, roleName) => {
  try {
    await iam
      .deleteRole({
        RoleName: roleName
      })
      .promise()
  } catch (e) {
    if (e.code !== 'NoSuchEntity') {
      throw e
    }
  }
}

/**
 * Exports
 */
module.exports = {
  createPolicy,
  createRole,
  attachRolePolicy,
  detachRolePolicy,
  removeRole,
  removePolicy
}
