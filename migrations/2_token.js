const helper = require('./migration_utils.js');
const HulkToken = artifacts.require('./HulkToken')
// const Migrator = artifacts.require('Migrator');
// const UniswapV2Migrator = artifacts.require('UniswapV2Migrator');

module.exports = function (deployer, network, accounts) {
  const DEV = accounts[0];
  deployer.then(async () => {
    try {
      // DEPLOY MULTISIG WALLET - Hulk & MOCK TOKENS
      await deployer.deploy(HulkToken, {
        from: DEV,
        gas: 4000000
      })

      console.log(`Successfully deployed hulk token ${network}. `)
    } catch (e) {
      console.log(e);
    }
  })
}