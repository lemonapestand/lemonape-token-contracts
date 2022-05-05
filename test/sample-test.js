const { expect, use } = require("chai");
const { ethers } = require("hardhat");
const { solidity } = require("ethereum-waffle");
const routerAbi = require("../abi/UniswapV2Router02.json");
const wethAbi = require("../abi/WETH9.json");
const uniswapV2Pair = require("../abi/IUniswapV2Pair.json");
use(solidity);
let potion;
let lannabe;
let minterRole;
let weth;
let owner;
let addr1;
let addr2;
let addrs;
describe("Potion", function () {
  const wethAddress = "0xC6ea630BE54bC19b588f276f753d57A260796c7e";
  const uniswapRouterAddress = "0x485aD1c33cEF6DB538bBBb6f59221598e389c286";
  //https://ethereum.stackexchange.com/a/99969
  beforeEach(async function () {
    // provider = ethers.getDefaultProvider();
    provider = new ethers.providers.JsonRpcProvider("http://localhost:7545");// For hardhat network
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
    const Potion = await ethers.getContractFactory(
      "Potion"
    );
    potion = await Potion.deploy();
    await potion.deployed();
    const LANNABE = await ethers.getContractFactory("LANNABE");
    lannabe = await LANNABE.deploy(
       [owner.address, addr1.address, addr2.address, addr3.address],potion.address
    );
    await lannabe.deployed();
    minterRole = await potion.MINTER_ROLE();
    await potion.grantRole(minterRole, lannabe.address);
    // const WETH = await ethers.getContractFactory(
    //   "WETH9"
    // );
    // weth = await WETH.deploy();
    
    weth = await new ethers.Contract(wethAddress,wethAbi.abi,provider);
    await weth.deployed();
    const options = {value: ethers.utils.parseEther("0.01")};
    await weth.connect(owner).deposit(options);
  });
  it("Owner account has 10 billion Lannabe", async function () {
    let balance = await lannabe.balanceOf(owner.address);
    return expect(balance).to.equal(ethers.BigNumber.from("10000000000000000000"));
  });
  it("Lannabe contract has the role to mint", async function () {
    return expect(await potion.hasRole(minterRole,lannabe.address));
  });
  it("Owner provide liquidity to Lannabe-WETH pair", async function () {
    const DEADLINE = '2000000000';
    const uniswapV2Router02Instance = await new ethers.Contract(uniswapRouterAddress,routerAbi.abi,provider);
    //Approve
    await lannabe.approve(uniswapV2Router02Instance.address, ethers.constants.MaxUint256);
    await uniswapV2Router02Instance.connect(owner).addLiquidityETH(lannabe.address,(10000000 * 10 ** 9).toString(),1,1,owner.address,DEADLINE,
    { value: (1 * 10 ** 18).toString()})
    let balance = await lannabe.balanceOf(owner.address);
    return expect(balance).to.equal("9990000000000000000");
  });
  it("Drop POTION for every new leader", async function () {
    const DEADLINE = '2000000000';
    const uniswapV2Router02Instance = await new ethers.Contract(uniswapRouterAddress,routerAbi.abi,provider);
    //Approve
    await lannabe.approve(uniswapV2Router02Instance.address, ethers.constants.MaxUint256);
    await uniswapV2Router02Instance.connect(owner).addLiquidityETH(lannabe.address,(10000000 * 10 ** 9).toString(),1,1,owner.address,DEADLINE,
    { value: (1 * 10 ** 18).toString()})
    let balance = await lannabe.balanceOf(owner.address);
    expect(balance).to.equal("9990000000000000000");
    const options = {value: ethers.utils.parseEther("0.1")};
    await weth.connect(addr1).deposit(options);
    //Enable trading
    await lannabe.connect(owner).launch();
    const firstBuyOptions = {value: ethers.utils.parseEther("0.00011")};
    await uniswapV2Router02Instance.connect(addr1).swapExactETHForTokensSupportingFeeOnTransferTokens(1,
      [wethAddress,lannabe.address],
      addr1.address,
      DEADLINE,firstBuyOptions)
    expect(await lannabe.balanceOf(addr1.address)).to.be.above(0)
    expect(await potion.balanceOf(addr1.address)).to.equal(1)
    const secondBuyOptions = {value: ethers.utils.parseEther("0.012")};
    await uniswapV2Router02Instance.connect(addr2).swapExactETHForTokensSupportingFeeOnTransferTokens(1,
      [wethAddress,lannabe.address],
      addr2.address,
      DEADLINE,secondBuyOptions)
    expect(await lannabe.balanceOf(addr2.address)).to.be.above(0)
    let leaderInfo = await lannabe.getLeaderInfo()
    expect(leaderInfo[0]).to.equal(addr2.address)
    return expect(await potion.balanceOf(addr2.address)).to.equal(1)
  });
});
