const Token = artifacts.require('HulkToken');
const Farmer = artifacts.require('Hulkfarmer');
module.exports = async function (deployer, network, accounts) {
    const DEV = accounts[0];
    console.log("Deploying farmer to network: " + network);
    deployer.then(async () => {
        try {
            const TokenInstance = await Token.deployed();
            // DEPLOY MASTERCHEF
            await deployer.deploy(
                Farmer,
                TokenInstance.address,
                DEV, {
                    from: DEV,
                    gas: 3120000
                });
        } catch (e) {
            console.log(e);
            throw e;
        }
    })
};