const HulkToken = artifacts.require('HulkToken');
const Hulkfarmer = artifacts.require('Hulkfarmer');
module.exports = async function (deployer, network, accounts) {
  const DEV = accounts[0];

  const hulklp = '0x';
  const nusdlp = '0x';
  const usdtlp = '0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852';
  const HulkfarmerInstance = await Hulkfarmer.deployed();
  let result;
  result = await HulkfarmerInstance.add(hulklp, 5000, {
    from: DEV,
    gas: 70000
  });
  result = await HulkfarmerInstance.add(nusdlp, 1000, {
    from: DEV,
    gas: 70000
  });
  result = await HulkfarmerInstance.add(usdtlp, 500, {
    from: DEV,
    gas: 70000
  });
  console.log("------------------whitelist result");
  console.log(result);
};