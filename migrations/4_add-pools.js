const Hulkfarmer = artifacts.require('Hulkfarmer');
module.exports = async function (deployer, network, accounts) {
  const DEV = accounts[0];
  if (network !== 'mainnet') {
    return;
  }
  deployer.then(async () => {
    try {

      const hulkETH = '0xb1fe4cd5fb8637c80f5bc9db8f44b34656884323';
      const hulkUSDN = '0x72285ecdd72c24caa8b7cb43f06295c90ef311ae';
      const usdtlp = '0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852';
      const usdclp = '0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc';
      const tonlp = '0x4f1a2ea0c27f8fb01ebdeeecb1f09ee9187df191';
      const HulkfarmerInstance = await Hulkfarmer.deployed();
      let result;
      result = await HulkfarmerInstance.add(10000, hulkETH, true, {
        from: DEV,
        gas: 130000
      });
      console.log("------------------ result");
      console.log(result);

      result = await HulkfarmerInstance.add(5000, hulkUSDN, true, {
        from: DEV,
        gas: 130000
      });
      console.log("------------------ result");
      console.log(result);

      result = await HulkfarmerInstance.add(500, usdtlp, true, {
        from: DEV,
        gas: 130000
      });
      console.log("------------------ result");
      console.log(result);
      result = await HulkfarmerInstance.add(500, usdclp, true, {
        from: DEV,
        gas: 130000
      });
      console.log("------------------ result");
      console.log(result);

      result = await HulkfarmerInstance.add(2000, tonlp, true, {
        from: DEV,
        gas: 130000
      });
      console.log("------------------ result");
      console.log(result);

    } catch (e) {
      console.log(e);
      throw e;
    }
  })
};