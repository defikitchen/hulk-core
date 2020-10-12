const {
  expectRevert
} = require("@openzeppelin/test-helpers");
const HulkToken = artifacts.require("HulkToken");

contract("HulkToken", ([alice, bob, carol]) => {
  beforeEach(async () => {
    this.hulk = await HulkToken.new({
      from: alice
    });
  });

  it("should have correct name and symbol and decimal", async () => {
    const name = await this.hulk.name();
    const symbol = await this.hulk.symbol();
    const decimals = await this.hulk.decimals();
    assert.equal(name.valueOf().toString(), "HULK.finance");
    assert.equal(symbol.valueOf().toString(), "HULK");
    assert.equal(decimals.valueOf().toString(), "18");
  });

  it("should only allow owner to mint token", async () => {
    await this.hulk.mint(alice, "100", {
      from: alice
    });
    await this.hulk.mint(bob, "1000", {
      from: alice
    });
    await expectRevert(
      this.hulk.mint(carol, "1000", {
        from: bob
      }),
      "Ownable: caller is not the owner"
    );
    const totalSupply = await this.hulk.totalSupply();
    const aliceBal = await this.hulk.balanceOf(alice);
    const bobBal = await this.hulk.balanceOf(bob);
    const carolBal = await this.hulk.balanceOf(carol);
    assert.equal(totalSupply.valueOf().toString(), "1100");
    assert.equal(aliceBal.valueOf().toString(), "100");
    assert.equal(bobBal.valueOf().toString(), "1000");
    assert.equal(carolBal.valueOf().toString(), "0");
  });

  it("should supply token transfers properly", async () => {
    await this.hulk.mint(alice, "100", {
      from: alice
    });
    await this.hulk.mint(bob, "1000", {
      from: alice
    });
    await this.hulk.transfer(carol, "10", {
      from: alice
    });
    await this.hulk.transfer(carol, "100", {
      from: bob
    });
    const totalSupply = await this.hulk.totalSupply();
    const aliceBal = await this.hulk.balanceOf(alice);
    const bobBal = await this.hulk.balanceOf(bob);
    const carolBal = await this.hulk.balanceOf(carol);
    assert.equal(totalSupply.valueOf().toString(), "1100");
    assert.equal(aliceBal.valueOf().toString(), "90");
    assert.equal(bobBal.valueOf().toString(), "900");
    assert.equal(carolBal.valueOf().toString(), "110");
  });

  it("should set up a burn, bonus pool and be able to send from bonus pool", async () => {
    await this.hulk.mint(alice, "1000", {
      from: alice
    });
    await this.hulk.mint(bob, "10000", {
      from: alice
    });
    // TODO
    // turn on burn
    await this.hulk.burnStart(100, 100);

    await this.hulk.transfer(carol, "100", {
      from: alice
    });
    await this.hulk.transfer(carol, "1000", {
      from: bob
    });
    const totalSupply = await this.hulk.totalSupply();
    const aliceBal = await this.hulk.balanceOf(alice);
    const bobBal = await this.hulk.balanceOf(bob);
    const carolBal = await this.hulk.balanceOf(carol);
    assert.equal(totalSupply.valueOf().toString(), "10990");
    assert.equal(aliceBal.valueOf().toString(), "900");
    assert.equal(bobBal.valueOf().toString(), "9000");
    assert.equal(carolBal.valueOf().toString(), "1090");

    const burnPool = await this.hulk.burnPool();
    const bonusPool = await this.hulk.bonusPool();
    assert(burnPool > 0);
    assert(bonusPool > 0);
    await this.hulk.sendBonus(carol, "1");
    await this.hulk.sendBonusMany([carol, bob, alice], ["1", "1", "1"]);

    const totalSupply2 = await this.hulk.totalSupply();
    const aliceBal2 = await this.hulk.balanceOf(alice);
    const bobBal2 = await this.hulk.balanceOf(bob);
    const carolBal2 = await this.hulk.balanceOf(carol);
    assert.equal(totalSupply2.valueOf().toString(), "10990");
    assert.equal(aliceBal2.valueOf().toString(), "901");
    assert.equal(bobBal2.valueOf().toString(), "9001");
    assert.equal(carolBal2.valueOf().toString(), "1092");
  });

  it("should fail if you try to do bad transfers", async () => {
    await this.hulk.mint(alice, "100", {
      from: alice
    });
    await expectRevert(
      this.hulk.transfer(carol, "110", {
        from: alice
      }),
      "ERC20: transfer amount exceeds balance"
    );
    await expectRevert(
      this.hulk.transfer(carol, "1", {
        from: bob
      }),
      "ERC20: transfer amount exceeds balance"
    );
  });
});