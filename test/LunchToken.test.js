const {expectRevert} = require("@openzeppelin/test-helpers");
const LunchToken = artifacts.require("LunchToken");

contract("LunchToken", ([alice, bob, carol]) => {
  beforeEach(async () => {
    this.lunch = await LunchToken.new({from: alice});
  });

  it("should have correct name and symbol and decimal", async () => {
    const name = await this.lunch.name();
    const symbol = await this.lunch.symbol();
    const decimals = await this.lunch.decimals();
    assert.equal(name.valueOf().toString(), "LunchToken");
    assert.equal(symbol.valueOf().toString(), "LUNCH");
    assert.equal(decimals.valueOf().toString(), "18");
  });

  it("should only allow owner to mint token", async () => {
    await this.lunch.mint(alice, "100", {from: alice});
    await this.lunch.mint(bob, "1000", {from: alice});
    await expectRevert(
      this.lunch.mint(carol, "1000", {from: bob}),
      "Ownable: caller is not the owner"
    );
    const totalSupply = await this.lunch.totalSupply();
    const aliceBal = await this.lunch.balanceOf(alice);
    const bobBal = await this.lunch.balanceOf(bob);
    const carolBal = await this.lunch.balanceOf(carol);
    assert.equal(totalSupply.valueOf().toString(), "1100");
    assert.equal(aliceBal.valueOf().toString(), "100");
    assert.equal(bobBal.valueOf().toString(), "1000");
    assert.equal(carolBal.valueOf().toString(), "0");
  });

  it("should supply token transfers properly", async () => {
    await this.lunch.mint(alice, "100", {from: alice});
    await this.lunch.mint(bob, "1000", {from: alice});
    await this.lunch.transfer(carol, "10", {from: alice});
    await this.lunch.transfer(carol, "100", {from: bob});
    const totalSupply = await this.lunch.totalSupply();
    const aliceBal = await this.lunch.balanceOf(alice);
    const bobBal = await this.lunch.balanceOf(bob);
    const carolBal = await this.lunch.balanceOf(carol);
    assert.equal(totalSupply.valueOf().toString(), "1100");
    assert.equal(aliceBal.valueOf().toString(), "90");
    assert.equal(bobBal.valueOf().toString(), "900");
    assert.equal(carolBal.valueOf().toString(), "110");
  });

  it("should fail if you try to do bad transfers", async () => {
    await this.lunch.mint(alice, "100", {from: alice});
    await expectRevert(
      this.lunch.transfer(carol, "110", {from: alice}),
      "ERC20: transfer amount exceeds balance"
    );
    await expectRevert(
      this.lunch.transfer(carol, "1", {from: bob}),
      "ERC20: transfer amount exceeds balance"
    );
  });
});
