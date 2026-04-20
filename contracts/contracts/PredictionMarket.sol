// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import '@fhenixprotocol/cofhe-contracts/FHE.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/utils/math/Math.sol';
import './OracleRegistry.sol';

/// @title PredictionMarket
/// @notice Singleton share-based prediction market with public FPMM pool state and encrypted
/// user balances for economic v1 privacy.
contract PredictionMarket is Ownable {
  using SafeERC20 for IERC20;

  uint16 public constant DEFAULT_TRADE_FEE_BPS = 100;
  uint16 public constant DEFAULT_PROTOCOL_FEE_SHARE_BPS = 2_000;
  uint16 public constant BPS_DENOMINATOR = 10_000;
  uint8 public constant MAX_OUTCOMES = 8;
  uint256 private constant PRICE_SCALE = 1e18;

  enum MarketType {
    BINARY,
    CATEGORICAL
  }

  enum MarketState {
    ACTIVE,
    EXPIRED,
    PROPOSED,
    DISPUTED,
    FINALIZED
  }

  struct Market {
    address creator;
    address collateralToken;
    address proposedBy;
    uint64 createdAt;
    uint64 expiryTime;
    uint64 disputeWindowEndsAt;
    uint128 minimumTrade;
    uint128 seedLiquidity;
    uint128 totalCollateralCollected;
    uint128 disputeStakeTotal;
    uint128 remainingWinningShares;
    uint16 tradeFeeBps;
    uint16 protocolFeeShareBps;
    uint8 outcomeCount;
    uint8 proposedOutcome;
    uint8 finalOutcome;
    MarketType marketType;
    MarketState state;
    bool exists;
    bool lpClaimed;
    bool protocolFeesClaimed;
    bool disputeRefundsEnabled;
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
    uint64 createdAt;
    uint64 expiryTime;
    uint64 disputeWindowEndsAt;
    uint128 minimumTrade;
    uint128 seedLiquidity;
    uint128 totalCollateralCollected;
    uint128 disputeStakeTotal;
    uint128 remainingWinningShares;
    uint128 accruedProtocolFees;
    uint128 accruedLpFees;
    uint128 protocolDisputeFees;
    uint16 tradeFeeBps;
    uint16 protocolFeeShareBps;
    uint8 outcomeCount;
    uint8 proposedOutcome;
    uint8 finalOutcome;
    MarketType marketType;
    MarketState state;
    bool lpClaimed;
    bool protocolFeesClaimed;
    bool disputeRefundsEnabled;
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
    uint64 disputeWindowEndsAt
  );
  event OutcomeDisputed(uint256 indexed marketId, uint256 disputeStakeTotal);
  event MarketFinalized(uint256 indexed marketId, uint8 indexed finalOutcome, bool disputed);
  event LpPayoutClaimed(uint256 indexed marketId, address indexed recipient, uint256 amount);
  event ProtocolFeesClaimed(uint256 indexed marketId, address indexed recipient, uint256 amount);
  event DisputeRefundClaimed(uint256 indexed marketId, address indexed account, uint256 refundAmount);

  OracleRegistry public immutable oracleRegistry;
  uint64 public immutable defaultDisputeWindow;
  uint256 public nextMarketId;

  mapping(address => bool) public acceptedCollateral;

  mapping(uint256 => Market) private markets;
  mapping(uint256 => string[]) private marketOutcomeLabels;
  mapping(uint256 => uint256[]) private poolBalances;
  mapping(uint256 => uint256[]) private totalUserShares;
  mapping(uint256 => uint256) private accruedProtocolFees;
  mapping(uint256 => uint256) private accruedLpFees;
  mapping(uint256 => uint256) private protocolDisputeFees;
  mapping(uint256 => mapping(address => mapping(uint8 => euint128))) private encryptedUserShares;
  mapping(uint256 => mapping(address => uint256)) public disputeContributions;
  mapping(uint256 => mapping(address => bool)) public hasRedeemed;

  constructor(address oracleRegistry_, uint64 defaultDisputeWindow_) Ownable(msg.sender) {
    require(oracleRegistry_ != address(0), 'Oracle registry is required');
    require(defaultDisputeWindow_ > 0, 'Dispute window is required');

    oracleRegistry = OracleRegistry(oracleRegistry_);
    defaultDisputeWindow = defaultDisputeWindow_;
    acceptedCollateral[address(0)] = true;
  }

  /// @notice Whitelists or removes an ERC20 collateral token for new markets.
  function setAcceptedCollateral(address token, bool allowed) external onlyOwner {
    require(token != address(0), 'Use native ETH implicitly');
    acceptedCollateral[token] = allowed;
    emit AcceptedCollateralUpdated(token, allowed);
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
    require(bytes(title).length > 0, 'Title is required');
    require(bytes(description).length > 0, 'Description is required');
    require(bytes(category).length > 0, 'Category is required');
    require(bytes(oracleSource).length > 0, 'Oracle source is required');
    require(expiryTime > block.timestamp, 'Expiry must be in the future');
    require(outcomes.length >= 2 && outcomes.length <= MAX_OUTCOMES, 'Outcome count is invalid');
    require(minimumTrade > 0, 'Minimum trade is required');
    require(seedLiquidity > 0, 'Seed liquidity is required');
    require(seedLiquidity % outcomes.length == 0, 'Seed liquidity must split evenly');
    require(seedLiquidity >= minimumTrade * outcomes.length, 'Seed liquidity is too small');

    if (marketType == MarketType.BINARY) {
      require(outcomes.length == 2, 'Binary markets require two outcomes');
    }

    if (collateralToken != address(0)) {
      require(acceptedCollateral[collateralToken], 'Collateral token is not whitelisted');
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
    market.outcomeCount = uint8(outcomes.length);
    market.marketType = marketType;
    market.state = MarketState.ACTIVE;
    market.exists = true;
    market.proposedOutcome = type(uint8).max;
    market.finalOutcome = type(uint8).max;
    market.title = title;
    market.description = description;
    market.category = category;
    market.oracleSource = oracleSource;

    uint256 reservePerOutcome = seedLiquidity / outcomes.length;
    for (uint256 outcomeIndex = 0; outcomeIndex < outcomes.length; outcomeIndex += 1) {
      require(bytes(outcomes[outcomeIndex]).length > 0, 'Outcome label is required');
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
    require(collateralIn >= market.minimumTrade, 'Trade is below market minimum');

    uint256[] memory balances = poolBalances[marketId];
    feeAmount = _calculateFee(collateralIn, market.tradeFeeBps);
    uint256 netCollateral = collateralIn - feeAmount;
    sharesOut = _quoteBuyFromBalances(balances, outcomeIndex, netCollateral);
    require(sharesOut > 0, 'Trade produces no shares');

    avgPrice = Math.mulDiv(collateralIn, PRICE_SCALE, sharesOut);
    probabilities = _probabilitiesAfterBuy(balances, outcomeIndex, netCollateral, sharesOut);
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
    require(market.state == MarketState.ACTIVE, 'Market is not active');
    _requireValidOutcome(marketId, outcomeIndex);
    require(collateralIn >= market.minimumTrade, 'Trade is below market minimum');

    uint256 feeAmount = _calculateFee(collateralIn, market.tradeFeeBps);
    uint256 netCollateral = collateralIn - uint128(feeAmount);
    require(netCollateral > 0, 'Net collateral must be positive');

    uint256 sharesOut = _quoteBuyFromBalances(poolBalances[marketId], outcomeIndex, netCollateral);
    require(sharesOut >= minSharesOut, 'Trade slipped below minimum shares');
    require(sharesOut > 0, 'Trade produces no shares');
    require(sharesOut <= type(uint128).max, 'Shares exceed supported range');

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
    require(sharesIn > 0, 'Shares are required');

    uint256[] memory balances = poolBalances[marketId];
    uint256 grossCollateralOut = _quoteSellGrossFromBalances(balances, outcomeIndex, sharesIn);
    require(grossCollateralOut > 0, 'Trade produces no collateral');

    feeAmount = _calculateFee(grossCollateralOut, market.tradeFeeBps);
    collateralOut = grossCollateralOut - feeAmount;
    avgPrice = Math.mulDiv(collateralOut, PRICE_SCALE, sharesIn);
    probabilities = _probabilitiesAfterSell(balances, outcomeIndex, sharesIn, grossCollateralOut);
  }

  /// @notice Starts an async decrypt for the caller's encrypted balance for a sell flow.
  function requestSellPositionDecrypt(uint256 marketId, uint8 outcomeIndex) external {
    Market storage market = _getMarketStorage(marketId);
    _requireTradableState(market);
    _requireValidOutcome(marketId, outcomeIndex);
    euint128 encryptedBalance = encryptedUserShares[marketId][msg.sender][outcomeIndex];
    require(euint128.unwrap(encryptedBalance) != 0, 'No encrypted position');
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
    require(market.state == MarketState.ACTIVE, 'Market is not active');
    _requireValidOutcome(marketId, outcomeIndex);
    require(sharesIn > 0, 'Shares are required');

    euint128 encryptedBalance = _getStoredEncryptedPosition(marketId, msg.sender, outcomeIndex);
    (uint128 decryptedBalance, bool decrypted) = FHE.getDecryptResultSafe(encryptedBalance);
    require(decrypted, 'Position verification pending');
    require(decryptedBalance >= sharesIn, 'Insufficient shares');

    uint256 grossCollateralOut = _quoteSellGrossFromBalances(
      poolBalances[marketId],
      outcomeIndex,
      sharesIn
    );
    require(grossCollateralOut > 0, 'Trade produces no collateral');

    uint256 feeAmount = _calculateFee(grossCollateralOut, market.tradeFeeBps);
    uint256 collateralOut = grossCollateralOut - feeAmount;
    require(collateralOut >= minCollateralOut, 'Trade slipped below minimum collateral');
    require(collateralOut > 0, 'Trade produces no collateral');

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

  /// @notice Forces the singleton to update a market from ACTIVE to EXPIRED when the deadline passes.
  function expireMarket(uint256 marketId) external {
    Market storage market = _getMarketStorage(marketId);
    _syncExpiredState(marketId, market);
    require(_effectiveState(market) == MarketState.EXPIRED, 'Market has not expired');
  }

  /// @notice Allows a staked oracle to propose the final outcome after market expiry.
  function proposeOutcome(uint256 marketId, uint8 outcomeIndex) external {
    Market storage market = _getMarketStorage(marketId);
    _syncExpiredState(marketId, market);

    require(market.state == MarketState.EXPIRED, 'Market is not ready for proposal');
    _requireValidOutcome(marketId, outcomeIndex);
    require(oracleRegistry.isOracle(msg.sender), 'Caller is not a registered oracle');

    market.state = MarketState.PROPOSED;
    market.proposedOutcome = outcomeIndex;
    market.proposedBy = msg.sender;
    market.disputeWindowEndsAt = uint64(block.timestamp) + defaultDisputeWindow;
    oracleRegistry.lockOracle(msg.sender);

    emit OutcomeProposed(marketId, msg.sender, outcomeIndex, market.disputeWindowEndsAt);
  }

  /// @notice Challenges a proposed outcome by staking the market collateral during the dispute window.
  function disputeOutcome(uint256 marketId, uint128 stakeAmount) external payable {
    Market storage market = _getMarketStorage(marketId);

    require(
      market.state == MarketState.PROPOSED || market.state == MarketState.DISPUTED,
      'Market is not disputable'
    );
    require(block.timestamp <= market.disputeWindowEndsAt, 'Dispute window has closed');
    require(stakeAmount > 0, 'Dispute stake is required');

    _collectCollateral(market.collateralToken, stakeAmount);

    if (market.state == MarketState.PROPOSED) {
      market.state = MarketState.DISPUTED;
    }

    market.disputeStakeTotal += stakeAmount;
    disputeContributions[marketId][msg.sender] += stakeAmount;

    emit OutcomeDisputed(marketId, market.disputeStakeTotal);
  }

  /// @notice Finalizes an undisputed market after the dispute window ends.
  function finalizeMarket(uint256 marketId) external {
    Market storage market = _getMarketStorage(marketId);

    require(market.state == MarketState.PROPOSED, 'Market is not awaiting finalization');
    require(block.timestamp > market.disputeWindowEndsAt, 'Dispute window is still open');

    market.state = MarketState.FINALIZED;
    market.finalOutcome = market.proposedOutcome;
    market.remainingWinningShares = uint128(totalUserShares[marketId][market.finalOutcome]);

    if (market.proposedBy != address(0)) {
      oracleRegistry.unlockOracle(market.proposedBy);
    }

    emit MarketFinalized(marketId, market.finalOutcome, false);
  }

  /// @notice Resolves a disputed market and optionally slashes the proposing oracle.
  function resolveDispute(
    uint256 marketId,
    uint8 finalOutcome,
    uint256 oracleSlashAmount
  ) external onlyOwner {
    Market storage market = _getMarketStorage(marketId);

    require(market.state == MarketState.DISPUTED, 'Market is not disputed');
    require(block.timestamp > market.disputeWindowEndsAt, 'Dispute window is still open');
    _requireValidOutcome(marketId, finalOutcome);

    market.state = MarketState.FINALIZED;
    market.finalOutcome = finalOutcome;
    market.remainingWinningShares = uint128(totalUserShares[marketId][finalOutcome]);
    market.disputeRefundsEnabled = finalOutcome != market.proposedOutcome;

    if (market.disputeRefundsEnabled) {
      // Funds remain escrowed until users individually claim refunds.
    } else if (market.disputeStakeTotal > 0) {
      protocolDisputeFees[marketId] += market.disputeStakeTotal;
      market.disputeStakeTotal = 0;
    }

    if (oracleSlashAmount > 0 && market.proposedBy != address(0)) {
      oracleRegistry.slash(market.proposedBy, oracleSlashAmount, owner());
    }

    if (market.proposedBy != address(0)) {
      oracleRegistry.unlockOracle(market.proposedBy);
    }

    emit MarketFinalized(marketId, finalOutcome, true);
  }

  /// @notice Starts an async decrypt for the caller's encrypted winning balance after finalization.
  function requestRedeemPositionDecrypt(uint256 marketId) external {
    Market storage market = _getMarketStorage(marketId);
    require(market.state == MarketState.FINALIZED, 'Market is not finalized');
    require(!hasRedeemed[marketId][msg.sender], 'Shares already redeemed');

    euint128 encryptedBalance = encryptedUserShares[marketId][msg.sender][market.finalOutcome];
    require(euint128.unwrap(encryptedBalance) != 0, 'No encrypted position');
    FHE.decrypt(encryptedBalance);
  }

  /// @notice Redeems winning shares 1:1 for collateral after finalization.
  function redeemShares(uint256 marketId) external {
    Market storage market = _getMarketStorage(marketId);

    require(market.state == MarketState.FINALIZED, 'Market is not finalized');
    require(!hasRedeemed[marketId][msg.sender], 'Shares already redeemed');

    uint8 finalOutcome = market.finalOutcome;
    euint128 encryptedBalance = _getStoredEncryptedPosition(marketId, msg.sender, finalOutcome);
    (uint128 sharesOwned, bool decrypted) = FHE.getDecryptResultSafe(encryptedBalance);
    require(decrypted, 'Position verification pending');
    require(sharesOwned > 0, 'Caller has no winning shares');

    hasRedeemed[marketId][msg.sender] = true;
    totalUserShares[marketId][finalOutcome] -= sharesOwned;
    market.remainingWinningShares -= sharesOwned;
    market.totalCollateralCollected -= sharesOwned;
    _setEncryptedPosition(marketId, msg.sender, finalOutcome, FHE.asEuint128(uint128(0)));

    _payCollateral(market.collateralToken, msg.sender, sharesOwned);
  }

  /// @notice Allows the seeded LP owner to claim the post-resolution market surplus.
  function claimLpPayout(uint256 marketId) external {
    Market storage market = _getMarketStorage(marketId);

    require(market.state == MarketState.FINALIZED, 'Market is not finalized');
    require(msg.sender == market.creator, 'Caller is not the LP owner');
    require(!market.lpClaimed, 'LP payout already claimed');

    uint256 reservedProtocolFees = market.protocolFeesClaimed ? 0 : accruedProtocolFees[marketId];
    uint256 availableCollateral = market.totalCollateralCollected;
    uint256 reservedForWinners = market.remainingWinningShares;
    require(
      availableCollateral > reservedForWinners + reservedProtocolFees,
      'No LP surplus available'
    );

    uint256 lpPayout = availableCollateral - reservedForWinners - reservedProtocolFees;
    market.lpClaimed = true;
    market.totalCollateralCollected -= uint128(lpPayout);
    _payCollateral(market.collateralToken, msg.sender, lpPayout);

    emit LpPayoutClaimed(marketId, msg.sender, lpPayout);
  }

  /// @notice Allows the owner to claim protocol fees after resolution.
  function claimProtocolFees(uint256 marketId) external onlyOwner {
    Market storage market = _getMarketStorage(marketId);
    uint256 marketFees = accruedProtocolFees[marketId];
    uint256 disputeFees = protocolDisputeFees[marketId];
    uint256 amount = marketFees + disputeFees;

    require(market.state == MarketState.FINALIZED, 'Market is not finalized');
    require(!market.protocolFeesClaimed, 'Protocol fees already claimed');
    require(amount > 0, 'No protocol fees available');

    if (marketFees > 0) {
      require(
        market.totalCollateralCollected >= market.remainingWinningShares + marketFees,
        'Protocol fees are still reserved'
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

    require(market.state == MarketState.FINALIZED, 'Market is not finalized');
    require(market.disputeRefundsEnabled, 'Dispute refund is not available');
    require(refundAmount > 0, 'No dispute refund available');

    disputeContributions[marketId][msg.sender] = 0;
    market.disputeStakeTotal -= uint128(refundAmount);
    _payCollateral(market.collateralToken, msg.sender, refundAmount);

    emit DisputeRefundClaimed(marketId, msg.sender, refundAmount);
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
        createdAt: market.createdAt,
        expiryTime: market.expiryTime,
        disputeWindowEndsAt: market.disputeWindowEndsAt,
        minimumTrade: market.minimumTrade,
        seedLiquidity: market.seedLiquidity,
        totalCollateralCollected: market.totalCollateralCollected,
        disputeStakeTotal: market.disputeStakeTotal,
        remainingWinningShares: market.remainingWinningShares,
        accruedProtocolFees: uint128(accruedProtocolFees[marketId]),
        accruedLpFees: uint128(accruedLpFees[marketId]),
        protocolDisputeFees: uint128(protocolDisputeFees[marketId]),
        tradeFeeBps: market.tradeFeeBps,
        protocolFeeShareBps: market.protocolFeeShareBps,
        outcomeCount: market.outcomeCount,
        proposedOutcome: market.proposedOutcome,
        finalOutcome: market.finalOutcome,
        marketType: market.marketType,
        state: _effectiveState(market),
        lpClaimed: market.lpClaimed,
        protocolFeesClaimed: market.protocolFeesClaimed,
        disputeRefundsEnabled: market.disputeRefundsEnabled,
        title: market.title,
        description: market.description,
        category: market.category,
        oracleSource: market.oracleSource,
        outcomes: marketOutcomeLabels[marketId]
      });
  }

  function getOutcomeLabels(uint256 marketId) external view returns (string[] memory) {
    _requireExistingMarket(marketId);
    return marketOutcomeLabels[marketId];
  }

  function getOutcomeReserves(uint256 marketId) external view returns (uint256[] memory) {
    _requireExistingMarket(marketId);
    return poolBalances[marketId];
  }

  function getMarketProbabilities(uint256 marketId) external view returns (uint256[] memory) {
    _requireExistingMarket(marketId);
    return _getProbabilities(poolBalances[marketId]);
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
      require(msg.value == amount, 'Incorrect native ETH amount');
      return;
    }

    require(msg.value == 0, 'Native ETH should not be attached');
    IERC20(collateralToken).safeTransferFrom(msg.sender, address(this), amount);
  }

  function _payCollateral(address collateralToken, address recipient, uint256 amount) internal {
    if (collateralToken == address(0)) {
      (bool sent, ) = payable(recipient).call{ value: amount }('');
      require(sent, 'Native ETH payout failed');
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
    require(euint128.unwrap(stored) != 0, 'No encrypted position');
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

  /// @dev Quote output is intentionally floored; minor rounding is expected on higher outcome counts.
  function _quoteBuyFromBalances(
    uint256[] memory balances,
    uint8 outcomeIndex,
    uint256 netCollateral
  ) internal pure returns (uint256 sharesOut) {
    uint256 selectedBalance = balances[outcomeIndex];
    uint256 adjustedSelected = selectedBalance;

    for (uint256 balanceIndex = 0; balanceIndex < balances.length; balanceIndex += 1) {
      if (balanceIndex == outcomeIndex) {
        continue;
      }

      adjustedSelected = Math.mulDiv(
        adjustedSelected,
        balances[balanceIndex],
        balances[balanceIndex] + netCollateral
      );
    }

    sharesOut = selectedBalance + netCollateral - adjustedSelected;
  }

  function _quoteSellGrossFromBalances(
    uint256[] memory balances,
    uint8 outcomeIndex,
    uint256 sharesIn
  ) internal pure returns (uint256) {
    uint256 low = 0;
    uint256 high = balances[0];

    for (uint256 balanceIndex = 0; balanceIndex < balances.length; balanceIndex += 1) {
      if (balanceIndex == outcomeIndex) {
        continue;
      }

      if (balances[balanceIndex] < high) {
        high = balances[balanceIndex];
      }
    }

    while (low < high) {
      uint256 mid = (low + high + 1) / 2;
      if (_sellCandidateSatisfies(balances, outcomeIndex, sharesIn, mid)) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }

    return low;
  }

  function _sellCandidateSatisfies(
    uint256[] memory balances,
    uint8 outcomeIndex,
    uint256 sharesIn,
    uint256 collateralOutGross
  ) internal pure returns (bool) {
    uint256 selectedBalance = balances[outcomeIndex] + sharesIn - collateralOutGross;
    uint256 ratioValue = selectedBalance;
    uint256 baseSelected = balances[outcomeIndex];

    for (uint256 balanceIndex = 0; balanceIndex < balances.length; balanceIndex += 1) {
      if (balanceIndex == outcomeIndex) {
        continue;
      }

      if (balances[balanceIndex] <= collateralOutGross) {
        return false;
      }

      ratioValue = Math.mulDiv(
        ratioValue,
        balances[balanceIndex] - collateralOutGross,
        balances[balanceIndex]
      );
    }

    return ratioValue >= baseSelected;
  }

  function _probabilitiesAfterBuy(
    uint256[] memory balances,
    uint8 outcomeIndex,
    uint256 netCollateral,
    uint256 sharesOut
  ) internal pure returns (uint256[] memory probabilities) {
    uint256[] memory nextBalances = new uint256[](balances.length);
    for (uint256 balanceIndex = 0; balanceIndex < balances.length; balanceIndex += 1) {
      nextBalances[balanceIndex] = balances[balanceIndex] + netCollateral;
    }
    nextBalances[outcomeIndex] -= sharesOut;

    return _getProbabilities(nextBalances);
  }

  function _probabilitiesAfterSell(
    uint256[] memory balances,
    uint8 outcomeIndex,
    uint256 sharesIn,
    uint256 grossCollateralOut
  ) internal pure returns (uint256[] memory probabilities) {
    uint256[] memory nextBalances = new uint256[](balances.length);
    for (uint256 balanceIndex = 0; balanceIndex < balances.length; balanceIndex += 1) {
      nextBalances[balanceIndex] = balances[balanceIndex] - grossCollateralOut;
    }
    nextBalances[outcomeIndex] += sharesIn;

    return _getProbabilities(nextBalances);
  }

  function _getProbabilities(
    uint256[] memory balances
  ) internal pure returns (uint256[] memory probabilities) {
    probabilities = new uint256[](balances.length);
    uint256 inverseSum = 0;

    for (uint256 balanceIndex = 0; balanceIndex < balances.length; balanceIndex += 1) {
      inverseSum += Math.mulDiv(PRICE_SCALE, PRICE_SCALE, balances[balanceIndex]);
    }

    for (uint256 balanceIndex = 0; balanceIndex < balances.length; balanceIndex += 1) {
      uint256 inverseBalance = Math.mulDiv(PRICE_SCALE, PRICE_SCALE, balances[balanceIndex]);
      probabilities[balanceIndex] = Math.mulDiv(inverseBalance, PRICE_SCALE, inverseSum);
    }
  }

  function _requireValidOutcome(uint256 marketId, uint8 outcomeIndex) internal view {
    _requireExistingMarket(marketId);
    require(outcomeIndex < markets[marketId].outcomeCount, 'Outcome index is invalid');
  }

  function _requireExistingMarket(uint256 marketId) internal view {
    require(markets[marketId].exists, 'Market does not exist');
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
    require(_effectiveState(market) == MarketState.ACTIVE, 'Market is not active');
  }

  function _syncExpiredState(uint256 marketId, Market storage market) internal {
    if (market.state == MarketState.ACTIVE && block.timestamp >= market.expiryTime) {
      market.state = MarketState.EXPIRED;
      emit MarketExpired(marketId);
    }
  }
}
