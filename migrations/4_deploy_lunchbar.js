const LunchToken = artifacts.require('LunchToken');
const LunchLady = artifacts.require('LunchLady');
const LunchBar = artifacts.require('LunchBar');
module.exports = async function (deployer, network, accounts) {
  const DEV = accounts[0];
  console.log("Deploying lunch token to network: " + network);
  const LunchTokenInstance = await LunchToken.deployed();
  console.log(`LunchTokenInstance: ${LunchTokenInstance.address}`)
  const LunchLadyInstance = await LunchLady.deployed();
  console.log(`LunchLadyInstance: ${LunchLadyInstance.address}`);
  await deployer.deploy(
    LunchBar,
    LunchTokenInstance.address, // LunchToken
    {
      from: DEV
    }
  );
};