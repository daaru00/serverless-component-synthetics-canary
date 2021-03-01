const synthetics = require('Synthetics')
const log = require('SyntheticsLogger')

exports.handler = async () => {
  const page = await synthetics.getPage()
  await page.goto(process.env.ENDPOINT)
  await page.screenshot({ path: '/tmp/example.png' })

  const pageTitle = await page.title()
  log.info('Page title: ' + pageTitle)
}
