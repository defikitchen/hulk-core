const Token = artifacts.require('HulkToken');
const Farmer = artifacts.require('Hulkfarmer');
module.exports = async function (deployer, network, accounts) {
    const DEV = accounts[0];
    console.log("Deploying farmer to network: " + network);
    deployer.then(async () => {
        try {
            await deployer.deploy(
                Farmer,
                "0xe1f8cd01ab04b51d02c6fb2bca61b03fb5e33b99",
                DEV, {
                    from: DEV,
                    gas: 3620000
                });
        } catch (e) {
            console.log(e);
            throw e;
        }
    })
};