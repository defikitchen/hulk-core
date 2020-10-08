const {expectRevert, time} = require("@openzeppelin/test-helpers");
const ethers = require("ethers");
const LunchToken = artifacts.require("LunchToken");
const LunchLady = artifacts.require("LunchLady");
const MockERC20 = artifacts.require("MockERC20");
const Timelock = artifacts.require("Timelock");

function encodeParameters(types, values) {
  const abi = new ethers.utils.AbiCoder();
  return abi.encode(types, values);
}

contract("Timelock", ([alice, bob, carol, dev, minter]) => {
  beforeEach(async () => {
    this.lunch = await LunchToken.new({from: alice});
    this.timelock = await Timelock.new(bob, "259200", {from: alice});
  });

  it("should not allow non-owner to do operation", async () => {
    await this.lunch.transferOwnership(this.timelock.address, {from: alice});
    await expectRevert(
      this.lunch.transferOwnership(carol, {from: alice}),
      "Ownable: caller is not the owner"
    );
    await expectRevert(
      this.lunch.transferOwnership(carol, {from: bob}),
      "Ownable: caller is not the owner"
    );
    await expectRevert(
      this.timelock.queueTransaction(
        this.lunch.address,
        "0",
        "transferOwnership(address)",
        encodeParameters(["address"], [carol]),
        (await time.latest()).add(time.duration.days(4)),
        {from: alice}
      ),
      "Timelock::queueTransaction: Call must come from admin."
    );
  });

  it("should do the timelock thing", async () => {
    await this.lunch.transferOwnership(this.timelock.address, {from: alice});
    const eta = (await time.latest()).add(time.duration.days(4));
    await this.timelock.queueTransaction(
      this.lunch.address,
      "0",
      "transferOwnership(address)",
      encodeParameters(["address"], [carol]),
      eta,
      {from: bob}
    );
    await time.increase(time.duration.days(1));
    await expectRevert(
      this.timelock.executeTransaction(
        this.lunch.address,
        "0",
        "transferOwnership(address)",
        encodeParameters(["address"], [carol]),
        eta,
        {from: bob}
      ),
      "Timelock::executeTransaction: Transaction hasn't surpassed time lock."
    );
    await time.increase(time.duration.days(4));
    await this.timelock.executeTransaction(
      this.lunch.address,
      "0",
      "transferOwnership(address)",
      encodeParameters(["address"], [carol]),
      eta,
      {from: bob}
    );
    assert.equal((await this.lunch.owner()).valueOf(), carol);
  });

  it("should also work with LunchLady", async () => {
    this.lp1 = await MockERC20.new("LPToken", "LP", "10000000000", {
      from: minter,
    });
    this.lp2 = await MockERC20.new("LPToken", "LP", "10000000000", {
      from: minter,
    });
    this.lady = await LunchLady.new(
      this.lunch.address,
      dev,
      "1000",
      "0",
      "1000",
      {from: alice}
    );
    await this.lunch.transferOwnership(this.lady.address, {from: alice});
    await this.lady.add("100", this.lp1.address, true);
    await this.lady.transferOwnership(this.timelock.address, {from: alice});
    const eta = (await time.latest()).add(time.duration.days(4));
    await this.timelock.queueTransaction(
      this.lady.address,
      "0",
      "set(uint256,uint256,bool)",
      encodeParameters(["uint256", "uint256", "bool"], ["0", "200", false]),
      eta,
      {from: bob}
    );
    await this.timelock.queueTransaction(
      this.lady.address,
      "0",
      "add(uint256,address,bool)",
      encodeParameters(
        ["uint256", "address", "bool"],
        ["100", this.lp2.address, false]
      ),
      eta,
      {from: bob}
    );
    await time.increase(time.duration.days(4));
    await this.timelock.executeTransaction(
      this.lady.address,
      "0",
      "set(uint256,uint256,bool)",
      encodeParameters(["uint256", "uint256", "bool"], ["0", "200", false]),
      eta,
      {from: bob}
    );
    await this.timelock.executeTransaction(
      this.lady.address,
      "0",
      "add(uint256,address,bool)",
      encodeParameters(
        ["uint256", "address", "bool"],
        ["100", this.lp2.address, false]
      ),
      eta,
      {from: bob}
    );
    assert.equal((await this.lady.poolInfo("0")).valueOf().allocPoint, "200");
    assert.equal(
      (await this.lady.totalAllocPoint()).valueOf().toString(),
      "300"
    );
    assert.equal((await this.lady.poolLength()).valueOf().toString(), "2");
  });
});
