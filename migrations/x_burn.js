const HulkToken = artifacts.require('HulkToken');
const Token = artifacts.require('HulkToken');
module.exports = async function (deployer, network, accounts) {
  const DEV = accounts[0];
  const TokenInstance = await Token.deployed();
  result = await TokenInstance.burnStart(50, 50, {
    from: DEV,
    gas: 95000
  });

};