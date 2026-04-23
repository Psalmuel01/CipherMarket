import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('PredictionMarket Wave 3A', () => {
  async function deployFixture() {
    const [owner, creator, proposerOracle, committeeOracle, extraOracle, traderA, traderB, disputer] =
      await ethers.getSigners();

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
      proposerOracle,
      committeeOracle,
      extraOracle,
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

  it('supports committee finalization, successful disputes, proposer slashing, and winner redemption', async () => {
    const { creator, proposerOracle, committeeOracle, traderA, traderB, disputer, registry, predictionMarket } =
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

    const yesQuote = await predictionMarket.quoteBuy(0, 0, 500n);
    await predictionMarket.connect(traderA).buyShares(0, 0, 500n, yesQuote.sharesOut, { value: 500n });

    const noQuote = await predictionMarket.quoteBuy(0, 1, 400n);
    await predictionMarket.connect(traderB).buyShares(0, 1, 400n, noQuote.sharesOut, { value: 400n });

    await registry.connect(proposerOracle).register({ value: ethers.parseEther('2') });
    await registry.connect(committeeOracle).register({ value: ethers.parseEther('3') });

    await moveTime(61);

    await predictionMarket.connect(proposerOracle).proposeOutcome(0, 0);
    await predictionMarket.connect(disputer).openDispute(0, 1, 50n, { value: 50n });
    await predictionMarket.connect(proposerOracle).voteOnResolution(0, 0);
    await predictionMarket.connect(committeeOracle).voteOnResolution(0, 1);

    const voteWeights = await predictionMarket.getOutcomeVoteWeight(0);
    expect(voteWeights).to.deep.equal([ethers.parseEther('2'), ethers.parseEther('3')]);

    await moveTime(3601);
    await predictionMarket.finalizeByQuorum(0);

    const market = await predictionMarket.getMarket(0);
    expect(market.committeeResolved).to.equal(true);
    expect(market.finalOutcome).to.equal(1);
    expect(market.disputeRefundsEnabled).to.equal(true);

    const proposerProfile = await registry.getOracle(proposerOracle.address);
    expect(proposerProfile.stakedAmount).to.equal(ethers.parseEther('1.6'));

    await expect(() =>
      predictionMarket.connect(disputer).claimDisputeRefund(0),
    ).to.changeEtherBalances([predictionMarket, disputer], [-50n, 50n]);

    await predictionMarket.connect(traderB).requestRedeemPositionDecrypt(0);
    await settleDecryptResult();
    await expect(() =>
      predictionMarket.connect(traderB).redeemShares(0),
    ).to.changeEtherBalances([predictionMarket, traderB], [-noQuote.sharesOut, noQuote.sharesOut]);

    await expect(
      predictionMarket.connect(committeeOracle).claimOracleResolutionReward(0),
    ).to.be.revertedWith('No oracle reward pool available');
  });

  it('routes failed dispute stake to winning oracle voters and protocol using vote-time stake snapshots', async () => {
    const { owner, creator, proposerOracle, committeeOracle, traderA, disputer, registry, predictionMarket } =
      await deployFixture();
    const expiryTime = (await latestTimestamp()) + 60;

    await predictionMarket.connect(creator).createMarket(
      'Will ETH volatility stay above 80?',
      'Resolution based on the official volatility source.',
      'Crypto',
      'https://issuer.example/volatility',
      0,
      ['YES', 'NO'],
      expiryTime,
      ethers.ZeroAddress,
      100n,
      1_000n,
      { value: 1_000n },
    );

    const buyQuote = await predictionMarket.quoteBuy(0, 0, 500n);
    await predictionMarket.connect(traderA).buyShares(0, 0, 500n, buyQuote.sharesOut, { value: 500n });

    await registry.connect(proposerOracle).register({ value: ethers.parseEther('2') });
    await registry.connect(committeeOracle).register({ value: ethers.parseEther('3') });

    await moveTime(61);

    await predictionMarket.connect(proposerOracle).proposeOutcome(0, 0);
    await predictionMarket.connect(disputer).openDispute(0, 1, 100n, { value: 100n });
    await predictionMarket.connect(proposerOracle).voteOnResolution(0, 0);
    await predictionMarket.connect(committeeOracle).voteOnResolution(0, 0);

    await registry.connect(committeeOracle).increaseStake({ value: ethers.parseEther('1') });

    await moveTime(3601);
    await predictionMarket.finalizeByQuorum(0);

    const market = await predictionMarket.getMarket(0);
    expect(market.finalOutcome).to.equal(0);
    expect(market.committeeRewardPool).to.equal(80n);
    expect(market.protocolDisputeFees).to.equal(20n);
    expect(market.disputeRefundsEnabled).to.equal(false);

    await expect(() =>
      predictionMarket.connect(proposerOracle).claimOracleResolutionReward(0),
    ).to.changeEtherBalances([predictionMarket, proposerOracle], [-32n, 32n]);

    await expect(() =>
      predictionMarket.connect(committeeOracle).claimOracleResolutionReward(0),
    ).to.changeEtherBalances([predictionMarket, committeeOracle], [-48n, 48n]);

    await expect(() =>
      predictionMarket.connect(owner).claimProtocolFees(0),
    ).to.changeEtherBalances([predictionMarket, owner], [-21n, 21n]);

    await expect(predictionMarket.connect(disputer).claimDisputeRefund(0)).to.be.revertedWith(
      'Dispute refund is not available',
    );
  });

  it('escalates unresolved committee markets and restricts oracle rewards to committee-resolved outcomes', async () => {
    const { owner, creator, proposerOracle, committeeOracle, registry, predictionMarket } =
      await deployFixture();
    const expiryTime = (await latestTimestamp()) + 60;

    await predictionMarket.connect(creator).createMarket(
      'Will a new privacy L2 ship this quarter?',
      'Resolution based on the announced mainnet launch.',
      'Infra',
      'https://issuer.example/privacy-l2',
      0,
      ['YES', 'NO'],
      expiryTime,
      ethers.ZeroAddress,
      100n,
      1_000n,
      { value: 1_000n },
    );

    await registry.connect(proposerOracle).register({ value: ethers.parseEther('2') });
    await registry.connect(committeeOracle).register({ value: ethers.parseEther('2') });

    await moveTime(61);

    await predictionMarket.connect(proposerOracle).proposeOutcome(0, 0);
    await predictionMarket.connect(proposerOracle).voteOnResolution(0, 0);
    await predictionMarket.connect(committeeOracle).voteOnResolution(0, 1);

    await moveTime(3601);
    await expect(predictionMarket.finalizeByQuorum(0)).to.be.revertedWith('Market requires escalation');

    await predictionMarket.escalateIfUnresolved(0);
    const escalatedMarket = await predictionMarket.getMarket(0);
    expect(escalatedMarket.state).to.equal(3);
    expect(escalatedMarket.escalationDeadline).to.be.greaterThan(0n);

    await predictionMarket.connect(owner).resolveEscalated(0, 1);
    const finalizedMarket = await predictionMarket.getMarket(0);
    expect(finalizedMarket.committeeResolved).to.equal(false);
    expect(finalizedMarket.finalOutcome).to.equal(1);

    await expect(
      predictionMarket.connect(committeeOracle).claimOracleResolutionReward(0),
    ).to.be.revertedWith('Oracle rewards require committee finalization');
  });

  it('rejects invalid market creation, invalid secure sells, premature finalization, and late oracle votes', async () => {
    const { creator, proposerOracle, traderA, predictionMarket, registry, usdc } = await deployFixture();
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

    await registry.connect(proposerOracle).register({ value: ethers.parseEther('2') });
    await moveTime(61);

    await predictionMarket.connect(proposerOracle).proposeOutcome(0, 0);
    await predictionMarket.connect(proposerOracle).voteOnResolution(0, 0);

    await expect(predictionMarket.finalizeByQuorum(0)).to.be.revertedWith(
      'Resolution window is still open',
    );

    await moveTime(3601);
    await expect(
      predictionMarket.connect(proposerOracle).voteOnResolution(0, 1),
    ).to.be.revertedWith('Resolution window has closed');
  });
});
