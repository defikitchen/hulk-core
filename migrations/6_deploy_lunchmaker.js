const LunchToken = artifacts.require('LunchToken');
const LunchMaker = artifacts.require('LunchMaker');
const LunchBar = artifacts.require('LunchBar');
module.exports = async function (deployer, network, accounts) {
  return;
  const DEV = accounts[0];
  console.log("Deploying LunchMaker to network: " + network);
  const LunchTokenInstance = await LunchToken.deployed();
  console.log(`LunchTokenInstance: ${LunchTokenInstance.address}`)
  const LunchBarInstance = await LunchBar.deployed();
  console.log(`LunchBarInstance: ${LunchBarInstance.address}`);

  await deployer.deploy(
    LunchMaker,
    "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", // IUniswapV2Factory
    LunchBarInstance.address, // bar
    LunchTokenInstance.address, // lunch
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // weth
    {
      from: DEV
    }
  );
  // CREATE UNISWAP FACTORY CONTRACT
  // const UniswapV2FactoryAddress = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
  // const WETH9Instance = "0xfB1942b9E2A5218Bd2601E1a02992d99e6442D1D"
  // const UniswapV2FactoryInstance = await UniswapV2Factory.at(UniswapV2FactoryAddress);

  // const LUNCH_WETH = await UniswapV2Pair.at((await UniswapV2FactoryInstance.createPair(LunchTokenInstance.address, WETH9Instance.address)).logs[0].args.pair);
  // await LunchTokenInstance.transfer(LUNCH_WETH.address, '10000000000000000000', {
  //   from: DEV
  // }); // 10 LUNCH
  // await WETH9Instance.transfer(LUNCH_WETH.address, '1000000000000000', {
  //   from: DEV
  // }); // 0.001 WETH
  // await LUNCH_WETH.mint(DEV);
  // console.log(`LUNCH_WETH Address: ${LUNCH_WETH.address}`);

  await LunchLadyInstance.add('2000', LUNCH_WETH.address, true);
};