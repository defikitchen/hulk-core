const {
  expectRevert
} = require("@openzeppelin/test-helpers");
const HulkToken = artifacts.require("HulkToken");
const HulkBoat = artifacts.require("HulkBoat");

contract("HulkToken", ([alice, bob, carol]) => {
  beforeEach(async () => {
    this.hulk = await HulkToken.new({
      from: alice
    });
    this.bar = await HulkBoat.new(this.hulk.address, {
      from: alice
    });
    this.hulk.mint(alice, "100", {
      from: alice
    });
    this.hulk.mint(bob, "100", {
      from: alice
    });
    this.hulk.mint(carol, "100", {
      from: alice
    });
  });

  it("should not allow enter if not enough approve", async () => {
    await expectRevert(
      this.bar.enter("100", {
        from: alice
      }),
      "ERC20: transfer amount exceeds allowance"
    );
    await this.hulk.approve(this.bar.address, "50", {
      from: alice
    });
    await expectRevert(
      this.bar.enter("100", {
        from: alice
      }),
      "ERC20: transfer amount exceeds allowance"
    );
    await this.hulk.approve(this.bar.address, "100", {
      from: alice
    });
    await this.bar.enter("100", {
      from: alice
    });
    assert.equal((await this.bar.balanceOf(alice)).valueOf().toString(), "100");
  });

  it("should not allow withraw more than what you have", async () => {
    await this.hulk.approve(this.bar.address, "100", {
      from: alice
    });
    await this.bar.enter("100", {
      from: alice
    });
    await expectRevert(
      this.bar.leave("200", {
        from: alice
      }),
      "ERC20: burn amount exceeds balance"
    );
  });

  it("should work with more than one participant", async () => {
    await this.hulk.approve(this.bar.address, "100", {
      from: alice
    });
    await this.hulk.approve(this.bar.address, "100", {
      from: bob
    });
    // Alice enters and gets 20 shares. Bob enters and gets 10 shares.
    await this.bar.enter("20", {
      from: alice
    });
    await this.bar.enter("10", {
      from: bob
    });
    assert.equal((await this.bar.balanceOf(alice)).valueOf().toString(), "20");
    assert.equal((await this.bar.balanceOf(bob)).valueOf().toString(), "10");
    assert.equal(
      (await this.hulk.balanceOf(this.bar.address)).valueOf().toString(),
      "30"
    );
    // HulkBoat get 20 more Hulks from an external source.
    await this.hulk.transfer(this.bar.address, "20", {
      from: carol
    });
    // Alice deposits 10 more Hulks. She should receive 10*30/50 = 6 shares.
    await this.bar.enter("10", {
      from: alice
    });
    assert.equal((await this.bar.balanceOf(alice)).valueOf().toString(), "26");
    assert.equal((await this.bar.balanceOf(bob)).valueOf().toString(), "10");
    // Bob withdraws 5 shares. He should receive 5*60/36 = 8 shares
    await this.bar.leave("5", {
      from: bob
    });
    assert.equal((await this.bar.balanceOf(alice)).valueOf().toString(), "26");
    assert.equal((await this.bar.balanceOf(bob)).valueOf().toString(), "5");
    assert.equal(
      (await this.hulk.balanceOf(this.bar.address)).valueOf().toString(),
      "52"
    );
    assert.equal(
      (await this.hulk.balanceOf(alice)).valueOf().toString(),
      "70"
    );
    assert.equal((await this.hulk.balanceOf(bob)).valueOf().toString(), "98");
  });
});