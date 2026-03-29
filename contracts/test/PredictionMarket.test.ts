import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { cofhejs, Encryptable } from 'cofhejs/node';

describe('PredictionMarket', () => {
  async function encryptUint128(value: bigint) {
    const [encryptedValue] = await hre.cofhe.expectResultSuccess(
      cofhejs.encrypt([Encryptable.uint128(value)]),
    );

    return encryptedValue;
  }

  async function deployFixture() {
    const [owner, creator, oracle, bettorA, bettorB, disputer] = await ethers.getSigners();
    await hre.cofhe.expectResultSuccess(hre.cofhe.initializeWithHardhatSigner(owner));

    const registry = await ethers.deployContract('OracleRegistry', [ethers.parseEther('1')]);
    await registry.waitForDeployment();

    const predictionMarket = await ethers.deployContract('PredictionMarket', [
      await registry.getAddress(),
      3600,
    ]);
    await predictionMarket.waitForDeployment();

    await registry.setPredictionMarket(await predictionMarket.getAddress());

    const usdc = await ethers.deployContract('MockUSDC');
    await usdc.waitForDeployment();
    await predictionMarket.setAcceptedCollateral(await usdc.getAddress(), true);

    await usdc.mint(bettorA.address, 10_000_000n);
    await usdc.mint(bettorB.address, 10_000_000n);
    await usdc.mint(disputer.address, 10_000_000n);

    return {
      owner,
      creator,
      oracle,
      bettorA,
      bettorB,
      disputer,
      registry,
      predictionMarket,
      usdc,
    };
  }

  async function latestTimestamp(): Promise<number> {
    const latestBlock = await ethers.provider.getBlock('latest');

    if (!latestBlock) {
      throw new Error('Latest block was not found.');
    }

    return latestBlock.timestamp;
  }

  async function moveTime(seconds: number): Promise<void> {
    await ethers.provider.send('evm_increaseTime', [seconds]);
    await ethers.provider.send('evm_mine', []);
  }

  it('creates an ETH market, accepts bets, finalizes, and pays winners', async () => {
    const { creator, oracle, bettorA, bettorB, registry, predictionMarket } = await deployFixture();
    const expiryTime = (await latestTimestamp()) + 60;

    await predictionMarket.connect(creator).createMarket(
      'Will ETH be above $4,000 on June 30?',
      'Macro',
      0,
      ['YES', 'NO'],
      expiryTime,
      ethers.ZeroAddress,
      100n,
    );

    await predictionMarket.connect(bettorA).placeBet(
      0,
      0,
      300n,
      await encryptUint128(300n),
      { value: 300n },
    );
    await predictionMarket.connect(bettorB).placeBet(
      0,
      1,
      200n,
      await encryptUint128(200n),
      { value: 200n },
    );

    expect(await predictionMarket.getOutcomeLiquidity(0, 0)).to.equal(300n);
    expect(await predictionMarket.getOutcomeLiquidity(0, 1)).to.equal(200n);

    const encryptedHandle = await predictionMarket.getEncryptedOutcomeTotalHandle(0, 0);
    expect(encryptedHandle).to.not.equal(0n);

    await registry.connect(oracle).register({ value: ethers.parseEther('1') });
    await moveTime(61);

    await predictionMarket.connect(oracle).proposeOutcome(0, 0);
    await moveTime(3601);
    await predictionMarket.finalizeMarket(0);

    expect(await predictionMarket.getClaimableAmount(0, bettorA.address)).to.equal(500n);

    await expect(() => predictionMarket.connect(bettorA).claimReward(0)).to.changeEtherBalances(
      [predictionMarket, bettorA],
      [-500n, 500n],
    );
  });

  it('supports multi-outcome ERC20 markets inside the singleton', async () => {
    const { creator, oracle, bettorA, bettorB, registry, predictionMarket, usdc } =
      await deployFixture();
    const expiryTime = (await latestTimestamp()) + 60;

    await predictionMarket.connect(creator).createMarket(
      'Which L2 leads stablecoin volume this quarter?',
      'Infra',
      1,
      ['BASE', 'ARB', 'OP'],
      expiryTime,
      await usdc.getAddress(),
      500_000n,
    );

    await usdc.connect(bettorA).approve(await predictionMarket.getAddress(), 1_000_000n);
    await usdc.connect(bettorB).approve(await predictionMarket.getAddress(), 2_000_000n);

    await predictionMarket.connect(bettorA).placeBet(0, 2, 1_000_000n, await encryptUint128(1_000_000n));
    await predictionMarket.connect(bettorB).placeBet(0, 1, 2_000_000n, await encryptUint128(2_000_000n));

    expect(await usdc.balanceOf(await predictionMarket.getAddress())).to.equal(3_000_000n);

    await registry.connect(oracle).register({ value: ethers.parseEther('1') });
    await moveTime(61);

    await predictionMarket.connect(oracle).proposeOutcome(0, 2);
    await moveTime(3601);
    await predictionMarket.finalizeMarket(0);

    expect(await predictionMarket.getClaimableAmount(0, bettorA.address)).to.equal(3_000_000n);

    await expect(() => predictionMarket.connect(bettorA).claimReward(0)).to.changeTokenBalances(
      usdc,
      [predictionMarket, bettorA],
      [-3_000_000n, 3_000_000n],
    );
  });

  it('supports disputes, admin resolution, and dispute refunds', async () => {
    const { owner, creator, oracle, bettorA, bettorB, disputer, registry, predictionMarket } =
      await deployFixture();
    const expiryTime = (await latestTimestamp()) + 60;

    await predictionMarket.connect(creator).createMarket(
      'Will the first FHE-native consumer app hit 100k MAU?',
      'FHE',
      0,
      ['YES', 'NO'],
      expiryTime,
      ethers.ZeroAddress,
      100n,
    );

    await predictionMarket.connect(bettorA).placeBet(
      0,
      0,
      100n,
      await encryptUint128(100n),
      { value: 100n },
    );
    await predictionMarket.connect(bettorB).placeBet(
      0,
      1,
      200n,
      await encryptUint128(200n),
      { value: 200n },
    );

    await registry.connect(oracle).register({ value: ethers.parseEther('2') });
    await moveTime(61);

    await predictionMarket.connect(oracle).proposeOutcome(0, 0);
    await predictionMarket.connect(disputer).disputeOutcome(0, 50n, { value: 50n });
    await moveTime(3601);

    await predictionMarket.connect(owner).resolveDispute(0, 1, ethers.parseEther('0.5'));

    const oracleProfile = await registry.getOracle(oracle.address);
    expect(oracleProfile.stakedAmount).to.equal(ethers.parseEther('1.5'));

    await expect(() =>
      predictionMarket.connect(disputer).claimDisputeRefund(0),
    ).to.changeEtherBalances([predictionMarket, disputer], [-50n, 50n]);

    await expect(() => predictionMarket.connect(bettorB).claimReward(0)).to.changeEtherBalances(
      [predictionMarket, bettorB],
      [-300n, 300n],
    );
  });

  it('rejects unwhitelisted ERC20 collateral and non-oracle proposals', async () => {
    const { creator, bettorA, predictionMarket, usdc } = await deployFixture();
    const expiryTime = (await latestTimestamp()) + 60;

    await predictionMarket.setAcceptedCollateral(await usdc.getAddress(), false);

    await expect(
      predictionMarket.connect(creator).createMarket(
        'Will BTC hit $100k?',
        'Macro',
        0,
        ['YES', 'NO'],
        expiryTime,
        await usdc.getAddress(),
        100n,
      ),
    ).to.be.revertedWith('Collateral token is not whitelisted');

    await predictionMarket.connect(creator).createMarket(
      'Will BTC hit $100k?',
      'Macro',
      0,
      ['YES', 'NO'],
      expiryTime,
      ethers.ZeroAddress,
      100n,
    );

    await moveTime(61);

    await expect(predictionMarket.connect(bettorA).proposeOutcome(0, 0)).to.be.revertedWith(
      'Caller is not a registered oracle',
    );
  });
});
