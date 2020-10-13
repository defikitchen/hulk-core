const {
  expectRevert,
  time
} = require("@openzeppelin/test-helpers");
const HulkToken = artifacts.require("HulkToken");

contract("HulkToken", ([alice, bob, carol]) => {
  beforeEach(async () => {
    this.hulk = await HulkToken.new({
      from: alice
    });
  });

  it("should set up a burn, bonus pool and be able to send from bonus pool", async () => {
    await this.hulk.mint(alice, "10000", {
      from: alice
    });
    await this.hulk.mint(bob, "100000", {
      from: alice
    });
    // TODO
    // turn on burn
    await this.hulk.burnStart(100, 100);
    const burnOn = await this.hulk.burnOn();

    assert.equal(burnOn.toString(), "true");
    // console.log("Advancing 17280 blocks. Will take a while...");
    // for (let i = 0; i < 17280; ++i) {
    //   await time.advanceBlock();
    // }
    await this.hulk.transfer(carol, "1000", {
      from: bob
    });

    const totalSupplyC = await this.hulk.totalSupply();
    const bobBalC = await this.hulk.balanceOf(bob);
    const carolBalC = await this.hulk.balanceOf(carol);
    assert.equal(totalSupplyC.valueOf().toString(), "109990");
    assert.equal(bobBalC.valueOf().toString(), "99000");
    assert.equal(carolBalC.valueOf().toString(), "980");

    const burnPool = await this.hulk.burnPool();
    const bonusPool = await this.hulk.bonusPool();
    assert.equal(burnPool.toString(), "10");
    assert.equal(bonusPool.toString(), "10");

    await this.hulk.transfer(carol, "10000", {
      from: bob
    });
    const burnPoolB = await this.hulk.burnPool();
    const bonusPoolB = await this.hulk.bonusPool();
    assert.equal(burnPoolB.toString(), "110");
    assert.equal(bonusPoolB.toString(), "110");

    const totalSupply = await this.hulk.totalSupply();
    const bobBal = await this.hulk.balanceOf(bob);
    const carolBal = await this.hulk.balanceOf(carol);
    assert.equal(totalSupply.valueOf().toString(), "109890");
    assert.equal(bobBal.valueOf().toString(), "89000");
    assert.equal(carolBal.valueOf().toString(), "10780");

    const aliceBal3 = await this.hulk.balanceOf(alice);
    assert.equal(aliceBal3.valueOf().toString(), "10000");

    await this.hulk.sendBonusMany([carol, bob], ["1", "1"]);

    const totalSupply2 = await this.hulk.totalSupply();
    const bobBal2 = await this.hulk.balanceOf(bob);
    const carolBal2 = await this.hulk.balanceOf(carol);
    assert.equal(totalSupply2.valueOf().toString(), "109890");
    assert.equal(bobBal2.valueOf().toString(), "89001");
    assert.equal(carolBal2.valueOf().toString(), "10781");

    await this.hulk.sendBonus(carol, "1");
    const carolBal3 = await this.hulk.balanceOf(carol);
    assert.equal(carolBal3.valueOf().toString(), "10782");
  });
});