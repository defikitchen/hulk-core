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
      await this.farmer.startFarming(105, 100, "1000", "100", [1, 2, 4, 8, 16], 10);
      assert.equal((await time.latestBlock()).valueOf().toString(), "100");
      assert.equal((await this.farmer.getFarmingStartBlock()).valueOf().toString(), "100");
      assert.equal((await this.farmer.getFarmingEndBlock()).valueOf().toString(), "205");
      assert.equal((await this.farmer.getBonusEndBlock()).valueOf().toString(), "200");
      // Alice deposits 10 LPs at block 101
      await time.advanceBlockTo("189");
      await this.farmer.deposit(0, "10", {
        from: alice,
      });
      await time.advanceBlockTo("200");
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "10100"
      );
      await time.advanceBlockTo("201");
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "10200"
      );
      await time.advanceBlockTo("202");
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "10300"
      );
      await time.advanceBlockTo("203");
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "10400"
      );
      await this.farmer.withdraw(0, "0", {
        from: alice,
      });
      // last farming block, and they withdraw. weird attack
      await time.advanceBlockTo("204");
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "100"
      );
      assert.equal(
        (await this.token.balanceOf(alice)).valueOf().toString(),
        "10400"
      );
      /// withdraw exactly on the last block
      await this.farmer.withdraw(0, "0", {
        from: alice,
      });
      await time.advanceBlockTo("205");
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "0"
      );
      assert.equal(
        (await this.token.balanceOf(alice)).valueOf().toString(),
        "10500"
      );

      // last farming block has been reached
      await time.advanceBlockTo("206");
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "0"
      );
      assert.equal(
        (await this.token.balanceOf(alice)).valueOf().toString(),
        "10500"
      );
      await time.advanceBlockTo("207");
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "0"
      );
      await this.farmer.withdraw(0, "0", {
        from: alice,
      });
      await time.advanceBlockTo("208");
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "0"
      );
      assert.equal(
        (await this.token.balanceOf(alice)).valueOf().toString(),
        "10500"
      );
      await time.advanceBlockTo("300");
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "0"
      );
      await this.farmer.withdraw(0, "0", {
        from: alice,
      });

      assert.equal(
        (await this.token.balanceOf(alice)).valueOf().toString(),
        "10500"
      );

      await time.advanceBlockTo("999");
      await this.farmer.startFarming(105, 100, "1000", "100", [1, 2, 4, 8, 16], 10);
      assert.equal((await time.latestBlock()).valueOf().toString(), "1000");
      assert.equal((await this.farmer.getFarmingStartBlock()).valueOf().toString(), "1000");
      assert.equal((await this.farmer.getFarmingEndBlock()).valueOf().toString(), "1105");
      assert.equal((await this.farmer.getBonusEndBlock()).valueOf().toString(), "1100");
      // Alice deposits 10 LPs at block 590
      await time.advanceBlockTo("1089");
      await this.farmer.deposit(0, "10", {
        from: alice,
      });
      await time.advanceBlockTo("1100");
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "10100"
      );
      await time.advanceBlockTo("1101");
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "10200"
      );
      await time.advanceBlockTo("1102");
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "10300"
      );
      await time.advanceBlockTo("1103");
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "10400"
      );
      await time.advanceBlockTo("1104");
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "10500"
      );
      await time.advanceBlockTo("1105");
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "0"
      );
      assert.equal(
        (await this.token.balanceOf(alice)).valueOf().toString(),
        "10500"
      );
      await time.advanceBlockTo("1106");
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "0"
      );
      assert.equal(
        (await this.token.balanceOf(alice)).valueOf().toString(),
        "10500"
      );
      await time.advanceBlockTo("1107");
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "0"
      );
      assert.equal(
        (await this.token.balanceOf(alice)).valueOf().toString(),
        "10500"
      );
      // try to withdraw AFTER farming ends
      await this.farmer.withdraw(0, "0", {
        from: alice,
      });
      await time.advanceBlockTo("1108");
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "0"
      );
      assert.equal(
        (await this.token.balanceOf(alice)).valueOf().toString(),
        "21000"
      );
      await this.farmer.withdraw(0, "0", {
        from: alice,
      }); //127
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "0"
      );
      await time.advanceBlockTo("1120");
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "0"
      );
      assert.equal(
        (await this.token.balanceOf(alice)).valueOf().toString(),
        "21000"
      );
    });
  });
});