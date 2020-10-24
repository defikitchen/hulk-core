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
      const hulkTON = '0x25dacf99a6caba974f648f53647a311b5e0f1b92';
      const HulkfarmerInstance = await Hulkfarmer.deployed();
      let result;
      result = await HulkfarmerInstance.add(80, hulkETH, true, {
        from: DEV,
        gas: 130000
      });
      console.log("------------------ result");
      console.log(result);

      result = await HulkfarmerInstance.add(15, hulkUSDN, true, {
        from: DEV,
        gas: 130000
      });
      console.log("------------------ result");
      console.log(result);

      result = await HulkfarmerInstance.add(5, hulkTON, true, {
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