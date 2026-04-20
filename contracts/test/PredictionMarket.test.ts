import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('PredictionMarket', () => {
  async function deployFixture() {
    const [owner, creator, oracle, traderA, traderB, disputer] = await ethers.getSigners();

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

    await usdc.mint(creator.address, 20_000_000n);
    await usdc.mint(traderA.address, 20_000_000n);
    await usdc.mint(traderB.address, 20_000_000n);
    await usdc.mint(disputer.address, 20_000_000n);

    return {
      owner,
      creator,
      oracle,
      traderA,
      traderB,
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

  async function settleDecryptResult(): Promise<void> {
    await moveTime(11);
  }

  it('creates an ETH market with metadata, equal reserve splits, and stable buy quotes', async () => {
    const { creator, predictionMarket } = await deployFixture();
    const expiryTime = (await latestTimestamp()) + 60;

    await predictionMarket.connect(creator).createMarket(
      'Will ETH settle above $5,000 by year end?',
      'Tracks the year-end ETH close against a fixed threshold.',
      'Macro',
      'https://example.com/eth-settlement',
      0,
      ['YES', 'NO'],
      expiryTime,
      ethers.ZeroAddress,
      100n,
      1_000n,
      { value: 1_000n },
    );

    const market = await predictionMarket.getMarket(0);
    expect(market.seedLiquidity).to.equal(1_000n);
    expect(market.description).to.equal('Tracks the year-end ETH close against a fixed threshold.');
    expect(market.oracleSource).to.equal('https://example.com/eth-settlement');
    expect(await predictionMarket.getOutcomeReserves(0)).to.deep.equal([500n, 500n]);

    const quote = await predictionMarket.quoteBuy(0, 0, 500n);
    expect(quote.sharesOut).to.be.greaterThan(0n);
    expect(quote.feeAmount).to.equal(5n);
    expect(quote.avgPrice).to.be.greaterThan(0n);
    expect(quote[3][0]).to.be.greaterThan(quote[3][1]);
  });

  it('executes ETH buy and sell trades while keeping only encrypted user balances', async () => {
    const { creator, traderA, predictionMarket } = await deployFixture();
    const expiryTime = (await latestTimestamp()) + 60;

    await predictionMarket.connect(creator).createMarket(
      'Will ETH settle above $5,000 by year end?',
      'Tracks the year-end ETH close against a fixed threshold.',
      'Macro',
      'https://example.com/eth-settlement',
      0,
      ['YES', 'NO'],
      expiryTime,
      ethers.ZeroAddress,
      100n,
      1_000n,
      { value: 1_000n },
    );

    const buyQuote = await predictionMarket.quoteBuy(0, 0, 500n);
    await predictionMarket.connect(traderA).buyShares(0, 0, 500n, buyQuote.sharesOut, {
      value: 500n,
    });

    expect(await predictionMarket.getEncryptedUserPositionHandle(0, traderA.address, 0)).to.not.equal(0n);
    expect(await predictionMarket.getOutcomeReserves(0)).to.deep.equal([251n, 995n]);

    await predictionMarket.connect(traderA).requestSellPositionDecrypt(0, 0);
    await settleDecryptResult();
    const sellQuote = await predictionMarket.quoteSell(0, 0, 100n);
    await expect(() =>
      predictionMarket.connect(traderA).sellShares(0, 0, 100n, sellQuote.collateralOut),
    ).to.changeEtherBalances([predictionMarket, traderA], [-sellQuote.collateralOut, sellQuote.collateralOut]);

    expect(await predictionMarket.getOutcomeReserves(0)).to.deep.equal([273n, 917n]);
  });

  it('supports categorical ERC20 markets and creator LP surplus after redemption', async () => {
    const { creator, traderA, traderB, oracle, registry, predictionMarket, usdc } =
      await deployFixture();
    const expiryTime = (await latestTimestamp()) + 60;

    await usdc.connect(creator).approve(await predictionMarket.getAddress(), 3_000_000n);
    await predictionMarket.connect(creator).createMarket(
      'Which L2 leads stablecoin volume this quarter?',
      'Compares Base, Arbitrum, and Optimism by stablecoin settlement volume.',
      'Infra',
      'https://issuer.example/volume-report',
      1,
      ['BASE', 'ARB', 'OP'],
      expiryTime,
      await usdc.getAddress(),
      100_000n,
      3_000_000n,
    );

    expect(await predictionMarket.getOutcomeReserves(0)).to.deep.equal([1_000_000n, 1_000_000n, 1_000_000n]);

    await usdc.connect(traderA).approve(await predictionMarket.getAddress(), 1_000_000n);
    await usdc.connect(traderB).approve(await predictionMarket.getAddress(), 2_000_000n);

    const quoteA = await predictionMarket.quoteBuy(0, 2, 1_000_000n);
    await predictionMarket.connect(traderA).buyShares(0, 2, 1_000_000n, quoteA.sharesOut);

    const quoteB = await predictionMarket.quoteBuy(0, 1, 2_000_000n);
    await predictionMarket.connect(traderB).buyShares(0, 1, 2_000_000n, quoteB.sharesOut);

    await registry.connect(oracle).register({ value: ethers.parseEther('1') });
    await moveTime(61);

    await predictionMarket.connect(oracle).proposeOutcome(0, 2);
    await moveTime(3601);
    await predictionMarket.finalizeMarket(0);

    await predictionMarket.connect(traderA).requestRedeemPositionDecrypt(0);
    await settleDecryptResult();
    await expect(() =>
      predictionMarket.connect(traderA).redeemShares(0),
    ).to.changeTokenBalances(usdc, [predictionMarket, traderA], [-quoteA.sharesOut, quoteA.sharesOut]);

    const finalizedMarket = await predictionMarket.getMarket(0);
    const expectedLpPayout =
      finalizedMarket.totalCollateralCollected -
      finalizedMarket.remainingWinningShares -
      finalizedMarket.accruedProtocolFees;

    await expect(() =>
      predictionMarket.connect(creator).claimLpPayout(0),
    ).to.changeTokenBalances(usdc, [predictionMarket, creator], [-expectedLpPayout, expectedLpPayout]);
  });

  it('supports disputes, oracle locks, admin resolution, protocol fees, and selective refunds', async () => {
    const { owner, creator, traderA, traderB, oracle, disputer, registry, predictionMarket } =
      await deployFixture();
    const expiryTime = (await latestTimestamp()) + 60;

    await predictionMarket.connect(creator).createMarket(
      'Will the first FHE-native consumer app hit 100k MAU?',
      'Resolution based on the issuer-published MAU report.',
      'FHE',
      'https://issuer.example/mau-report',
      0,
      ['YES', 'NO'],
      expiryTime,
      ethers.ZeroAddress,
      100n,
      1_000n,
      { value: 1_000n },
    );

    const quoteA = await predictionMarket.quoteBuy(0, 0, 500n);
    await predictionMarket.connect(traderA).buyShares(0, 0, 500n, quoteA.sharesOut, { value: 500n });

    const quoteB = await predictionMarket.quoteBuy(0, 1, 400n);
    await predictionMarket.connect(traderB).buyShares(0, 1, 400n, quoteB.sharesOut, { value: 400n });

    await registry.connect(oracle).register({ value: ethers.parseEther('2') });
    await moveTime(61);

    await predictionMarket.connect(oracle).proposeOutcome(0, 0);
    expect(await registry.getOracleProposalLocks(oracle.address)).to.equal(1n);
    await expect(registry.connect(oracle).deregister()).to.be.revertedWith('Oracle has active proposal lock');

    await predictionMarket.connect(disputer).disputeOutcome(0, 50n, { value: 50n });
    await moveTime(3601);

    await predictionMarket.connect(owner).resolveDispute(0, 1, ethers.parseEther('0.5'));
    expect(await registry.getOracleProposalLocks(oracle.address)).to.equal(0n);

    const oracleProfile = await registry.getOracle(oracle.address);
    expect(oracleProfile.stakedAmount).to.equal(ethers.parseEther('1.5'));

    await expect(() =>
      predictionMarket.connect(disputer).claimDisputeRefund(0),
    ).to.changeEtherBalances([predictionMarket, disputer], [-50n, 50n]);

    await predictionMarket.connect(traderB).requestRedeemPositionDecrypt(0);
    await settleDecryptResult();
    await expect(() =>
      predictionMarket.connect(traderB).redeemShares(0),
    ).to.changeEtherBalances([predictionMarket, traderB], [-quoteB.sharesOut, quoteB.sharesOut]);

    const resolvedMarket = await predictionMarket.getMarket(0);
    await expect(() =>
      predictionMarket.connect(owner).claimProtocolFees(0),
    ).to.changeEtherBalances(
      [predictionMarket, owner],
      [-resolvedMarket.accruedProtocolFees, resolvedMarket.accruedProtocolFees],
    );
  });

  it('rejects invalid market creation, unwhitelisted collateral, and invalid secure sells', async () => {
    const { creator, traderA, predictionMarket, usdc } = await deployFixture();
    const expiryTime = (await latestTimestamp()) + 60;

    await expect(
      predictionMarket.connect(creator).createMarket(
        'Bad binary market',
        'Invalid outcome set for a binary market.',
        'Macro',
        'https://example.com/source',
        0,
        ['YES', 'NO', 'MAYBE'],
        expiryTime,
        ethers.ZeroAddress,
        100n,
        1_200n,
        { value: 1_200n },
      ),
    ).to.be.revertedWith('Binary markets require two outcomes');

    await predictionMarket.setAcceptedCollateral(await usdc.getAddress(), false);
    await expect(
      predictionMarket.connect(creator).createMarket(
        'Unwhitelisted collateral',
        'Should fail because the ERC20 is not accepted.',
        'Macro',
        'https://example.com/source',
        0,
        ['YES', 'NO'],
        expiryTime,
        await usdc.getAddress(),
        100n,
        1_000_000n,
      ),
    ).to.be.revertedWith('Collateral token is not whitelisted');

    await predictionMarket.connect(creator).createMarket(
      'Will BTC hit $100k?',
      'Simple BTC threshold market.',
      'Macro',
      'https://example.com/source',
      0,
      ['YES', 'NO'],
      expiryTime,
      ethers.ZeroAddress,
      100n,
      1_000n,
      { value: 1_000n },
    );

    await expect(
      predictionMarket.connect(traderA).requestSellPositionDecrypt(0, 0),
    ).to.be.revertedWith('No encrypted position');

    await expect(
      predictionMarket.connect(traderA).sellShares(0, 0, 1n, 0n),
    ).to.be.revertedWith('No encrypted position');

    await expect(
      predictionMarket.connect(creator).createMarket(
        'Uneven seed market',
        'Should fail because total seed cannot be split evenly.',
        'Macro',
        'https://example.com/source',
        1,
        ['A', 'B', 'C'],
        expiryTime,
        ethers.ZeroAddress,
        100n,
        1_001n,
        { value: 1_001n },
      ),
    ).to.be.revertedWith('Seed liquidity must split evenly');
  });
});
