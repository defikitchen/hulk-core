const Hulkfarmer = artifacts.require('Hulkfarmer');
module.exports = async function (deployer, network, accounts) {
  const DEV = accounts[0];
  deployer.then(async () => {
    if (network !== 'mainnet') {
      return;
    }
    try {
      const HulkfarmerInstance = await Hulkfarmer.deployed();

      await HulkfarmerInstance.startFarming(36000, 14400, "7200", "69000000000000000", [1, 2, 4, 8, 16], 10, {
        from: DEV,
        gas: 240000
      });
    } catch (e) {
      console.log(e);
      throw e;
    }
  })
};