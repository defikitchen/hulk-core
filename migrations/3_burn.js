const HulkToken = artifacts.require('HulkToken');
const Token = artifacts.require('HulkToken');
module.exports = async function (deployer, network, accounts) {
  const DEV = accounts[0];
  result = await TokenInstance.burnStart(400, 100, {
    from: DEV,
    gas: 95000
  });

};