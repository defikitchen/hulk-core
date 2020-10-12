const HulkToken = artifacts.require('HulkToken');
const Hulkfarmer = artifacts.require('Hulkfarmer');
module.exports = async function (deployer, network, accounts) {
    const DEV = accounts[0];
    console.log("Deploying hulk token to network: " + network);
    const HulkTokenInstance = await HulkToken.deployed();
    const BLOCKREWARD = '10';
    const STARTBLOCK = '0';
    const ENDBLOCK = (parseInt(STARTBLOCK, 10) + 180000).toString(); // 5 weeks
    // DEPLOY MASTERCHEF
    await deployer.deploy(
        Hulkfarmer,
        HulkTokenInstance.address,
        DEV,
        BLOCKREWARD,
        [1, 2, 4, 8, 16], {
            from: DEV,
            gas: 2700000
        });
};