const HulkToken = artifacts.require('HulkToken');
const HulkMaker = artifacts.require('HulkMaker');
const HulkBoat = artifacts.require('HulkBoat');
module.exports = async function (deployer, network, accounts) {
  return;
  const DEV = accounts[0];
  console.log("Deploying HulkMaker to network: " + network);
  const HulkTokenInstance = await HulkToken.deployed();
  console.log(`HulkTokenInstance: ${HulkTokenInstance.address}`)
  const HulkBoatInstance = await HulkBoat.deployed();
  console.log(`HulkBoatInstance: ${HulkBoatInstance.address}`);

  await deployer.deploy(
    HulkMaker,
    "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", // IUniswapV2Factory
    HulkBoatInstance.address, // bar
    HulkTokenInstance.address, // hulk
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // weth
    {
      from: DEV
    }
  );
  // CREATE UNISWAP FACTORY CONTRACT
  // const UniswapV2FactoryAddress = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
  // const WETH9Instance = "0xfB1942b9E2A5218Bd2601E1a02992d99e6442D1D"
  // const UniswapV2FactoryInstance = await UniswapV2Factory.at(UniswapV2FactoryAddress);

  // const Hulk_WETH = await UniswapV2Pair.at((await UniswapV2FactoryInstance.createPair(HulkTokenInstance.address, WETH9Instance.address)).logs[0].args.pair);
  // await HulkTokenInstance.transfer(Hulk_WETH.address, '10000000000000000000', {
  //   from: DEV
  // }); // 10 Hulk
  // await WETH9Instance.transfer(Hulk_WETH.address, '1000000000000000', {
  //   from: DEV
  // }); // 0.001 WETH
  // await Hulk_WETH.mint(DEV);
  // console.log(`Hulk_WETH Address: ${Hulk_WETH.address}`);

  await HulkfarmerInstance.add('2000', Hulk_WETH.address, true);
};