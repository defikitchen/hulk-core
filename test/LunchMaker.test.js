const LunchToken = artifacts.require("LunchToken");
const LunchMaker = artifacts.require("LunchMaker");
const MockERC20 = artifacts.require("MockERC20");
const UniswapV2Pair = artifacts.require("UniswapV2Pair");
const UniswapV2Factory = artifacts.require("UniswapV2Factory");

contract("LunchMaker", ([alice, bar, minter]) => {
  beforeEach(async () => {
    this.factory = await UniswapV2Factory.new(alice, {from: alice});
    this.lunch = await LunchToken.new({from: alice});
    await this.lunch.mint(minter, "100000000", {from: alice});
    this.weth = await MockERC20.new("WETH", "WETH", "100000000", {
      from: minter,
    });
    this.token1 = await MockERC20.new("TOKEN1", "TOKEN", "100000000", {
      from: minter,
    });
    this.token2 = await MockERC20.new("TOKEN2", "TOKEN2", "100000000", {
      from: minter,
    });
    this.maker = await LunchMaker.new(
      this.factory.address,
      bar,
      this.lunch.address,
      this.weth.address
    );
    this.lunchWETH = await UniswapV2Pair.at(
      (await this.factory.createPair(this.weth.address, this.lunch.address))
        .logs[0].args.pair
    );
    this.wethToken1 = await UniswapV2Pair.at(
      (await this.factory.createPair(this.weth.address, this.token1.address))
        .logs[0].args.pair
    );
    this.wethToken2 = await UniswapV2Pair.at(
      (await this.factory.createPair(this.weth.address, this.token2.address))
        .logs[0].args.pair
    );
    this.token1Token2 = await UniswapV2Pair.at(
      (await this.factory.createPair(this.token1.address, this.token2.address))
        .logs[0].args.pair
    );
  });

  it("should make LUNCHs successfully", async () => {
    await this.factory.setFeeTo(this.maker.address, {from: alice});
    await this.weth.transfer(this.lunchWETH.address, "10000000", {
      from: minter,
    });
    await this.lunch.transfer(this.lunchWETH.address, "10000000", {
      from: minter,
    });
    await this.lunchWETH.mint(minter);
    await this.weth.transfer(this.wethToken1.address, "10000000", {
      from: minter,
    });
    await this.token1.transfer(this.wethToken1.address, "10000000", {
      from: minter,
    });
    await this.wethToken1.mint(minter);
    await this.weth.transfer(this.wethToken2.address, "10000000", {
      from: minter,
    });
    await this.token2.transfer(this.wethToken2.address, "10000000", {
      from: minter,
    });
    await this.wethToken2.mint(minter);
    await this.token1.transfer(this.token1Token2.address, "10000000", {
      from: minter,
    });
    await this.token2.transfer(this.token1Token2.address, "10000000", {
      from: minter,
    });
    await this.token1Token2.mint(minter);
    // Fake some revenue
    await this.token1.transfer(this.token1Token2.address, "100000", {
      from: minter,
    });
    await this.token2.transfer(this.token1Token2.address, "100000", {
      from: minter,
    });
    await this.token1Token2.sync();
    await this.token1.transfer(this.token1Token2.address, "10000000", {
      from: minter,
    });
    await this.token2.transfer(this.token1Token2.address, "10000000", {
      from: minter,
    });
    await this.token1Token2.mint(minter);
    // Maker should have the LP now
    assert.equal(
      (await this.token1Token2.balanceOf(this.maker.address))
        .valueOf()
        .toString(),
      "16528"
    );
    // After calling convert, bar should have LUNCH value at ~1/6 of revenue
    await this.maker.convert(this.token1.address, this.token2.address);
    assert.equal(
      (await this.lunch.balanceOf(bar)).valueOf().toString(),
      "32965"
    );
    assert.equal(
      (await this.token1Token2.balanceOf(this.maker.address))
        .valueOf()
        .toString(),
      "0"
    );
    // Should also work for LUNCH-ETH pair
    await this.lunch.transfer(this.lunchWETH.address, "100000", {from: minter});
    await this.weth.transfer(this.lunchWETH.address, "100000", {from: minter});
    await this.lunchWETH.sync();
    await this.lunch.transfer(this.lunchWETH.address, "10000000", {
      from: minter,
    });
    await this.weth.transfer(this.lunchWETH.address, "10000000", {
      from: minter,
    });
    await this.lunchWETH.mint(minter);
    assert.equal(
      (await this.lunchWETH.balanceOf(this.maker.address)).valueOf().toString(),
      "16537"
    );
    await this.maker.convert(this.lunch.address, this.weth.address);
    assert.equal(
      (await this.lunch.balanceOf(bar)).valueOf().toString(),
      "66249"
    );
    assert.equal(
      (await this.lunchWETH.balanceOf(this.maker.address)).valueOf().toString(),
      "0"
    );
  });
});
