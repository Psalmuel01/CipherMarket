// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import '@fhenixprotocol/cofhe-contracts/FHE.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/utils/math/Math.sol';
import './OracleRegistry.sol';
import './PredictionMarketMath.sol';

interface ICoFheTaskManager {
  function allowForDecryption(uint256 ctHash) external;
}

/// @title PredictionMarket
/// @notice Singleton share-based prediction market with public FPMM pool state and encrypted
/// user balances for economic v1 privacy.
contract PredictionMarket is Ownable {
  using SafeERC20 for IERC20;

  uint16 public constant DEFAULT_TRADE_FEE_BPS = 100;
  uint16 public constant DEFAULT_PROTOCOL_FEE_SHARE_BPS = 2_000;
  uint16 public constant BPS_DENOMINATOR = 10_000;
  uint8 public constant MAX_OUTCOMES = 8;
  address private constant COFHE_TASK_MANAGER = 0xeA30c4B8b44078Bbf8a6ef5b9f1eC1626C7848D9;
  uint64 private constant DEFAULT_ESCALATION_TIMEOUT = 10 minutes;
  uint256 private constant PRICE_SCALE = 1e18;

  enum MarketType {
    BINARY,
    CATEGORICAL
  }

  enum MarketState {
    ACTIVE,
    EXPIRED,
    RESOLUTION_OPEN,
    ESCALATED,
    FINALIZED
  }

  struct Market {
    address creator;
    address collateralToken;
    address proposedBy;
    address disputeOpenedBy;
    uint64 createdAt;
    uint64 expiryTime;
    uint64 resolutionWindowEndsAt;
    uint64 escalationDeadline;
    uint128 minimumTrade;
    uint128 seedLiquidity;
    uint128 totalCollateralCollected;
    uint128 disputeStakeTotal;
    uint128 remainingWinningShares;
    uint128 resolutionQuorumStake;
    uint128 committeeRewardPool;
    uint16 tradeFeeBps;
    uint16 protocolFeeShareBps;
    uint8 outcomeCount;
    uint8 proposedOutcome;
    uint8 disputeCounterOutcome;
    uint8 leadingOutcome;
    uint8 finalOutcome;
    MarketType marketType;
    MarketState state;
    bool exists;
    bool lpClaimed;
    bool protocolFeesClaimed;
    bool disputeRefundsEnabled;
    bool disputeOpened;
    bool committeeResolved;
    string title;
    string description;
    string category;
    string oracleSource;
  }

  struct MarketView {
    uint256 marketId;
    address creator;
    address collateralToken;
    address proposedBy;
    address disputeOpenedBy;
    uint64 createdAt;
    uint64 expiryTime;
    uint64 resolutionWindowEndsAt;
    uint64 escalationDeadline;
    uint128 minimumTrade;
    uint128 seedLiquidity;
    uint128 totalCollateralCollected;
    uint128 disputeStakeTotal;
    uint128 remainingWinningShares;
    uint128 resolutionQuorumStake;
    uint128 committeeRewardPool;
    uint128 totalOracleVoteWeight;
    uint128 accruedProtocolFees;
    uint128 accruedLpFees;
    uint128 protocolDisputeFees;
    uint16 tradeFeeBps;
    uint16 protocolFeeShareBps;
    uint8 outcomeCount;
    uint8 proposedOutcome;
    uint8 disputeCounterOutcome;
    uint8 leadingOutcome;
    uint8 finalOutcome;
    MarketType marketType;
    MarketState state;
    bool lpClaimed;
    bool protocolFeesClaimed;
    bool disputeRefundsEnabled;
    bool disputeOpened;
    bool committeeResolved;
    string title;
    string description;
    string category;
    string oracleSource;
    string[] outcomes;
  }

  event AcceptedCollateralUpdated(address indexed token, bool allowed);
  event MarketCreated(
    uint256 indexed marketId,
    address indexed creator,
    address indexed collateralToken,
    uint8 outcomeCount,
    uint256 seedLiquidity,
    string title
  );
  event MarketExpired(uint256 indexed marketId);
  event TradeExecuted(uint256 indexed marketId, bool isBuy);
  event OutcomeProposed(
    uint256 indexed marketId,
    address indexed oracle,
    uint8 indexed outcomeIndex,
    uint64 resolutionWindowEndsAt
  );
  event DisputeOpened(
    uint256 indexed marketId,
    address indexed disputer,
    uint8 indexed counterOutcomeIndex,
    uint256 stakeAmount
  );
  event ResolutionVoteCast(
    uint256 indexed marketId,
    address indexed oracle,
    uint8 indexed outcomeIndex,
    uint256 weight
  );
  event MarketEscalated(uint256 indexed marketId, uint64 escalationDeadline);
  event MarketFinalized(uint256 indexed marketId, uint8 indexed finalOutcome, bool committeeResolved);
  event OracleResolutionRewardClaimed(
    uint256 indexed marketId,
    address indexed oracle,
    uint256 amount
  );
  event LiquidityAdded(
    uint256 indexed marketId,
    address indexed provider,
    uint256 collateralAmount,
    uint256 lpSharesMinted
  );
  event LiquidityRemoved(
    uint256 indexed marketId,
    address indexed provider,
    uint256 collateralAmount,
    uint256 lpSharesBurned
  );
  event LpPayoutClaimed(
    uint256 indexed marketId,
    address indexed recipient,
    uint256 amount,
    uint256 lpSharesBurned
  );
  event ProtocolFeesClaimed(uint256 indexed marketId, address indexed recipient, uint256 amount);
  event DisputeRefundClaimed(uint256 indexed marketId, address indexed account, uint256 refundAmount);
  event DisputeAdapterUpdated(address indexed adapter, bool allowed);
  event ExternalDisputeSettled(uint256 indexed marketId, address indexed adapter, uint256 amount);
  OracleRegistry public immutable oracleRegistry;
  uint64 public immutable defaultDisputeWindow;
  uint64 public immutable defaultEscalationTimeout;
  uint256 public immutable defaultResolutionQuorumStake;
  uint16 public immutable defaultProposerSlashBps;
  uint256 public nextMarketId;

  mapping(address => bool) public acceptedCollateral;

  mapping(uint256 => Market) private markets;
  mapping(uint256 => string[]) public marketOutcomeLabels;
  mapping(uint256 => uint256[]) public poolBalances;
  mapping(uint256 => uint256[]) private totalUserShares;
  mapping(uint256 => uint256) public totalLpShares;
  mapping(uint256 => mapping(address => uint256)) public lpShares;
  mapping(uint256 => uint256) private accruedProtocolFees;
  mapping(uint256 => uint256) private accruedLpFees;
  mapping(uint256 => uint256) private protocolDisputeFees;
  mapping(uint256 => mapping(address => mapping(uint8 => euint128))) private encryptedUserShares;
  mapping(uint256 => mapping(address => uint256)) public disputeContributions;
  mapping(uint256 => mapping(address => bool)) public hasRedeemed;
  mapping(uint256 => mapping(uint8 => uint256)) public oracleVoteWeight;
  mapping(uint256 => uint256) private totalOracleVoteWeight;
  mapping(uint256 => mapping(address => bool)) public oracleHasVoted;
  mapping(uint256 => mapping(address => uint8)) public oracleVoteChoice;
  mapping(uint256 => mapping(address => uint256)) public oracleVoteWeightSnapshot;
  mapping(uint256 => mapping(address => bool)) private oracleRewardClaimed;
  mapping(address => bool) public disputeAdapters;
  mapping(uint256 => address) public marketDisputeAdapter;

  constructor(address oracleRegistry_, uint64 defaultDisputeWindow_) Ownable(msg.sender) {
    require(oracleRegistry_ != address(0));
    require(defaultDisputeWindow_ > 0);

    oracleRegistry = OracleRegistry(oracleRegistry_);
    defaultDisputeWindow = defaultDisputeWindow_;
    defaultEscalationTimeout = DEFAULT_ESCALATION_TIMEOUT;
    defaultResolutionQuorumStake = 1 ether;
    defaultProposerSlashBps = 2_000;
    acceptedCollateral[address(0)] = true;
  }

  /// @notice Whitelists or removes an ERC20 collateral token for new markets.
  function setAcceptedCollateral(address token, bool allowed) external onlyOwner {
    require(token != address(0));
    acceptedCollateral[token] = allowed;
    emit AcceptedCollateralUpdated(token, allowed);
  }

  function setDisputeAdapter(address adapter, bool allowed) external onlyOwner {
    require(adapter != address(0));
    disputeAdapters[adapter] = allowed;
    emit DisputeAdapterUpdated(adapter, allowed);
  }

  /// @notice Creates a new share-based market with creator-seeded liquidity.
  function createMarket(
    string calldata title,
    string calldata description,
    string calldata category,
    string calldata oracleSource,
    MarketType marketType,
    string[] calldata outcomes,
    uint64 expiryTime,
    address collateralToken,
    uint128 minimumTrade,
    uint128 seedLiquidity
  ) external payable returns (uint256 marketId) {
    require(bytes(title).length > 0);
    require(bytes(description).length > 0);
    require(bytes(category).length > 0);
    require(bytes(oracleSource).length > 0);
    require(expiryTime > block.timestamp);
    require(outcomes.length >= 2 && outcomes.length <= MAX_OUTCOMES);
    require(minimumTrade > 0);
    require(seedLiquidity > 0);
    require(seedLiquidity % outcomes.length == 0);
    require(seedLiquidity >= minimumTrade * outcomes.length);

    if (marketType == MarketType.BINARY) {
      require(outcomes.length == 2);
    }

    if (collateralToken != address(0)) {
      require(acceptedCollateral[collateralToken]);
    }

    _collectCollateral(collateralToken, seedLiquidity);

    marketId = nextMarketId;
    nextMarketId += 1;

    Market storage market = markets[marketId];
    market.creator = msg.sender;
    market.collateralToken = collateralToken;
    market.createdAt = uint64(block.timestamp);
    market.expiryTime = expiryTime;
    market.minimumTrade = minimumTrade;
    market.seedLiquidity = seedLiquidity;
    market.totalCollateralCollected = seedLiquidity;
    market.tradeFeeBps = DEFAULT_TRADE_FEE_BPS;
    market.protocolFeeShareBps = DEFAULT_PROTOCOL_FEE_SHARE_BPS;
    market.resolutionQuorumStake = uint128(defaultResolutionQuorumStake);
    market.outcomeCount = uint8(outcomes.length);
    market.marketType = marketType;
    market.state = MarketState.ACTIVE;
    market.exists = true;
    market.proposedOutcome = type(uint8).max;
    market.disputeCounterOutcome = type(uint8).max;
    market.leadingOutcome = type(uint8).max;
    market.finalOutcome = type(uint8).max;
    market.title = title;
    market.description = description;
    market.category = category;
    market.oracleSource = oracleSource;
    totalLpShares[marketId] = seedLiquidity;
    lpShares[marketId][msg.sender] = seedLiquidity;

    uint256 reservePerOutcome = seedLiquidity / outcomes.length;
    for (uint256 outcomeIndex = 0; outcomeIndex < outcomes.length; outcomeIndex += 1) {
      require(bytes(outcomes[outcomeIndex]).length > 0);
      marketOutcomeLabels[marketId].push(outcomes[outcomeIndex]);
      poolBalances[marketId].push(reservePerOutcome);
      totalUserShares[marketId].push(0);
    }

    emit MarketCreated(
      marketId,
      msg.sender,
      collateralToken,
      market.outcomeCount,
      seedLiquidity,
      title
    );
  }

  /// @notice Returns a buy quote for a given outcome and collateral amount.
  function quoteBuy(
    uint256 marketId,
    uint8 outcomeIndex,
    uint256 collateralIn
  )
    external
    view
    returns (uint256 sharesOut, uint256 feeAmount, uint256 avgPrice, uint256[] memory probabilities)
  {
    Market storage market = _getMarketStorage(marketId);
    _requireTradableState(market);
    _requireValidOutcome(marketId, outcomeIndex);
    require(collateralIn >= market.minimumTrade);

    uint256[] memory balances = poolBalances[marketId];
    feeAmount = _calculateFee(collateralIn, market.tradeFeeBps);
    uint256 netCollateral = collateralIn - feeAmount;
    sharesOut = PredictionMarketMath.quoteBuyFromBalances(balances, outcomeIndex, netCollateral);
    require(sharesOut > 0);

    avgPrice = Math.mulDiv(collateralIn, PRICE_SCALE, sharesOut);
    probabilities = PredictionMarketMath.probabilitiesAfterBuy(
      balances,
      outcomeIndex,
      netCollateral,
      sharesOut
    );
  }

  /// @notice Buys outcome shares from the market maker.
  function buyShares(
    uint256 marketId,
    uint8 outcomeIndex,
    uint128 collateralIn,
    uint128 minSharesOut
  ) external payable {
    Market storage market = _getMarketStorage(marketId);
    _syncExpiredState(marketId, market);
    require(market.state == MarketState.ACTIVE);
    _requireValidOutcome(marketId, outcomeIndex);
    require(collateralIn >= market.minimumTrade);

    uint256 feeAmount = _calculateFee(collateralIn, market.tradeFeeBps);
    uint256 netCollateral = collateralIn - uint128(feeAmount);
    require(netCollateral > 0);

    uint256[] memory balancesBeforeBuy = poolBalances[marketId];
    uint256 sharesOut = PredictionMarketMath.quoteBuyFromBalances(
      balancesBeforeBuy,
      outcomeIndex,
      netCollateral
    );
    require(sharesOut >= minSharesOut);
    require(sharesOut > 0);
    require(sharesOut <= type(uint128).max);

    _collectCollateral(market.collateralToken, collateralIn);
    _allocateFee(marketId, market, feeAmount);
    market.totalCollateralCollected += collateralIn;

    uint256[] storage balances = poolBalances[marketId];
    for (uint256 balanceIndex = 0; balanceIndex < balances.length; balanceIndex += 1) {
      balances[balanceIndex] += netCollateral;
    }
    balances[outcomeIndex] -= sharesOut;

    totalUserShares[marketId][outcomeIndex] += sharesOut;
    _increaseEncryptedPosition(marketId, msg.sender, outcomeIndex, uint128(sharesOut));

    emit TradeExecuted(marketId, true);
  }

  /// @notice Adds liquidity to an active market without changing the current price curve.
  function addLiquidity(uint256 marketId, uint128 collateralAmount) external payable {
    Market storage market = _getMarketStorage(marketId);
    _syncExpiredState(marketId, market);
    require(market.state == MarketState.ACTIVE);
    require(collateralAmount > 0);

    uint256 reserveValue = _getLpReserveValue(marketId);
    require(reserveValue > 0);

    _collectCollateral(market.collateralToken, collateralAmount);

    uint256 currentTotalLpShares = totalLpShares[marketId];
    uint256 mintedShares = currentTotalLpShares == 0
      ? collateralAmount
      : Math.mulDiv(collateralAmount, currentTotalLpShares, reserveValue);
    require(mintedShares > 0);

    uint256[] storage balances = poolBalances[marketId];
    uint256 remainingContribution = collateralAmount;
    for (uint256 balanceIndex = 0; balanceIndex < balances.length; balanceIndex += 1) {
      uint256 delta = balanceIndex == balances.length - 1
        ? remainingContribution
        : Math.mulDiv(balances[balanceIndex], collateralAmount, reserveValue);
      balances[balanceIndex] += delta;
      remainingContribution -= delta;
    }

    market.totalCollateralCollected += collateralAmount;
    totalLpShares[marketId] = currentTotalLpShares + mintedShares;
    lpShares[marketId][msg.sender] += mintedShares;

    emit LiquidityAdded(marketId, msg.sender, collateralAmount, mintedShares);
  }

  /// @notice Returns a sell quote for a given outcome share amount.
  function quoteSell(
    uint256 marketId,
    uint8 outcomeIndex,
    uint256 sharesIn
  )
    external
    view
    returns (uint256 collateralOut, uint256 feeAmount, uint256 avgPrice, uint256[] memory probabilities)
  {
    Market storage market = _getMarketStorage(marketId);
    _requireTradableState(market);
    _requireValidOutcome(marketId, outcomeIndex);
    require(sharesIn > 0);

    uint256[] memory balances = poolBalances[marketId];
    uint256 grossCollateralOut = PredictionMarketMath.quoteSellGrossFromBalances(
      balances,
      outcomeIndex,
      sharesIn
    );
    require(grossCollateralOut > 0);

    feeAmount = _calculateFee(grossCollateralOut, market.tradeFeeBps);
    collateralOut = grossCollateralOut - feeAmount;
    avgPrice = Math.mulDiv(collateralOut, PRICE_SCALE, sharesIn);
    probabilities = PredictionMarketMath.probabilitiesAfterSell(
      balances,
      outcomeIndex,
      sharesIn,
      grossCollateralOut
    );
  }

  /// @notice Starts an async decrypt for the caller's encrypted balance for a sell flow.
  function requestSellPositionDecrypt(uint256 marketId, uint8 outcomeIndex) external {
    Market storage market = _getMarketStorage(marketId);
    _requireTradableState(market);
    _requireValidOutcome(marketId, outcomeIndex);
    euint128 encryptedBalance = encryptedUserShares[marketId][msg.sender][outcomeIndex];
    require(euint128.unwrap(encryptedBalance) != 0);
    _allowForFheDecryption(encryptedBalance);
    FHE.decrypt(encryptedBalance);
  }

  /// @notice Sells outcome shares back into the market maker.
  function sellShares(
    uint256 marketId,
    uint8 outcomeIndex,
    uint128 sharesIn,
    uint128 minCollateralOut
  ) external {
    Market storage market = _getMarketStorage(marketId);
    _syncExpiredState(marketId, market);
    require(market.state == MarketState.ACTIVE);
    _requireValidOutcome(marketId, outcomeIndex);
    require(sharesIn > 0);

    euint128 encryptedBalance = _getStoredEncryptedPosition(marketId, msg.sender, outcomeIndex);
    (uint128 decryptedBalance, bool decrypted) = FHE.getDecryptResultSafe(encryptedBalance);
    require(decrypted);
    require(decryptedBalance >= sharesIn);

    uint256[] memory balancesBeforeSell = poolBalances[marketId];
    uint256 grossCollateralOut = PredictionMarketMath.quoteSellGrossFromBalances(
      balancesBeforeSell,
      outcomeIndex,
      sharesIn
    );
    require(grossCollateralOut > 0);

    uint256 feeAmount = _calculateFee(grossCollateralOut, market.tradeFeeBps);
    uint256 collateralOut = grossCollateralOut - feeAmount;
    require(collateralOut >= minCollateralOut);
    require(collateralOut > 0);

    uint256[] storage balances = poolBalances[marketId];
    balances[outcomeIndex] += sharesIn;
    for (uint256 balanceIndex = 0; balanceIndex < balances.length; balanceIndex += 1) {
      balances[balanceIndex] -= grossCollateralOut;
    }

    totalUserShares[marketId][outcomeIndex] -= sharesIn;
    _decreaseEncryptedPosition(marketId, msg.sender, outcomeIndex, sharesIn);

    _allocateFee(marketId, market, feeAmount);
    market.totalCollateralCollected -= uint128(collateralOut);
    _payCollateral(market.collateralToken, msg.sender, collateralOut);

    emit TradeExecuted(marketId, false);
  }

  /// @notice Removes liquidity from an active market without changing the current price curve.
  function removeLiquidity(
    uint256 marketId,
    uint128 lpSharesIn,
    uint128 minCollateralOut
  ) external {
    Market storage market = _getMarketStorage(marketId);
    _syncExpiredState(marketId, market);
    require(market.state == MarketState.ACTIVE);
    require(lpSharesIn > 0);

    uint256 providerShares = lpShares[marketId][msg.sender];
    require(providerShares >= lpSharesIn);

    uint256 currentTotalLpShares = totalLpShares[marketId];
    require(currentTotalLpShares > 0);

    uint256 reserveValue = _getLpReserveValue(marketId);
    uint256 collateralOut = Math.mulDiv(reserveValue, lpSharesIn, currentTotalLpShares);
    require(collateralOut >= minCollateralOut);
    require(collateralOut > 0);
    require(
      reserveValue - collateralOut >= uint256(market.minimumTrade) * market.outcomeCount,
      'LP drains'
    );

    uint256[] storage balances = poolBalances[marketId];
    uint256 remainingReduction = collateralOut;
    for (uint256 balanceIndex = 0; balanceIndex < balances.length; balanceIndex += 1) {
      uint256 reduction = balanceIndex == balances.length - 1
        ? remainingReduction
        : Math.mulDiv(balances[balanceIndex], lpSharesIn, currentTotalLpShares);
      balances[balanceIndex] -= reduction;
      remainingReduction -= reduction;
    }

    lpShares[marketId][msg.sender] = providerShares - lpSharesIn;
    totalLpShares[marketId] = currentTotalLpShares - lpSharesIn;
    market.totalCollateralCollected -= uint128(collateralOut);
    _payCollateral(market.collateralToken, msg.sender, collateralOut);

    emit LiquidityRemoved(marketId, msg.sender, collateralOut, lpSharesIn);
  }

  /// @notice Forces the singleton to update a market from ACTIVE to EXPIRED when the deadline passes.
  function expireMarket(uint256 marketId) external {
    Market storage market = _getMarketStorage(marketId);
    _syncExpiredState(marketId, market);
    require(_effectiveState(market) == MarketState.EXPIRED);
  }

  /// @notice Allows a staked oracle to propose the initial resolution outcome after market expiry.
  function proposeOutcome(uint256 marketId, uint8 outcomeIndex) external {
    Market storage market = _getMarketStorage(marketId);
    _syncExpiredState(marketId, market);

    require(market.state == MarketState.EXPIRED);
    _requireValidOutcome(marketId, outcomeIndex);
    require(oracleRegistry.isOracle(msg.sender));

    market.state = MarketState.RESOLUTION_OPEN;
    market.proposedOutcome = outcomeIndex;
    market.proposedBy = msg.sender;
    market.leadingOutcome = outcomeIndex;
    market.resolutionWindowEndsAt = uint64(block.timestamp) + defaultDisputeWindow;
    market.escalationDeadline = 0;
    oracleRegistry.lockOracle(msg.sender);

    emit OutcomeProposed(marketId, msg.sender, outcomeIndex, market.resolutionWindowEndsAt);
  }

  /// @notice Opens a counter-outcome challenge by posting dispute stake during the resolution window.
  function openDispute(
    uint256 marketId,
    uint8 counterOutcomeIndex,
    uint128 stakeAmount
  ) public payable {
    Market storage market = _getMarketStorage(marketId);

    require(market.state == MarketState.RESOLUTION_OPEN);
    require(block.timestamp <= market.resolutionWindowEndsAt);
    require(!market.disputeOpened);
    _requireValidOutcome(marketId, counterOutcomeIndex);
    require(counterOutcomeIndex != market.proposedOutcome);
    require(stakeAmount > 0);

    _collectCollateral(market.collateralToken, stakeAmount);

    market.disputeOpened = true;
    market.disputeCounterOutcome = counterOutcomeIndex;
    market.disputeOpenedBy = msg.sender;
    market.disputeStakeTotal = stakeAmount;
    disputeContributions[marketId][msg.sender] += stakeAmount;

    emit DisputeOpened(marketId, msg.sender, counterOutcomeIndex, stakeAmount);
  }

  function openDisputeFromAdapter(
    uint256 marketId,
    address disputer,
    uint8 counterOutcomeIndex,
    uint128 stakeAmount
  ) external {
    require(disputeAdapters[msg.sender]);
    require(disputer != address(0));

    Market storage market = _getMarketStorage(marketId);
    require(market.state == MarketState.RESOLUTION_OPEN);
    require(block.timestamp <= market.resolutionWindowEndsAt);
    require(!market.disputeOpened);
    _requireValidOutcome(marketId, counterOutcomeIndex);
    require(counterOutcomeIndex != market.proposedOutcome);
    require(stakeAmount > 0);

    market.disputeOpened = true;
    market.disputeCounterOutcome = counterOutcomeIndex;
    market.disputeOpenedBy = disputer;
    market.disputeStakeTotal = stakeAmount;
    marketDisputeAdapter[marketId] = msg.sender;

    emit DisputeOpened(marketId, disputer, counterOutcomeIndex, stakeAmount);
  }

  function settleExternalDispute(uint256 marketId, uint128 amount) external {
    require(marketDisputeAdapter[marketId] == msg.sender);
    Market storage market = _getMarketStorage(marketId);
    require(market.state == MarketState.FINALIZED);

    if (market.disputeRefundsEnabled) {
      require(amount == 0);
    } else {
      require(amount == market.disputeStakeTotal);
      if (market.committeeResolved) {
        uint256 oracleRewardShare = Math.mulDiv(amount, 8_000, BPS_DENOMINATOR);
        market.committeeRewardPool = uint128(oracleRewardShare);
        protocolDisputeFees[marketId] += amount - oracleRewardShare;
      } else {
        protocolDisputeFees[marketId] += amount;
      }
    }

    market.disputeStakeTotal = 0;
    marketDisputeAdapter[marketId] = address(0);
    emit ExternalDisputeSettled(marketId, msg.sender, amount);
  }

  /// @notice Casts a stake-weighted oracle vote during the active resolution window.
  function voteOnResolution(uint256 marketId, uint8 outcomeIndex) external {
    Market storage market = _getMarketStorage(marketId);
    require(market.state == MarketState.RESOLUTION_OPEN);
    require(block.timestamp <= market.resolutionWindowEndsAt);
    require(market.disputeOpened);
    _requireValidOutcome(marketId, outcomeIndex);
    require(oracleRegistry.isOracle(msg.sender));
    require(!oracleHasVoted[marketId][msg.sender]);

    OracleRegistry.OracleProfile memory profile = oracleRegistry.getOracle(msg.sender);
    uint256 weight = profile.stakedAmount;
    require(weight > 0);

    oracleHasVoted[marketId][msg.sender] = true;
    oracleVoteChoice[marketId][msg.sender] = outcomeIndex;
    oracleVoteWeightSnapshot[marketId][msg.sender] = weight;
    oracleVoteWeight[marketId][outcomeIndex] += weight;
    totalOracleVoteWeight[marketId] += weight;

    if (
      market.leadingOutcome == type(uint8).max ||
      oracleVoteWeight[marketId][outcomeIndex] > oracleVoteWeight[marketId][market.leadingOutcome]
    ) {
      market.leadingOutcome = outcomeIndex;
    }

    emit ResolutionVoteCast(marketId, msg.sender, outcomeIndex, weight);
  }

  /// @notice Finalizes an undisputed proposal once the resolution window closes.
  function finalizeUndisputed(uint256 marketId) public {
    Market storage market = _getMarketStorage(marketId);
    require(market.state == MarketState.RESOLUTION_OPEN);
    require(block.timestamp > market.resolutionWindowEndsAt);
    require(!market.disputeOpened);

    _finalizeResolvedMarket(marketId, market, market.proposedOutcome, false);
  }

  /// @notice Finalizes a market directly from oracle committee voting once the resolution window closes.
  function finalizeByQuorum(uint256 marketId) public {
    Market storage market = _getMarketStorage(marketId);
    require(market.state == MarketState.RESOLUTION_OPEN);
    require(block.timestamp > market.resolutionWindowEndsAt);
    require(market.disputeOpened);

    (bool hasWinner, uint8 winningOutcome) = _getWinningOutcomeIfResolvable(marketId, market);
    require(hasWinner);

    _finalizeResolvedMarket(marketId, market, winningOutcome, true);
  }

  /// @notice Escalates an unresolved committee market to admin fallback resolution.
  function escalateIfUnresolved(uint256 marketId) public {
    Market storage market = _getMarketStorage(marketId);
    require(market.state == MarketState.RESOLUTION_OPEN);
    require(block.timestamp > market.resolutionWindowEndsAt);
    require(market.disputeOpened);

    (bool hasWinner, ) = _getWinningOutcomeIfResolvable(marketId, market);
    require(!hasWinner);

    market.state = MarketState.ESCALATED;
    market.escalationDeadline = uint64(block.timestamp) + defaultEscalationTimeout;

    emit MarketEscalated(marketId, market.escalationDeadline);
  }

  /// @notice Resolves an escalated market through admin fallback.
  function resolveEscalated(uint256 marketId, uint8 finalOutcome) public onlyOwner {
    Market storage market = _getMarketStorage(marketId);

    require(market.state == MarketState.ESCALATED);
    _requireValidOutcome(marketId, finalOutcome);

    _finalizeResolvedMarket(marketId, market, finalOutcome, false);
  }

  /// @notice Starts an async decrypt for the caller's encrypted winning balance after finalization.
  function requestRedeemPositionDecrypt(uint256 marketId) external {
    Market storage market = _getMarketStorage(marketId);
    require(market.state == MarketState.FINALIZED);
    require(!hasRedeemed[marketId][msg.sender]);

    euint128 encryptedBalance = encryptedUserShares[marketId][msg.sender][market.finalOutcome];
    require(euint128.unwrap(encryptedBalance) != 0);
    _allowForFheDecryption(encryptedBalance);
    FHE.decrypt(encryptedBalance);
  }

  /// @notice Redeems winning shares 1:1 for collateral after finalization.
  function redeemShares(uint256 marketId) external {
    Market storage market = _getMarketStorage(marketId);

    require(market.state == MarketState.FINALIZED);
    require(!hasRedeemed[marketId][msg.sender]);

    uint8 finalOutcome = market.finalOutcome;
    euint128 encryptedBalance = _getStoredEncryptedPosition(marketId, msg.sender, finalOutcome);
    (uint128 sharesOwned, bool decrypted) = FHE.getDecryptResultSafe(encryptedBalance);
    require(decrypted);
    require(sharesOwned > 0);

    hasRedeemed[marketId][msg.sender] = true;
    totalUserShares[marketId][finalOutcome] -= sharesOwned;
    market.remainingWinningShares -= sharesOwned;
    market.totalCollateralCollected -= sharesOwned;
    _setEncryptedPosition(marketId, msg.sender, finalOutcome, FHE.asEuint128(uint128(0)));

    _payCollateral(market.collateralToken, msg.sender, sharesOwned);
  }

  /// @notice Allows LPs to claim their pro-rata post-resolution market surplus.
  function claimLpPayout(uint256 marketId) external {
    Market storage market = _getMarketStorage(marketId);

    require(market.state == MarketState.FINALIZED);
    uint256 providerShares = lpShares[marketId][msg.sender];
    uint256 currentTotalLpShares = totalLpShares[marketId];
    require(providerShares > 0);
    require(currentTotalLpShares > 0);

    uint256 reservedProtocolFees = market.protocolFeesClaimed ? 0 : accruedProtocolFees[marketId];
    uint256 availableCollateral = market.totalCollateralCollected;
    uint256 reservedForWinners = market.remainingWinningShares;
    require(
      availableCollateral > reservedForWinners + reservedProtocolFees,
      'No surplus'
    );

    uint256 lpPayoutBase = availableCollateral - reservedForWinners - reservedProtocolFees;
    uint256 lpPayout = providerShares == currentTotalLpShares
      ? lpPayoutBase
      : Math.mulDiv(lpPayoutBase, providerShares, currentTotalLpShares);

    lpShares[marketId][msg.sender] = 0;
    totalLpShares[marketId] = currentTotalLpShares - providerShares;
    market.lpClaimed = totalLpShares[marketId] == 0;
    market.totalCollateralCollected -= uint128(lpPayout);
    _payCollateral(market.collateralToken, msg.sender, lpPayout);

    emit LpPayoutClaimed(marketId, msg.sender, lpPayout, providerShares);
  }

  /// @notice Allows the owner to claim protocol fees after resolution.
  function claimProtocolFees(uint256 marketId) external onlyOwner {
    Market storage market = _getMarketStorage(marketId);
    uint256 marketFees = accruedProtocolFees[marketId];
    uint256 disputeFees = protocolDisputeFees[marketId];
    uint256 amount = marketFees + disputeFees;

    require(market.state == MarketState.FINALIZED);
    require(!market.protocolFeesClaimed);
    require(amount > 0);

    if (marketFees > 0) {
      require(
        market.totalCollateralCollected >= market.remainingWinningShares + marketFees,
        'Fees reserved'
      );
      market.totalCollateralCollected -= uint128(marketFees);
    }

    market.protocolFeesClaimed = true;
    accruedProtocolFees[marketId] = 0;
    protocolDisputeFees[marketId] = 0;
    _payCollateral(market.collateralToken, owner(), amount);

    emit ProtocolFeesClaimed(marketId, owner(), amount);
  }

  /// @notice Claims back a previously posted dispute stake when the dispute succeeds.
  function claimDisputeRefund(uint256 marketId) external {
    Market storage market = _getMarketStorage(marketId);
    uint256 refundAmount = disputeContributions[marketId][msg.sender];

    require(market.state == MarketState.FINALIZED);
    require(market.disputeRefundsEnabled);
    require(refundAmount > 0);

    disputeContributions[marketId][msg.sender] = 0;
    market.disputeStakeTotal -= uint128(refundAmount);
    _payCollateral(market.collateralToken, msg.sender, refundAmount);

    emit DisputeRefundClaimed(marketId, msg.sender, refundAmount);
  }

  /// @notice Claims oracle-side rewards from a failed dispute on committee-resolved markets.
  function claimOracleResolutionReward(uint256 marketId) external {
    Market storage market = _getMarketStorage(marketId);
    require(market.state == MarketState.FINALIZED);
    require(market.committeeResolved);
    require(market.committeeRewardPool > 0);
    require(!oracleRewardClaimed[marketId][msg.sender]);
    require(oracleHasVoted[marketId][msg.sender]);

    uint8 finalOutcome = market.finalOutcome;
    require(oracleVoteChoice[marketId][msg.sender] == finalOutcome);

    uint256 voterWeight = oracleVoteWeightSnapshot[marketId][msg.sender];
    uint256 winningWeight = oracleVoteWeight[marketId][finalOutcome];
    require(voterWeight > 0 && winningWeight > 0);

    oracleRewardClaimed[marketId][msg.sender] = true;
    uint256 rewardAmount = Math.mulDiv(market.committeeRewardPool, voterWeight, winningWeight);
    _payCollateral(market.collateralToken, msg.sender, rewardAmount);

    emit OracleResolutionRewardClaimed(marketId, msg.sender, rewardAmount);
  }

  /// @notice Returns full market metadata and state for frontend reads.
  function getMarket(uint256 marketId) external view returns (MarketView memory) {
    Market storage market = _getMarketStorage(marketId);

    return
      MarketView({
        marketId: marketId,
        creator: market.creator,
        collateralToken: market.collateralToken,
        proposedBy: market.proposedBy,
        disputeOpenedBy: market.disputeOpenedBy,
        createdAt: market.createdAt,
        expiryTime: market.expiryTime,
        resolutionWindowEndsAt: market.resolutionWindowEndsAt,
        escalationDeadline: market.escalationDeadline,
        minimumTrade: market.minimumTrade,
        seedLiquidity: market.seedLiquidity,
        totalCollateralCollected: market.totalCollateralCollected,
        disputeStakeTotal: market.disputeStakeTotal,
        remainingWinningShares: market.remainingWinningShares,
        resolutionQuorumStake: market.resolutionQuorumStake,
        committeeRewardPool: market.committeeRewardPool,
        totalOracleVoteWeight: uint128(totalOracleVoteWeight[marketId]),
        accruedProtocolFees: uint128(accruedProtocolFees[marketId]),
        accruedLpFees: uint128(accruedLpFees[marketId]),
        protocolDisputeFees: uint128(protocolDisputeFees[marketId]),
        tradeFeeBps: market.tradeFeeBps,
        protocolFeeShareBps: market.protocolFeeShareBps,
        outcomeCount: market.outcomeCount,
        proposedOutcome: market.proposedOutcome,
        disputeCounterOutcome: market.disputeCounterOutcome,
        leadingOutcome: market.leadingOutcome,
        finalOutcome: market.finalOutcome,
        marketType: market.marketType,
        state: _effectiveState(market),
        lpClaimed: market.lpClaimed,
        protocolFeesClaimed: market.protocolFeesClaimed,
        disputeRefundsEnabled: market.disputeRefundsEnabled,
        disputeOpened: market.disputeOpened,
        committeeResolved: market.committeeResolved,
        title: market.title,
        description: market.description,
        category: market.category,
        oracleSource: market.oracleSource,
        outcomes: marketOutcomeLabels[marketId]
      });
  }

  function getEncryptedUserPositionHandle(
    uint256 marketId,
    address account,
    uint8 outcomeIndex
  ) external view returns (uint256) {
    _requireValidOutcome(marketId, outcomeIndex);
    return euint128.unwrap(encryptedUserShares[marketId][account][outcomeIndex]);
  }

  function _collectCollateral(address collateralToken, uint256 amount) internal {
    if (collateralToken == address(0)) {
      require(msg.value == amount);
      return;
    }

    require(msg.value == 0);
    IERC20(collateralToken).safeTransferFrom(msg.sender, address(this), amount);
  }

  function _payCollateral(address collateralToken, address recipient, uint256 amount) internal {
    if (collateralToken == address(0)) {
      (bool sent, ) = payable(recipient).call{ value: amount }('');
      require(sent);
      return;
    }

    IERC20(collateralToken).safeTransfer(recipient, amount);
  }

  function _calculateFee(uint256 amount, uint16 feeBps) internal pure returns (uint256) {
    return Math.mulDiv(amount, feeBps, BPS_DENOMINATOR);
  }

  function _allocateFee(uint256 marketId, Market storage market, uint256 feeAmount) internal {
    if (feeAmount == 0) {
      return;
    }

    uint256 protocolFee = Math.mulDiv(feeAmount, market.protocolFeeShareBps, BPS_DENOMINATOR);
    uint256 lpFee = feeAmount - protocolFee;

    accruedProtocolFees[marketId] += protocolFee;
    accruedLpFees[marketId] += lpFee;
  }

  function _getStoredEncryptedPosition(
    uint256 marketId,
    address account,
    uint8 outcomeIndex
  ) internal view returns (euint128) {
    euint128 stored = encryptedUserShares[marketId][account][outcomeIndex];
    require(euint128.unwrap(stored) != 0);
    return stored;
  }

  function _getEncryptedPositionOrZero(
    uint256 marketId,
    address account,
    uint8 outcomeIndex
  ) internal returns (euint128) {
    euint128 stored = encryptedUserShares[marketId][account][outcomeIndex];
    if (euint128.unwrap(stored) == 0) {
      return FHE.asEuint128(uint128(0));
    }

    return stored;
  }

  function _setEncryptedPosition(
    uint256 marketId,
    address account,
    uint8 outcomeIndex,
    euint128 encryptedBalance
  ) internal {
    FHE.allowThis(encryptedBalance);
    FHE.allow(encryptedBalance, account);
    encryptedUserShares[marketId][account][outcomeIndex] = encryptedBalance;
  }

  function _allowForFheDecryption(euint128 encryptedBalance) internal {
    ICoFheTaskManager(COFHE_TASK_MANAGER).allowForDecryption(euint128.unwrap(encryptedBalance));
  }

  function _increaseEncryptedPosition(
    uint256 marketId,
    address account,
    uint8 outcomeIndex,
    uint128 amount
  ) internal {
    euint128 nextBalance = FHE.add(
      _getEncryptedPositionOrZero(marketId, account, outcomeIndex),
      FHE.asEuint128(amount)
    );
    _setEncryptedPosition(marketId, account, outcomeIndex, nextBalance);
  }

  function _decreaseEncryptedPosition(
    uint256 marketId,
    address account,
    uint8 outcomeIndex,
    uint128 amount
  ) internal {
    euint128 nextBalance = FHE.sub(
      _getStoredEncryptedPosition(marketId, account, outcomeIndex),
      FHE.asEuint128(amount)
    );
    _setEncryptedPosition(marketId, account, outcomeIndex, nextBalance);
  }

  function _getWinningOutcomeIfResolvable(
    uint256 marketId,
    Market storage market
  ) internal view returns (bool hasWinner, uint8 winningOutcome) {
    if (totalOracleVoteWeight[marketId] < market.resolutionQuorumStake) {
      return (false, type(uint8).max);
    }

    uint256 highestWeight = 0;
    bool isTie = false;

    for (uint8 outcomeIndex = 0; outcomeIndex < market.outcomeCount; outcomeIndex += 1) {
      uint256 weight = oracleVoteWeight[marketId][outcomeIndex];
      if (weight == 0) {
        continue;
      }

      if (weight > highestWeight) {
        highestWeight = weight;
        winningOutcome = outcomeIndex;
        isTie = false;
      } else if (weight == highestWeight) {
        isTie = true;
      }
    }

    if (highestWeight == 0 || isTie) {
      return (false, type(uint8).max);
    }

    return (true, winningOutcome);
  }

  function _finalizeResolvedMarket(
    uint256 marketId,
    Market storage market,
    uint8 finalOutcome,
    bool committeeResolved
  ) internal {
    market.state = MarketState.FINALIZED;
    market.finalOutcome = finalOutcome;
    market.remainingWinningShares = uint128(totalUserShares[marketId][finalOutcome]);
    market.committeeResolved = committeeResolved;
    market.disputeRefundsEnabled = market.disputeOpened && finalOutcome != market.proposedOutcome;

    if (
      market.disputeOpened &&
      !market.disputeRefundsEnabled &&
      marketDisputeAdapter[marketId] == address(0)
    ) {
      uint256 disputeStake = market.disputeStakeTotal;
      if (committeeResolved) {
        uint256 oracleRewardShare = Math.mulDiv(disputeStake, 8_000, BPS_DENOMINATOR);
        uint256 protocolShare = disputeStake - oracleRewardShare;
        market.committeeRewardPool = uint128(oracleRewardShare);
        protocolDisputeFees[marketId] += protocolShare;
      } else {
        protocolDisputeFees[marketId] += disputeStake;
      }
      market.disputeStakeTotal = 0;
    }

    if (committeeResolved && finalOutcome != market.proposedOutcome && market.proposedBy != address(0)) {
      OracleRegistry.OracleProfile memory proposerProfile = oracleRegistry.getOracle(market.proposedBy);
      uint256 slashAmount = Math.mulDiv(
        proposerProfile.stakedAmount,
        defaultProposerSlashBps,
        BPS_DENOMINATOR
      );
      oracleRegistry.slash(market.proposedBy, slashAmount, owner());
    }

    if (market.proposedBy != address(0)) {
      oracleRegistry.unlockOracle(market.proposedBy);
    }

    emit MarketFinalized(marketId, finalOutcome, committeeResolved);
  }

  function _getLpReserveValue(uint256 marketId) internal view returns (uint256 reserveValue) {
    uint256[] storage balances = poolBalances[marketId];
    for (uint256 balanceIndex = 0; balanceIndex < balances.length; balanceIndex += 1) {
      reserveValue += balances[balanceIndex];
    }
  }

  function _requireValidOutcome(uint256 marketId, uint8 outcomeIndex) internal view {
    _requireExistingMarket(marketId);
    require(outcomeIndex < markets[marketId].outcomeCount);
  }

  function _requireExistingMarket(uint256 marketId) internal view {
    require(markets[marketId].exists);
  }

  function _getMarketStorage(uint256 marketId) internal view returns (Market storage market) {
    _requireExistingMarket(marketId);
    market = markets[marketId];
  }

  function _effectiveState(Market storage market) internal view returns (MarketState) {
    if (market.state == MarketState.ACTIVE && block.timestamp >= market.expiryTime) {
      return MarketState.EXPIRED;
    }

    return market.state;
  }

  function _requireTradableState(Market storage market) internal view {
    require(_effectiveState(market) == MarketState.ACTIVE);
  }

  function _syncExpiredState(uint256 marketId, Market storage market) internal {
    if (market.state == MarketState.ACTIVE && block.timestamp >= market.expiryTime) {
      market.state = MarketState.EXPIRED;
      emit MarketExpired(marketId);
    }
  }
}
