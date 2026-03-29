// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import '@fhenixprotocol/cofhe-contracts/FHE.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import './OracleRegistry.sol';

/// @title PredictionMarket
/// @notice Singleton prediction market contract that manages all markets, encrypted position mirrors,
/// and optimistic-oracle settlement with a dispute window.
contract PredictionMarket is Ownable {
  using SafeERC20 for IERC20;

  /// @notice Supported market structures.
  enum MarketType {
    BINARY,
    CATEGORICAL
  }

  /// @notice Lifecycle states used by each market.
  enum MarketState {
    ACTIVE,
    EXPIRED,
    PROPOSED,
    DISPUTED,
    FINALIZED
  }

  /// @notice Core storage tracked for each market.
  struct Market {
    address creator;
    address collateralToken;
    address proposedBy;
    uint64 createdAt;
    uint64 expiryTime;
    uint64 disputeWindowEndsAt;
    uint128 minimumStake;
    uint128 totalLiquidity;
    uint128 disputeStakeTotal;
    uint8 outcomeCount;
    uint8 proposedOutcome;
    uint8 finalOutcome;
    MarketType marketType;
    MarketState state;
    bool exists;
    string title;
    string category;
  }

  /// @notice Market data shaped for frontend reads.
  struct MarketView {
    uint256 marketId;
    address creator;
    address collateralToken;
    address proposedBy;
    uint64 createdAt;
    uint64 expiryTime;
    uint64 disputeWindowEndsAt;
    uint128 minimumStake;
    uint128 totalLiquidity;
    uint128 disputeStakeTotal;
    uint8 outcomeCount;
    uint8 proposedOutcome;
    uint8 finalOutcome;
    MarketType marketType;
    MarketState state;
    string title;
    string category;
    string[] outcomes;
  }

  /// @notice Emitted when a collateral token is whitelisted or removed.
  /// @param token The collateral token address.
  /// @param allowed Whether the token is allowed for new markets.
  event AcceptedCollateralUpdated(address indexed token, bool allowed);

  /// @notice Emitted when a market is created.
  /// @param marketId The new market id.
  /// @param creator The market creator.
  /// @param collateralToken The market collateral token, or zero for native ETH.
  /// @param outcomeCount The number of outcomes configured.
  /// @param title The market title.
  event MarketCreated(
    uint256 indexed marketId,
    address indexed creator,
    address indexed collateralToken,
    uint8 outcomeCount,
    string title
  );

  /// @notice Emitted when a market naturally expires.
  /// @param marketId The market id.
  event MarketExpired(uint256 indexed marketId);

  /// @notice Emitted when a bet is placed.
  /// @param marketId The market id.
  /// @param account The bettor.
  /// @param outcomeIndex The selected outcome.
  /// @param plainStakeAmount The enforceable stake amount used for payouts.
  /// @param ciphertextHandle The encrypted stake handle stored on-chain.
  event BetPlaced(
    uint256 indexed marketId,
    address indexed account,
    uint8 indexed outcomeIndex,
    uint256 plainStakeAmount,
    uint256 ciphertextHandle
  );

  /// @notice Emitted when an oracle proposes an outcome.
  /// @param marketId The market id.
  /// @param oracle The oracle address.
  /// @param outcomeIndex The proposed winning outcome.
  /// @param disputeWindowEndsAt The timestamp at which the dispute window closes.
  event OutcomeProposed(
    uint256 indexed marketId,
    address indexed oracle,
    uint8 indexed outcomeIndex,
    uint64 disputeWindowEndsAt
  );

  /// @notice Emitted when a proposal is disputed.
  /// @param marketId The market id.
  /// @param disputer The disputing address.
  /// @param disputeStake The stake posted for the dispute.
  event OutcomeDisputed(
    uint256 indexed marketId,
    address indexed disputer,
    uint256 disputeStake
  );

  /// @notice Emitted when a market is finalized.
  /// @param marketId The market id.
  /// @param finalOutcome The winning outcome index.
  /// @param disputed Whether a dispute path was used.
  event MarketFinalized(uint256 indexed marketId, uint8 indexed finalOutcome, bool disputed);

  /// @notice Emitted when a winner claims payout.
  /// @param marketId The market id.
  /// @param account The claimant.
  /// @param payoutAmount The amount paid out.
  event RewardClaimed(uint256 indexed marketId, address indexed account, uint256 payoutAmount);

  /// @notice Emitted when a disputer reclaims the dispute stake.
  /// @param marketId The market id.
  /// @param account The claimant.
  /// @param refundAmount The refunded dispute stake.
  event DisputeRefundClaimed(
    uint256 indexed marketId,
    address indexed account,
    uint256 refundAmount
  );

  /// @notice Registry that decides who can propose outcomes.
  OracleRegistry public immutable oracleRegistry;

  /// @notice Default optimistic dispute window for new outcome proposals.
  uint64 public immutable defaultDisputeWindow;

  /// @notice Market id to be assigned to the next created market.
  uint256 public nextMarketId;

  /// @notice Whitelist of ERC20 collateral tokens. Native ETH uses the zero address.
  mapping(address => bool) public acceptedCollateral;

  mapping(uint256 => Market) private markets;
  mapping(uint256 => string[]) private marketOutcomeLabels;
  mapping(uint256 => mapping(address => mapping(uint8 => uint256))) private plainStakes;
  mapping(uint256 => mapping(uint8 => uint256)) private plainOutcomeTotals;
  mapping(uint256 => mapping(bytes32 => mapping(uint8 => euint128))) private encryptedStakes;
  mapping(uint256 => mapping(uint8 => euint128)) private encryptedOutcomeTotals;

  /// @notice Tracks whether a winning payout has already been claimed for a market.
  mapping(uint256 => mapping(address => bool)) public hasClaimed;

  /// @notice Tracks dispute stake deposits per market and account.
  mapping(uint256 => mapping(address => uint256)) public disputeContributions;

  /// @param oracleRegistry_ The oracle registry used for proposal authorization and slashing.
  /// @param defaultDisputeWindow_ The default dispute window, in seconds.
  constructor(address oracleRegistry_, uint64 defaultDisputeWindow_) Ownable(msg.sender) {
    require(oracleRegistry_ != address(0), 'Oracle registry is required');
    require(defaultDisputeWindow_ > 0, 'Dispute window is required');

    oracleRegistry = OracleRegistry(oracleRegistry_);
    defaultDisputeWindow = defaultDisputeWindow_;
    acceptedCollateral[address(0)] = true;
  }

  /// @notice Whitelists or removes an ERC20 collateral token for new markets.
  /// @param token The ERC20 token address.
  /// @param allowed Whether the token should be allowed.
  function setAcceptedCollateral(address token, bool allowed) external onlyOwner {
    require(token != address(0), 'Use native ETH implicitly');
    acceptedCollateral[token] = allowed;

    emit AcceptedCollateralUpdated(token, allowed);
  }

  /// @notice Creates a new prediction market inside the singleton.
  /// @param title The objective market title.
  /// @param category The market category.
  /// @param marketType The market type.
  /// @param outcomes The list of outcomes.
  /// @param expiryTime The market expiry timestamp.
  /// @param collateralToken The collateral token, or zero for native ETH.
  /// @param minimumStake The minimum stake amount for a bet.
  /// @return marketId The newly created market id.
  function createMarket(
    string calldata title,
    string calldata category,
    MarketType marketType,
    string[] calldata outcomes,
    uint64 expiryTime,
    address collateralToken,
    uint128 minimumStake
  ) external returns (uint256 marketId) {
    require(bytes(title).length > 0, 'Title is required');
    require(bytes(category).length > 0, 'Category is required');
    require(minimumStake > 0, 'Minimum stake is required');
    require(expiryTime > block.timestamp, 'Expiry must be in the future');
    require(outcomes.length >= 2, 'At least two outcomes are required');

    if (marketType == MarketType.BINARY) {
      require(outcomes.length == 2, 'Binary markets require two outcomes');
    }

    if (collateralToken != address(0)) {
      require(acceptedCollateral[collateralToken], 'Collateral token is not whitelisted');
    }

    marketId = nextMarketId;
    nextMarketId += 1;

    Market storage market = markets[marketId];
    market.creator = msg.sender;
    market.collateralToken = collateralToken;
    market.createdAt = uint64(block.timestamp);
    market.expiryTime = expiryTime;
    market.minimumStake = minimumStake;
    market.outcomeCount = uint8(outcomes.length);
    market.marketType = marketType;
    market.state = MarketState.ACTIVE;
    market.exists = true;
    market.proposedOutcome = type(uint8).max;
    market.finalOutcome = type(uint8).max;
    market.title = title;
    market.category = category;

    for (uint256 outcomeIndex = 0; outcomeIndex < outcomes.length; outcomeIndex += 1) {
      require(bytes(outcomes[outcomeIndex]).length > 0, 'Outcome label is required');
      marketOutcomeLabels[marketId].push(outcomes[outcomeIndex]);

      encryptedOutcomeTotals[marketId][uint8(outcomeIndex)] = FHE.asEuint128(0);
      FHE.allowThis(encryptedOutcomeTotals[marketId][uint8(outcomeIndex)]);
    }

    emit MarketCreated(marketId, msg.sender, collateralToken, market.outcomeCount, title);
  }

  /// @notice Places a bet on a specific market outcome.
  /// @dev The plaintext amount is enforceable for settlement, while the encrypted input is mirrored
  /// for future privacy-native flows and FHE-based reads.
  /// @param marketId The market id.
  /// @param outcomeIndex The chosen outcome index.
  /// @param plainStakeAmount The enforceable stake amount used for payment and payout math.
  /// @param encStake The encrypted stake mirror submitted by the client.
  function placeBet(
    uint256 marketId,
    uint8 outcomeIndex,
    uint128 plainStakeAmount,
    InEuint128 calldata encStake
  ) external payable {
    Market storage market = _getMarketStorage(marketId);
    _syncExpiredState(marketId, market);

    require(market.state == MarketState.ACTIVE, 'Market is not active');
    require(outcomeIndex < market.outcomeCount, 'Outcome index is invalid');
    require(plainStakeAmount >= market.minimumStake, 'Stake is below market minimum');

    _collectCollateral(market.collateralToken, plainStakeAmount);

    plainStakes[marketId][msg.sender][outcomeIndex] += plainStakeAmount;
    plainOutcomeTotals[marketId][outcomeIndex] += plainStakeAmount;
    market.totalLiquidity += plainStakeAmount;

    bytes32 accountKey = _getAccountStakeKey(marketId, msg.sender);
    euint128 stake = FHE.asEuint128(encStake);
    euint128 currentStake = encryptedStakes[marketId][accountKey][outcomeIndex];

    if (euint128.unwrap(currentStake) == 0) {
      encryptedStakes[marketId][accountKey][outcomeIndex] = stake;
    } else {
      encryptedStakes[marketId][accountKey][outcomeIndex] = FHE.add(currentStake, stake);
    }

    encryptedOutcomeTotals[marketId][outcomeIndex] = FHE.add(
      encryptedOutcomeTotals[marketId][outcomeIndex],
      stake
    );

    FHE.allowThis(encryptedStakes[marketId][accountKey][outcomeIndex]);
    FHE.allowSender(encryptedStakes[marketId][accountKey][outcomeIndex]);
    FHE.allowThis(encryptedOutcomeTotals[marketId][outcomeIndex]);

    emit BetPlaced(
      marketId,
      msg.sender,
      outcomeIndex,
      plainStakeAmount,
      euint128.unwrap(encryptedStakes[marketId][accountKey][outcomeIndex])
    );
  }

  /// @notice Forces the singleton to update a market from ACTIVE to EXPIRED when the deadline passes.
  /// @param marketId The market id.
  function expireMarket(uint256 marketId) external {
    Market storage market = _getMarketStorage(marketId);
    _syncExpiredState(marketId, market);
    require(market.state == MarketState.EXPIRED, 'Market has not expired');
  }

  /// @notice Allows a staked oracle to propose the final outcome after market expiry.
  /// @param marketId The market id.
  /// @param outcomeIndex The proposed winning outcome.
  function proposeOutcome(uint256 marketId, uint8 outcomeIndex) external {
    Market storage market = _getMarketStorage(marketId);
    _syncExpiredState(marketId, market);

    require(market.state == MarketState.EXPIRED, 'Market is not ready for proposal');
    require(outcomeIndex < market.outcomeCount, 'Outcome index is invalid');
    require(oracleRegistry.isOracle(msg.sender), 'Caller is not a registered oracle');

    market.state = MarketState.PROPOSED;
    market.proposedOutcome = outcomeIndex;
    market.proposedBy = msg.sender;
    market.disputeWindowEndsAt = uint64(block.timestamp) + defaultDisputeWindow;

    emit OutcomeProposed(marketId, msg.sender, outcomeIndex, market.disputeWindowEndsAt);
  }

  /// @notice Challenges a proposed outcome by staking the market collateral during the dispute window.
  /// @param marketId The market id.
  /// @param stakeAmount The dispute stake amount.
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

    emit OutcomeDisputed(marketId, msg.sender, stakeAmount);
  }

  /// @notice Finalizes an undisputed market after the dispute window ends.
  /// @param marketId The market id.
  function finalizeMarket(uint256 marketId) external {
    Market storage market = _getMarketStorage(marketId);

    require(market.state == MarketState.PROPOSED, 'Market is not awaiting finalization');
    require(block.timestamp > market.disputeWindowEndsAt, 'Dispute window is still open');

    market.state = MarketState.FINALIZED;
    market.finalOutcome = market.proposedOutcome;

    emit MarketFinalized(marketId, market.finalOutcome, false);
  }

  /// @notice Resolves a disputed market and optionally slashes the proposing oracle.
  /// @param marketId The market id.
  /// @param finalOutcome The final winning outcome.
  /// @param oracleSlashAmount The oracle stake penalty to route to the owner.
  function resolveDispute(
    uint256 marketId,
    uint8 finalOutcome,
    uint256 oracleSlashAmount
  ) external onlyOwner {
    Market storage market = _getMarketStorage(marketId);

    require(market.state == MarketState.DISPUTED, 'Market is not disputed');
    require(block.timestamp > market.disputeWindowEndsAt, 'Dispute window is still open');
    require(finalOutcome < market.outcomeCount, 'Outcome index is invalid');

    market.state = MarketState.FINALIZED;
    market.finalOutcome = finalOutcome;

    if (oracleSlashAmount > 0 && market.proposedBy != address(0)) {
      oracleRegistry.slash(market.proposedBy, oracleSlashAmount, owner());
    }

    emit MarketFinalized(marketId, finalOutcome, true);
  }

  /// @notice Claims winnings for the caller when the caller backed the finalized outcome.
  /// @param marketId The market id.
  function claimReward(uint256 marketId) external {
    Market storage market = _getMarketStorage(marketId);

    require(market.state == MarketState.FINALIZED, 'Market is not finalized');
    require(!hasClaimed[marketId][msg.sender], 'Reward already claimed');

    uint8 finalOutcome = market.finalOutcome;
    uint256 winningStake = plainStakes[marketId][msg.sender][finalOutcome];
    require(winningStake > 0, 'Caller has no winning stake');

    uint256 winningPool = plainOutcomeTotals[marketId][finalOutcome];
    require(winningPool > 0, 'Winning pool is empty');

    uint256 payoutAmount = (uint256(market.totalLiquidity) * winningStake) / winningPool;
    hasClaimed[marketId][msg.sender] = true;

    _payCollateral(market.collateralToken, msg.sender, payoutAmount);

    emit RewardClaimed(marketId, msg.sender, payoutAmount);
  }

  /// @notice Claims back a previously posted dispute stake after the disputed market is finalized.
  /// @param marketId The market id.
  function claimDisputeRefund(uint256 marketId) external {
    Market storage market = _getMarketStorage(marketId);
    uint256 refundAmount = disputeContributions[marketId][msg.sender];

    require(market.state == MarketState.FINALIZED, 'Market is not finalized');
    require(refundAmount > 0, 'No dispute refund available');

    disputeContributions[marketId][msg.sender] = 0;
    _payCollateral(market.collateralToken, msg.sender, refundAmount);

    emit DisputeRefundClaimed(marketId, msg.sender, refundAmount);
  }

  /// @notice Returns full market metadata and state for frontend reads.
  /// @param marketId The market id.
  /// @return The market view object.
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
        minimumStake: market.minimumStake,
        totalLiquidity: market.totalLiquidity,
        disputeStakeTotal: market.disputeStakeTotal,
        outcomeCount: market.outcomeCount,
        proposedOutcome: market.proposedOutcome,
        finalOutcome: market.finalOutcome,
        marketType: market.marketType,
        state: market.state,
        title: market.title,
        category: market.category,
        outcomes: marketOutcomeLabels[marketId]
      });
  }

  /// @notice Returns the configured outcome labels for a market.
  /// @param marketId The market id.
  /// @return The outcome labels.
  function getOutcomeLabels(uint256 marketId) external view returns (string[] memory) {
    _requireExistingMarket(marketId);
    return marketOutcomeLabels[marketId];
  }

  /// @notice Returns the enforceable plaintext stake for a user and outcome.
  /// @param marketId The market id.
  /// @param account The account to inspect.
  /// @param outcomeIndex The outcome index.
  /// @return The stake amount.
  function getPlainStake(
    uint256 marketId,
    address account,
    uint8 outcomeIndex
  ) external view returns (uint256) {
    _requireValidOutcome(marketId, outcomeIndex);
    return plainStakes[marketId][account][outcomeIndex];
  }

  /// @notice Returns the enforceable plaintext total for a market outcome.
  /// @param marketId The market id.
  /// @param outcomeIndex The outcome index.
  /// @return The outcome liquidity.
  function getOutcomeLiquidity(uint256 marketId, uint8 outcomeIndex) external view returns (uint256) {
    _requireValidOutcome(marketId, outcomeIndex);
    return plainOutcomeTotals[marketId][outcomeIndex];
  }

  /// @notice Returns the encrypted total handle for a market outcome.
  /// @param marketId The market id.
  /// @param outcomeIndex The outcome index.
  /// @return The ciphertext handle.
  function getEncryptedOutcomeTotalHandle(
    uint256 marketId,
    uint8 outcomeIndex
  ) external view returns (uint256) {
    _requireValidOutcome(marketId, outcomeIndex);
    return euint128.unwrap(encryptedOutcomeTotals[marketId][outcomeIndex]);
  }

  /// @notice Returns the encrypted user stake handle for a specific outcome.
  /// @param marketId The market id.
  /// @param account The account to inspect.
  /// @param outcomeIndex The outcome index.
  /// @return The ciphertext handle.
  function getEncryptedUserStakeHandle(
    uint256 marketId,
    address account,
    uint8 outcomeIndex
  ) external view returns (uint256) {
    _requireValidOutcome(marketId, outcomeIndex);
    bytes32 accountKey = _getAccountStakeKey(marketId, account);
    return euint128.unwrap(encryptedStakes[marketId][accountKey][outcomeIndex]);
  }

  /// @notice Returns the currently claimable payout for a user.
  /// @param marketId The market id.
  /// @param account The account to inspect.
  /// @return The claimable payout amount.
  function getClaimableAmount(uint256 marketId, address account) external view returns (uint256) {
    Market storage market = _getMarketStorage(marketId);

    if (market.state != MarketState.FINALIZED || hasClaimed[marketId][account]) {
      return 0;
    }

    uint8 finalOutcome = market.finalOutcome;
    uint256 winningStake = plainStakes[marketId][account][finalOutcome];
    uint256 winningPool = plainOutcomeTotals[marketId][finalOutcome];

    if (winningStake == 0 || winningPool == 0) {
      return 0;
    }

    return (uint256(market.totalLiquidity) * winningStake) / winningPool;
  }

  function _collectCollateral(address collateralToken, uint128 amount) internal {
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

  function _syncExpiredState(uint256 marketId, Market storage market) internal {
    if (market.state == MarketState.ACTIVE && block.timestamp >= market.expiryTime) {
      market.state = MarketState.EXPIRED;
      emit MarketExpired(marketId);
    }
  }

  function _getMarketStorage(uint256 marketId) internal view returns (Market storage) {
    _requireExistingMarket(marketId);
    return markets[marketId];
  }

  function _requireExistingMarket(uint256 marketId) internal view {
    require(markets[marketId].exists, 'Market does not exist');
  }

  function _requireValidOutcome(uint256 marketId, uint8 outcomeIndex) internal view {
    _requireExistingMarket(marketId);
    require(outcomeIndex < markets[marketId].outcomeCount, 'Outcome index is invalid');
  }

  function _getAccountStakeKey(uint256 marketId, address account) internal view returns (bytes32) {
    return keccak256(abi.encodePacked(address(this), marketId, account));
  }
}
