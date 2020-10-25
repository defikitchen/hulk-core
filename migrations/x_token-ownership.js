const Token = artifacts.require('HulkToken');
const Farmer = artifacts.require('Hulkfarmer');
module.exports = async function (deployer, network, accounts) {
  const DEV = accounts[0];
  deployer.then(async () => {
    try {
      const TokenInstance = await Token.deployed();
      const FarmerInstance = await Farmer.deployed();
      await TokenInstance.transferOwnership(FarmerInstance.address, {
        from: DEV,
        gas: 70000
      });
    } catch (e) {
      console.log(e);
      throw e;
    }
  })
};