const {expectRevert, time} = require("@openzeppelin/test-helpers");
const LunchToken = artifacts.require("LunchToken");
const LunchLady = artifacts.require("LunchLady");
const MockERC20 = artifacts.require("MockERC20");

contract("LunchLady", ([alice, bob, carol, dev, minter]) => {
  beforeEach(async () => {
    this.lunch = await LunchToken.new({
      from: alice,
    });
  });

  it("should set correct state variables", async () => {
    this.lady = await LunchLady.new(
      this.lunch.address,
      dev,
      "1000",
      "0",
      "1000",
      {
        from: alice,
      }
    );
    await this.lunch.transferOwnership(this.lady.address, {
      from: alice,
    });
    const lunch = await this.lady.lunch();
    const devaddr = await this.lady.devaddr();
    const owner = await this.lunch.owner();
    assert.equal(lunch.valueOf(), this.lunch.address);
    assert.equal(devaddr.valueOf(), dev);
    assert.equal(owner.valueOf(), this.lady.address);
  });

  it("should allow dev and only dev to update dev", async () => {
    this.lady = await LunchLady.new(
      this.lunch.address,
      dev,
      "1000",
      "0",
      "1000",
      {
        from: alice,
      }
    );
    assert.equal((await this.lady.devaddr()).valueOf(), dev);
    await expectRevert(
      this.lady.dev(bob, {
        from: bob,
      }),
      "dev: wut?"
    );
    await this.lady.dev(bob, {
      from: dev,
    });
    assert.equal((await this.lady.devaddr()).valueOf(), bob);
    await this.lady.dev(alice, {
      from: bob,
    });
    assert.equal((await this.lady.devaddr()).valueOf(), alice);
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
      this.lady = await LunchLady.new(
        this.lunch.address,
        dev,
        "100",
        "100",
        "1000",
        {
          from: alice,
        }
      );
      await this.lady.add("100", this.lp.address, true);
      await this.lp.approve(this.lady.address, "1000", {
        from: bob,
      });
      await this.lady.deposit(0, "100", {
        from: bob,
      });
      assert.equal((await this.lp.balanceOf(bob)).valueOf().toString(), "900");
      await this.lady.emergencyWithdraw(0, {
        from: bob,
      });
      assert.equal((await this.lp.balanceOf(bob)).valueOf().toString(), "1000");
    });

    it("should give out LUNCHs only after farming time", async () => {
      // 100 per block farming rate starting at block 100 with bonus until block 1000
      this.lady = await LunchLady.new(
        this.lunch.address,
        dev,
        "100",
        "100",
        "1000",
        {
          from: alice,
        }
      );
      await this.lunch.transferOwnership(this.lady.address, {
        from: alice,
      });
      await this.lady.add("100", this.lp.address, true);
      await this.lp.approve(this.lady.address, "1000", {
        from: bob,
      });
      await this.lady.deposit(0, "100", {
        from: bob,
      });
      await time.advanceBlockTo("89");
      await this.lady.deposit(0, "0", {
        from: bob,
      }); // block 90
      assert.equal((await this.lunch.balanceOf(bob)).valueOf().toString(), "0");
      await time.advanceBlockTo("94");
      await this.lady.deposit(0, "0", {
        from: bob,
      }); // block 95
      assert.equal((await this.lunch.balanceOf(bob)).valueOf().toString(), "0");
      await time.advanceBlockTo("99");
      await this.lady.deposit(0, "0", {
        from: bob,
      }); // block 100
      assert.equal((await this.lunch.balanceOf(bob)).valueOf().toString(), "0");
      await time.advanceBlockTo("100");
      await this.lady.deposit(0, "0", {
        from: bob,
      }); // block 101
      assert.equal(
        (await this.lunch.balanceOf(bob)).valueOf().toString(),
        "1000"
      );
      await time.advanceBlockTo("104");
      await this.lady.deposit(0, "0", {
        from: bob,
      }); // block 105
      assert.equal(
        (await this.lunch.balanceOf(bob)).valueOf().toString(),
        "5000"
      );
      assert.equal(
        (await this.lunch.balanceOf(dev)).valueOf().toString(),
        "500"
      );
      assert.equal(
        (await this.lunch.totalSupply()).valueOf().toString(),
        "5500"
      );
    });

    it("should not distribute LUNCHs if no one deposit", async () => {
      // 100 per block farming rate starting at block 200 with bonus until block 1000
      this.lady = await LunchLady.new(
        this.lunch.address,
        dev,
        "100",
        "200",
        "1000",
        {
          from: alice,
        }
      );
      await this.lunch.transferOwnership(this.lady.address, {
        from: alice,
      });
      await this.lady.add("100", this.lp.address, true);
      await this.lp.approve(this.lady.address, "1000", {
        from: bob,
      });
      await time.advanceBlockTo("199");
      assert.equal((await this.lunch.totalSupply()).valueOf().toString(), "0");
      await time.advanceBlockTo("204");
      assert.equal((await this.lunch.totalSupply()).valueOf().toString(), "0");
      await time.advanceBlockTo("209");
      await this.lady.deposit(0, "10", {
        from: bob,
      }); // block 210
      assert.equal((await this.lunch.totalSupply()).valueOf().toString(), "0");
      assert.equal((await this.lunch.balanceOf(bob)).valueOf().toString(), "0");
      assert.equal((await this.lunch.balanceOf(dev)).valueOf().toString(), "0");
      assert.equal((await this.lp.balanceOf(bob)).valueOf().toString(), "990");
      await time.advanceBlockTo("219");
      await this.lady.withdraw(0, "10", {
        from: bob,
      }); // block 220
      assert.equal(
        (await this.lunch.totalSupply()).valueOf().toString(),
        "11000"
      );
      assert.equal(
        (await this.lunch.balanceOf(bob)).valueOf().toString(),
        "10000"
      );
      assert.equal(
        (await this.lunch.balanceOf(dev)).valueOf().toString(),
        "1000"
      );
      assert.equal((await this.lp.balanceOf(bob)).valueOf().toString(), "1000");
    });

    it("should distribute LUNCHs properly for each staker", async () => {
      // 100 per block farming rate starting at block 300 with bonus until block 1000
      this.lady = await LunchLady.new(
        this.lunch.address,
        dev,
        "100",
        "300",
        "1000",
        {
          from: alice,
        }
      );
      await this.lunch.transferOwnership(this.lady.address, {
        from: alice,
      });
      await this.lady.add("100", this.lp.address, true);
      await this.lp.approve(this.lady.address, "1000", {
        from: alice,
      });
      await this.lp.approve(this.lady.address, "1000", {
        from: bob,
      });
      await this.lp.approve(this.lady.address, "1000", {
        from: carol,
      });
      // Alice deposits 10 LPs at block 310
      await time.advanceBlockTo("309");
      await this.lady.deposit(0, "10", {
        from: alice,
      });
      // Bob deposits 20 LPs at block 314
      await time.advanceBlockTo("313");
      await this.lady.deposit(0, "20", {
        from: bob,
      });
      // Carol deposits 30 LPs at block 318
      await time.advanceBlockTo("317");
      await this.lady.deposit(0, "30", {
        from: carol,
      });
      // Alice deposits 10 more LPs at block 320. At this point:
      //   Alice should have: 4*1000 + 4*1/3*1000 + 2*1/6*1000 = 5666
      //   LunchLady should have the remaining: 10000 - 5666 = 4334
      await time.advanceBlockTo("319");
      await this.lady.deposit(0, "10", {
        from: alice,
      });
      assert.equal(
        (await this.lunch.totalSupply()).valueOf().toString(),
        "11000"
      );
      assert.equal(
        (await this.lunch.balanceOf(alice)).valueOf().toString(),
        "5666"
      );
      assert.equal((await this.lunch.balanceOf(bob)).valueOf().toString(), "0");
      assert.equal(
        (await this.lunch.balanceOf(carol)).valueOf().toString(),
        "0"
      );
      assert.equal(
        (await this.lunch.balanceOf(this.lady.address)).valueOf().toString(),
        "4334"
      );
      assert.equal(
        (await this.lunch.balanceOf(dev)).valueOf().toString(),
        "1000"
      );
      // Bob withdraws 5 LPs at block 330. At this point:
      //   Bob should have: 4*2/3*1000 + 2*2/6*1000 + 10*2/7*1000 = 6190
      await time.advanceBlockTo("329");
      await this.lady.withdraw(0, "5", {
        from: bob,
      });
      assert.equal(
        (await this.lunch.totalSupply()).valueOf().toString(),
        "22000"
      );
      assert.equal(
        (await this.lunch.balanceOf(alice)).valueOf().toString(),
        "5666"
      );
      assert.equal(
        (await this.lunch.balanceOf(bob)).valueOf().toString(),
        "6190"
      );
      assert.equal(
        (await this.lunch.balanceOf(carol)).valueOf().toString(),
        "0"
      );
      assert.equal(
        (await this.lunch.balanceOf(this.lady.address)).valueOf().toString(),
        "8144"
      );
      assert.equal(
        (await this.lunch.balanceOf(dev)).valueOf().toString(),
        "2000"
      );
      // Alice withdraws 20 LPs at block 340.
      // Bob withdraws 15 LPs at block 350.
      // Carol withdraws 30 LPs at block 360.
      await time.advanceBlockTo("339");
      await this.lady.withdraw(0, "20", {
        from: alice,
      });
      await time.advanceBlockTo("349");
      await this.lady.withdraw(0, "15", {
        from: bob,
      });
      await time.advanceBlockTo("359");
      await this.lady.withdraw(0, "30", {
        from: carol,
      });
      assert.equal(
        (await this.lunch.totalSupply()).valueOf().toString(),
        "55000"
      );
      assert.equal(
        (await this.lunch.balanceOf(dev)).valueOf().toString(),
        "5000"
      );
      // Alice should have: 5666 + 10*2/7*1000 + 10*2/6.5*1000 = 11600
      assert.equal(
        (await this.lunch.balanceOf(alice)).valueOf().toString(),
        "11600"
      );
      // Bob should have: 6190 + 10*1.5/6.5 * 1000 + 10*1.5/4.5*1000 = 11831
      assert.equal(
        (await this.lunch.balanceOf(bob)).valueOf().toString(),
        "11831"
      );
      // Carol should have: 2*3/6*1000 + 10*3/7*1000 + 10*3/6.5*1000 + 10*3/4.5*1000 + 10*1000 = 26568
      assert.equal(
        (await this.lunch.balanceOf(carol)).valueOf().toString(),
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

    it("should give proper LUNCHs allocation to each pool", async () => {
      // 100 per block farming rate starting at block 400 with bonus until block 1000
      this.lady = await LunchLady.new(
        this.lunch.address,
        dev,
        "100",
        "400",
        "1000",
        {
          from: alice,
        }
      );
      await this.lunch.transferOwnership(this.lady.address, {
        from: alice,
      });
      await this.lp.approve(this.lady.address, "1000", {
        from: alice,
      });
      await this.lp2.approve(this.lady.address, "1000", {
        from: bob,
      });
      // Add first LP to the pool with allocation 1
      await this.lady.add("10", this.lp.address, true);
      // Alice deposits 10 LPs at block 410
      await time.advanceBlockTo("409");
      await this.lady.deposit(0, "10", {
        from: alice,
      });
      // Add LP2 to the pool with allocation 2 at block 420
      await time.advanceBlockTo("419");
      await this.lady.add("20", this.lp2.address, true);
      // Alice should have 10*1000 pending reward
      assert.equal(
        (await this.lady.pendingLunch(0, alice)).valueOf().toString(),
        "10000"
      );
      // Bob deposits 10 LP2s at block 425
      await time.advanceBlockTo("424");
      await this.lady.deposit(1, "5", {
        from: bob,
      });
      // Alice should have 10000 + 5*1/3*1000 = 11666 pending reward
      assert.equal(
        (await this.lady.pendingLunch(0, alice)).valueOf().toString(),
        "11666"
      );
      await time.advanceBlockTo("430");
      // At block 430. Bob should get 5*2/3*1000 = 3333. Alice should get ~1666 more.
      assert.equal(
        (await this.lady.pendingLunch(0, alice)).valueOf().toString(),
        "13333"
      );
      assert.equal(
        (await this.lady.pendingLunch(1, bob)).valueOf().toString(),
        "3333"
      );
    });

    it("should stop giving bonus LUNCHs after the bonus period ends", async () => {
      // 100 per block farming rate starting at block 500 with bonus until block 600
      this.lady = await LunchLady.new(
        this.lunch.address,
        dev,
        "100",
        "500",
        "600",
        {
          from: alice,
        }
      );
      await this.lunch.transferOwnership(this.lady.address, {
        from: alice,
      });
      await this.lp.approve(this.lady.address, "1000", {
        from: alice,
      });
      await this.lady.add("1", this.lp.address, true);
      // Alice deposits 10 LPs at block 590
      await time.advanceBlockTo("589");
      await this.lady.deposit(0, "10", {
        from: alice,
      });
      // At block 605, she should have 1000*10 + 100*5 = 10500 pending.
      await time.advanceBlockTo("605");
      assert.equal(
        (await this.lady.pendingLunch(0, alice)).valueOf().toString(),
        "10500"
      );
      // At block 606, Alice withdraws all pending rewards and should get 10600.
      await this.lady.deposit(0, "0", {
        from: alice,
      });
      assert.equal(
        (await this.lady.pendingLunch(0, alice)).valueOf().toString(),
        "0"
      );
      assert.equal(
        (await this.lunch.balanceOf(alice)).valueOf().toString(),
        "10600"
      );
    });
  });
});
