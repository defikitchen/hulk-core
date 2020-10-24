const Hulkfarmer = artifacts.require('Hulkfarmer');
module.exports = async function (deployer, network, accounts) {
  const DEV = accounts[0];
  deployer.then(async () => {
    if (network !== 'mainnet') {
      return;
    }
    try {
      const HulkfarmerInstance = await Hulkfarmer.deployed();

      await HulkfarmerInstance.transferOwnership("0xe3e3126D5bd1a747acF9AEc530FDCDDa29CC210e", {
        from: DEV,
        gas: 140000
      });
    } catch (e) {
      console.log(e);
      throw e;
    }
  })
};