const HulkToken = artifacts.require('HulkToken');
const Hulkfarmer = artifacts.require('Hulkfarmer');
const HulkBoat = artifacts.require('HulkBoat');
module.exports = async function (deployer, network, accounts) {
  const DEV = accounts[0];
  console.log("Deploying hulk token to network: " + network);
  const HulkTokenInstance = await HulkToken.deployed();
  console.log(`HulkTokenInstance: ${HulkTokenInstance.address}`)
  const HulkfarmerInstance = await Hulkfarmer.deployed();
  console.log(`HulkfarmerInstance: ${HulkfarmerInstance.address}`);
  await deployer.deploy(
    HulkBoat,
    HulkTokenInstance.address, // HulkToken
    {
      from: DEV
    }
  );
};