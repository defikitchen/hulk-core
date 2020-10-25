const {
  expectRevert,
  time
} = require("@openzeppelin/test-helpers");
const HulkToken = artifacts.require("HulkToken");
const Hulkfarmer = artifacts.require("Hulkfarmer");
const MockERC20 = artifacts.require("MockERC20");

contract("Hulkfarmer", ([alice, bob, carol, dev, minter]) => {
  beforeEach(async () => {
    this.token = await HulkToken.new({
      from: alice,
    });
  });


  context("With ERC/LP token added to the field", () => {
    beforeEach(async () => {
      this.lp = await MockERC20.new("LPToken", "LP", "10000000000", {
        from: minter,
      });
      await this.lp.transfer(alice, "1000", {
        from: minter,
      });
      await this.lp.transfer(bob, "1000", {
        from: minter,
      });
      await this.lp.transfer(carol, "1000", {
        from: minter,
      });
      this.lp2 = await MockERC20.new("LPToken2", "LP2", "10000000000", {
        from: minter,
      });
      await this.lp2.transfer(alice, "1000", {
        from: minter,
      });
      await this.lp2.transfer(bob, "1000", {
        from: minter,
      });
      await this.lp2.transfer(carol, "1000", {
        from: minter,
      });
    });



    it("should stop giving bonus after the bonus period ends", async () => {
      // 100 per block farming rate starting at block 500 with bonus until block 600
      this.farmer = await Hulkfarmer.new(
        this.token.address,
        dev, {
          from: alice,
        }
      );
      await this.token.transferOwnership(this.farmer.address, {
        from: alice,
      });
      await this.lp.approve(this.farmer.address, "1000", {
        from: alice,
      });
      await this.farmer.add("1", this.lp.address, true);
      await time.advanceBlockTo(99);
      await this.farmer.startFarming(108000, 0, "21600", "1911589472200000000", [1, 2, 4, 8, 16], 1);
      assert.equal((await time.latestBlock()).valueOf().toString(), "100");
      assert.equal((await this.farmer.getFarmingStartBlock()).valueOf().toString(), "100");
      assert.equal((await this.farmer.getFarmingEndBlock()).valueOf().toString(), "108100");
      assert.equal((await this.farmer.getBonusEndBlock()).valueOf().toString(), "100");
      // Alice deposits 10 LPs at block 101
      await time.advanceBlockTo("200");
      await this.farmer.deposit(0, "10", {
        from: alice,
      });
      await time.advanceBlockTo("201");
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "1911589472200000000"
      );
      await time.advanceBlockTo("202");
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "3823178944400000000"
      );
      await time.advanceBlockTo("203");
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "573476841700000000"
      );
      await this.farmer.withdraw(0, "0", {
        from: alice,
      });
      await time.advanceBlockTo("204");
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "0"
      );
      assert.equal(
        (await this.token.balanceOf(alice)).valueOf().toString(),
        "573476841700000000"
      );
    });
  });
});