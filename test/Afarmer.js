const {
  expectRevert,
  time
} = require("@openzeppelin/test-helpers");
const Token = artifacts.require("HulkToken");
const Farmer = artifacts.require("Hulkfarmer");
const MockERC20 = artifacts.require("MockERC20");

contract("Farmer", ([alice, bob, carol, dev, minter]) => {
  beforeEach(async () => {
    this.token = await Token.new({
      from: alice,
    });
  });

  it("should set correct state variables", async () => {
    this.farmer = await Farmer.new(
      this.token.address,
      dev, {
        from: alice,
      }
    );
    await this.token.transferOwnership(this.farmer.address, {
      from: alice,
    });
    const token = await this.farmer.token();
    const devaddr = await this.farmer.devaddr();
    const owner = await this.token.owner();
    assert.equal(token.valueOf(), this.token.address);
    assert.equal(devaddr.valueOf(), dev);
    assert.equal(owner.valueOf(), this.farmer.address);
  });

  it("should allow dev and only dev to update dev", async () => {
    this.farmer = await Farmer.new(
      this.token.address,
      dev, {
        from: alice,
      }
    );
    assert.equal((await this.farmer.devaddr()).valueOf(), dev);
    await expectRevert(
      this.farmer.dev(bob, {
        from: bob,
      }),
      "dev: wut?"
    );
    await this.farmer.dev(bob, {
      from: dev,
    });
    assert.equal((await this.farmer.devaddr()).valueOf(), bob);
    await this.farmer.dev(alice, {
      from: bob,
    });
    assert.equal((await this.farmer.devaddr()).valueOf(), alice);
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

    it("should allow emergency withdraw", async () => {
      // 100 per block farming rate starting at block 100 with bonus until block 1000
      this.farmer = await Farmer.new(
        this.token.address,
        dev, {
          from: alice,
        }
      );
      await this.farmer.add("100", this.lp.address, true);
      await this.lp.approve(this.farmer.address, "1000", {
        from: bob,
      });
      await this.farmer.deposit(0, "100", {
        from: bob,
      });
      assert.equal((await this.lp.balanceOf(bob)).valueOf().toString(), "900");
      await this.farmer.emergencyWithdraw(0, {
        from: bob,
      });
      assert.equal((await this.lp.balanceOf(bob)).valueOf().toString(), "1000");
    });

    it("should mint only after farming time", async () => {
      // 100 per block farming rate starting at block 100 with bonus until block 1000
      this.farmer = await Farmer.new(
        this.token.address,
        dev, {
          from: alice,
        }
      );
      await this.token.transferOwnership(this.farmer.address, {
        from: alice,
      });
      await this.farmer.add("100", this.lp.address, true);
      assert((await this.farmer.poolLength()).valueOf().toString(), '1');
      await this.lp.approve(this.farmer.address, "1000", {
        from: bob,
      });
      await this.farmer.deposit(0, "100", {
        from: bob,
      });
      await time.advanceBlockTo("89");
      await this.farmer.deposit(0, "0", {
        from: bob,
      }); // block 90
      assert.equal((await this.token.balanceOf(bob)).valueOf().toString(), "0");
      await time.advanceBlockTo("94");
      await this.farmer.deposit(0, "0", {
        from: bob,
      }); // block 95
      assert.equal((await this.token.balanceOf(bob)).valueOf().toString(), "0");
      await time.advanceBlockTo("98");
      await this.farmer.deposit(0, "0", {
        from: bob,
      }); // block 100
      assert.equal((await this.token.balanceOf(bob)).valueOf().toString(), "0");
      await this.farmer.startFarming(1000, 1000, "1000", "100", [1, 2, 4, 8, 16], 10);
      assert.equal((await time.latestBlock()).valueOf().toString(), "100");
      assert.equal((await this.farmer.getFarmingStartBlock()).valueOf().toString(), "100");
      await this.farmer.deposit(0, "0", {
        from: bob,
      });
      assert.equal((await time.latestBlock()).valueOf().toString(), "101");
      // block 101
      assert.equal(
        (await this.farmer.pendingReward(0, bob)).valueOf().toString(),
        "0"
      );
      assert.equal(
        (await this.token.balanceOf(dev)).valueOf().toString(),
        "0"
      );
      await this.farmer.massUpdatePools();
      await time.advanceBlockTo("102");
      assert.equal(
        (await this.farmer.pendingReward(0, bob)).valueOf().toString(),
        "1000"
      );
      assert.equal(
        (await this.token.balanceOf(dev)).valueOf().toString(),
        "50"
      );
      assert.equal(
        (await this.token.totalSupply()).valueOf().toString(),
        "1050"
      );
      await time.advanceBlockTo("103");
      await this.farmer.deposit(0, "0", {
        from: bob,
      }); // block 104
      assert.equal(
        (await this.token.balanceOf(bob)).valueOf().toString(),
        "3000"
      );
      assert.equal(
        (await this.token.balanceOf(dev)).valueOf().toString(),
        "150"
      );
      assert.equal(
        (await this.token.totalSupply()).valueOf().toString(),
        "3150"
      );
    });

    it("should not distribute if no one deposit", async () => {
      // 100 per block farming rate starting at block 200 with bonus until block 1000
      this.farmer = await Farmer.new(
        this.token.address,
        dev, {
          from: alice,
        }
      );
      await this.token.transferOwnership(this.farmer.address, {
        from: alice,
      });

      await this.farmer.add("100", this.lp.address, true);
      await this.farmer.startFarming(1000, 1000, "1000", "100", [1, 2, 4, 8, 16], 10);
      await this.lp.approve(this.farmer.address, "1000", {
        from: bob,
      });
      await time.advanceBlockTo("199");
      assert.equal((await this.token.totalSupply()).valueOf().toString(), "0");
      await time.advanceBlockTo("204");
      assert.equal((await this.token.totalSupply()).valueOf().toString(), "0");
      await time.advanceBlockTo("209");
      await this.farmer.deposit(0, "10", {
        from: bob,
      }); // block 210
      assert.equal((await this.token.totalSupply()).valueOf().toString(), "0");
      assert.equal((await this.token.balanceOf(bob)).valueOf().toString(), "0");
      assert.equal((await this.token.balanceOf(dev)).valueOf().toString(), "0");
      assert.equal((await this.lp.balanceOf(bob)).valueOf().toString(), "990");
      await time.advanceBlockTo("219");
      await this.farmer.withdraw(0, "10", {
        from: bob,
      }); // block 220
      assert.equal(
        (await this.token.totalSupply()).valueOf().toString(),
        "10500"
      );
      assert.equal(
        (await this.token.balanceOf(bob)).valueOf().toString(),
        "10000"
      );
      assert.equal(
        (await this.token.balanceOf(dev)).valueOf().toString(),
        "500"
      );
      assert.equal((await this.lp.balanceOf(bob)).valueOf().toString(), "1000");
    });

    it("should distribute properly for each staker", async () => {
      // 100 per block farming rate starting at block 300 with bonus until block 1000
      this.farmer = await Farmer.new(
        this.token.address,
        dev, {
          from: alice,
        }
      );
      await this.token.transferOwnership(this.farmer.address, {
        from: alice,
      });
      await this.farmer.add("100", this.lp.address, true);
      await this.farmer.startFarming(1000, 1000, "1000", "100", [1, 2, 4, 8, 16], 10);
      await this.lp.approve(this.farmer.address, "1000", {
        from: alice,
      });
      await this.lp.approve(this.farmer.address, "1000", {
        from: bob,
      });
      await this.lp.approve(this.farmer.address, "1000", {
        from: carol,
      });
      // Alice deposits 10 LPs at block 310
      await time.advanceBlockTo("309");
      await this.farmer.deposit(0, "10", {
        from: alice,
      });
      // Bob deposits 20 LPs at block 314
      await time.advanceBlockTo("313");
      await this.farmer.deposit(0, "20", {
        from: bob,
      });
      // Carol deposits 30 LPs at block 318
      await time.advanceBlockTo("317");
      await this.farmer.deposit(0, "30", {
        from: carol,
      });
      // Alice deposits 10 more LPs at block 320. At this point:
      //   Alice should have: 4*1000 + 4*1/3*1000 + 2*1/6*1000 = 5666
      //   Farmer should have the remaining: 10000 - 5666 = 4334
      await time.advanceBlockTo("319");
      await this.farmer.deposit(0, "10", {
        from: alice,
      });
      assert.equal(
        (await this.token.totalSupply()).valueOf().toString(),
        "10500"
      );
      assert.equal(
        (await this.token.balanceOf(alice)).valueOf().toString(),
        "5666"
      );
      assert.equal((await this.token.balanceOf(bob)).valueOf().toString(), "0");
      assert.equal(
        (await this.token.balanceOf(carol)).valueOf().toString(),
        "0"
      );
      assert.equal(
        (await this.token.balanceOf(this.farmer.address)).valueOf().toString(),
        "4334"
      );
      assert.equal(
        (await this.token.balanceOf(dev)).valueOf().toString(),
        "500"
      );
      // Bob withdraws 5 LPs at block 330. At this point:
      //   Bob should have: 4*2/3*1000 + 2*2/6*1000 + 10*2/7*1000 = 6190
      await time.advanceBlockTo("329");
      await this.farmer.withdraw(0, "5", {
        from: bob,
      });
      assert.equal(
        (await this.token.totalSupply()).valueOf().toString(),
        "21000"
      );
      assert.equal(
        (await this.token.balanceOf(alice)).valueOf().toString(),
        "5666"
      );
      assert.equal(
        (await this.token.balanceOf(bob)).valueOf().toString(),
        "6190"
      );
      assert.equal(
        (await this.token.balanceOf(carol)).valueOf().toString(),
        "0"
      );
      assert.equal(
        (await this.token.balanceOf(this.farmer.address)).valueOf().toString(),
        "8144"
      );
      assert.equal(
        (await this.token.balanceOf(dev)).valueOf().toString(),
        "1000"
      );
      // Alice withdraws 20 LPs at block 340.
      // Bob withdraws 15 LPs at block 350.
      // Carol withdraws 30 LPs at block 360.
      await time.advanceBlockTo("339");
      await this.farmer.withdraw(0, "20", {
        from: alice,
      });
      await time.advanceBlockTo("349");
      await this.farmer.withdraw(0, "15", {
        from: bob,
      });
      await time.advanceBlockTo("359");
      await this.farmer.withdraw(0, "30", {
        from: carol,
      });
      assert.equal(
        (await this.token.totalSupply()).valueOf().toString(),
        "52500"
      );
      assert.equal(
        (await this.token.balanceOf(dev)).valueOf().toString(),
        "2500"
      );
      // Alice should have: 5666 + 10*2/7*1000 + 10*2/6.5*1000 = 11600
      assert.equal(
        (await this.token.balanceOf(alice)).valueOf().toString(),
        "11600"
      );
      // Bob should have: 6190 + 10*1.5/6.5 * 1000 + 10*1.5/4.5*1000 = 11831
      assert.equal(
        (await this.token.balanceOf(bob)).valueOf().toString(),
        "11831"
      );
      // Carol should have: 2*3/6*1000 + 10*3/7*1000 + 10*3/6.5*1000 + 10*3/4.5*1000 + 10*1000 = 26568
      assert.equal(
        (await this.token.balanceOf(carol)).valueOf().toString(),
        "26568"
      );
      // All of them should have 1000 LPs back.
      assert.equal(
        (await this.lp.balanceOf(alice)).valueOf().toString(),
        "1000"
      );
      assert.equal((await this.lp.balanceOf(bob)).valueOf().toString(), "1000");
      assert.equal(
        (await this.lp.balanceOf(carol)).valueOf().toString(),
        "1000"
      );
    });
    it("should give proper allocation to each pool", async () => {
      // 100 per block farming rate starting at block 400 with bonus until block 1000
      this.farmer = await Farmer.new(
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
      await this.lp2.approve(this.farmer.address, "1000", {
        from: bob,
      });
      // Add first LP to the pool with allocation 1
      await this.farmer.add("10", this.lp.address, true);
      await this.farmer.startFarming(1000, 1000, "1000", "100", [1, 2, 4, 8, 16], 10);
      // Alice deposits 10 LPs at block 410
      await time.advanceBlockTo("409");
      await this.farmer.deposit(0, "10", {
        from: alice,
      });
      // Add LP2 to the pool with allocation 2 at block 420
      await time.advanceBlockTo("419");
      await this.farmer.add("20", this.lp2.address, true);
      // Alice should have 10*1000 pending reward
      assert.equal((await time.latestBlock()).valueOf().toString(), "420");
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "10000"
      );

      // Bob deposits 10 LP2s at block 425
      await time.advanceBlockTo("424");
      await this.farmer.deposit(1, "5", {
        from: bob,
      });
      // Alice should have 10000 + 5*1/3*1000 = 11666 pending reward
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "11666"
      );
      await time.advanceBlockTo("430");
      // At block 430. Bob should get 5*2/3*1000 = 3333. Alice should get ~1666 more.
      assert.equal(
        (await this.farmer.pendingReward(0, alice)).valueOf().toString(),
        "13333"
      );
      assert.equal(
        (await this.farmer.pendingReward(1, bob)).valueOf().toString(),
        "3333"
      );
    });
  });
});