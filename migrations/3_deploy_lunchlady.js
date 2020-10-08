const LunchToken = artifacts.require('LunchToken');
const LunchLady = artifacts.require('LunchLady');
module.exports = async function (deployer, network, accounts) {
    const DEV = accounts[0];
    console.log("Deploying lunch token to network: " + network);
    const LunchTokenInstance = await LunchToken.deployed();
    const BLOCKREWARD = '50';
    const STARTBLOCK = '0';
    const ENDBLOCK = (parseInt(STARTBLOCK, 10) + 180000).toString(); // 5 weeks
    // DEPLOY MASTERCHEF
    await deployer.deploy(LunchLady, LunchTokenInstance.address, DEV, BLOCKREWARD, STARTBLOCK, ENDBLOCK);
    const LunchLadyInstance = await LunchLady.deployed();
    // await LunchToken.transferOwnership(LunchLadyInstance.address, {
    //     from: DEV
    // });
};