const Timelock = artifacts.require('Timelock');
module.exports = async function (deployer, network, accounts) {
  const DEV = accounts[0];

  console.log("Deploying Timelock to network: " + network);
  await deployer.deploy(Timelock, DEV, 172800); // 172800 = 2 days
  const TimelockInstance = await Timelock.deployed();
  console.log(`TimelockInstance: ${TimelockInstance.address}`);
  // SET TIMELOCK MULTISIG ADMIN
  // await TimelockInstance.setPendingAdmin(GnosisWalletInstance.address, {
  //   from: DEV
  // });  
};