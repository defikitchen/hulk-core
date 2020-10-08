const helper = require('./migration_utils.js');
const LunchToken = artifacts.require('./LunchToken')
// const Migrator = artifacts.require('Migrator');
// const UniswapV2Migrator = artifacts.require('UniswapV2Migrator');

module.exports = function (deployer, network, accounts) {
  const DEV = accounts[0];
  deployer.then(async () => {
    try {
      // DEPLOY MULTISIG WALLET - LUNCH & MOCK TOKENS
      await deployer.deploy(LunchToken, {
        from: DEV
      })

      console.log(`Successfully deployed lunch token ${network}. `)
    } catch (e) {
      console.log(e);
    }
  })
}