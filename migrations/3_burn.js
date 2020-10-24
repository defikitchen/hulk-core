const HulkToken = artifacts.require('HulkToken');
const Token = artifacts.require('HulkToken');
module.exports = async function (deployer, network, accounts) {
  const DEV = accounts[0];
  console.log("setting up burn whitelist and turning on burn")
  const unirouter = '0xf164fC0Ec4E93095b804a4795bBe1e041497b92a';
  const unirouter2 = '0x7a250d5630b4cf539739df2c5dacb4c659f2488d';
  const lptokenETH = '0xb1fe4cd5fb8637c80f5bc9db8f44b34656884323';
  const lptokenUSDN = '0x72285ecdd72c24caa8b7cb43f06295c90ef311ae';
  const TokenInstance = await Token.deployed();
  let result;
  result = await TokenInstance.addSenderBurnWhitelist(unirouter, {
    from: DEV,
    gas: 45000
  });
  result = await TokenInstance.addSenderBurnWhitelist(unirouter2, {
    from: DEV,
    gas: 45000
  });
  result = await TokenInstance.addSenderBurnWhitelist(lptokenETH, {
    from: DEV,
    gas: 45000
  });
  result = await TokenInstance.addSenderBurnWhitelist(lptokenUSDN, {
    from: DEV,
    gas: 45000
  });
  console.log("------------------whitelist result");
  console.log(result);
  // result = await TokenInstance.bigBurnStart(6000, 1600, 400, {
  //   from: DEV,
  //   gas: 35000
  // });
  result = await TokenInstance.burnStart(400, 100, {
    from: DEV,
    gas: 95000
  });

};