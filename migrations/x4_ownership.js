const HulkToken = artifacts.require('HulkToken');
const Hulkfarmer = artifacts.require('Hulkfarmer');
module.exports = async function (deployer, network, accounts) {
  const DEV = accounts[0];
  const HulkTokenInstance = await HulkToken.deployed();
  const HulkfarmerInstance = await Hulkfarmer.deployed();
  const xferResult = await HulkTokenInstance.transferOwnership(HulkfarmerInstance.address, {
    from: DEV,
    gas: 70000
  });
  console.log("------------------OWNERSHIP TRANSFER RESULT");
  console.log(xferResult);
};