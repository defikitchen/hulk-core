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

    it("should transfer ownership of the token back and forth", async () => {
      this.farmer = await Farmer.new(
        this.token.address,
        dev, {
          from: alice,
        }
      );
      await this.token.transferOwnership(this.farmer.address, {
        from: alice,
      });
      await this.farmer.giveOwnership(dev)
    });
  });