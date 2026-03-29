// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import '@openzeppelin/contracts/access/Ownable.sol';

/// @title OracleRegistry
/// @notice Manages oracle staking and authorization for the singleton prediction market.
contract OracleRegistry is Ownable {
  /// @notice Oracle profile tracked in the registry.
  struct OracleProfile {
    uint256 stakedAmount;
    bool active;
  }

  /// @notice Emitted when the prediction market contract is authorized to slash oracles.
  /// @param predictionMarket The prediction market contract address.
  event PredictionMarketSet(address indexed predictionMarket);

  /// @notice Emitted when an oracle registers.
  /// @param oracle The oracle account.
  /// @param stakeAmount The total oracle stake after registration.
  event OracleRegistered(address indexed oracle, uint256 stakeAmount);

  /// @notice Emitted when an oracle increases stake.
  /// @param oracle The oracle account.
  /// @param addedStake The amount added.
  /// @param totalStake The total stake after the increase.
  event OracleStakeIncreased(address indexed oracle, uint256 addedStake, uint256 totalStake);

  /// @notice Emitted when an oracle deregisters and withdraws stake.
  /// @param oracle The oracle account.
  /// @param refundedStake The amount refunded.
  event OracleDeregistered(address indexed oracle, uint256 refundedStake);

  /// @notice Emitted when an oracle is slashed.
  /// @param oracle The oracle account.
  /// @param recipient The slash recipient.
  /// @param amount The amount slashed.
  event OracleSlashed(address indexed oracle, address indexed recipient, uint256 amount);

  /// @notice Minimum ETH stake required to be treated as an active oracle.
  uint256 public immutable minimumStake;

  /// @notice Singleton prediction market authorized to slash oracles.
  address public predictionMarket;

  mapping(address => OracleProfile) private oracleProfiles;

  /// @param minimumStake_ The minimum ETH stake required for oracle registration.
  constructor(uint256 minimumStake_) Ownable(msg.sender) {
    require(minimumStake_ > 0, 'Minimum stake is required');
    minimumStake = minimumStake_;
  }

  modifier onlyPredictionMarketOrOwner() {
    require(
      msg.sender == predictionMarket || msg.sender == owner(),
      'Caller is not authorized to slash'
    );
    _;
  }

  /// @notice Authorizes the singleton prediction market to slash oracle stakes.
  /// @param predictionMarket_ The singleton prediction market address.
  function setPredictionMarket(address predictionMarket_) external onlyOwner {
    require(predictionMarket_ != address(0), 'Prediction market is required');
    predictionMarket = predictionMarket_;

    emit PredictionMarketSet(predictionMarket_);
  }

  /// @notice Registers the caller as an oracle by locking ETH stake.
  function register() external payable {
    OracleProfile storage profile = oracleProfiles[msg.sender];

    require(!profile.active, 'Oracle is already active');
    require(msg.value >= minimumStake, 'Stake below minimum');

    profile.stakedAmount = msg.value;
    profile.active = true;

    emit OracleRegistered(msg.sender, profile.stakedAmount);
  }

  /// @notice Adds more ETH stake to the caller's oracle position.
  function increaseStake() external payable {
    OracleProfile storage profile = oracleProfiles[msg.sender];

    require(profile.active, 'Oracle is not active');
    require(msg.value > 0, 'Stake increase is required');

    profile.stakedAmount += msg.value;

    emit OracleStakeIncreased(msg.sender, msg.value, profile.stakedAmount);
  }

  /// @notice Deregisters the caller and refunds the full oracle stake.
  function deregister() external {
    OracleProfile storage profile = oracleProfiles[msg.sender];

    require(profile.active, 'Oracle is not active');

    uint256 refundAmount = profile.stakedAmount;
    profile.stakedAmount = 0;
    profile.active = false;

    (bool sent, ) = payable(msg.sender).call{ value: refundAmount }('');
    require(sent, 'Refund transfer failed');

    emit OracleDeregistered(msg.sender, refundAmount);
  }

  /// @notice Slashes an oracle and transfers the penalty to the recipient.
  /// @param oracle The oracle to slash.
  /// @param amount The amount to slash.
  /// @param recipient The penalty recipient.
  /// @return actualSlash The amount actually slashed.
  function slash(
    address oracle,
    uint256 amount,
    address recipient
  ) external onlyPredictionMarketOrOwner returns (uint256 actualSlash) {
    OracleProfile storage profile = oracleProfiles[oracle];

    require(profile.stakedAmount > 0, 'Oracle has no slashable stake');
    require(recipient != address(0), 'Recipient is required');

    actualSlash = amount > profile.stakedAmount ? profile.stakedAmount : amount;
    require(actualSlash > 0, 'Slash amount must be positive');

    profile.stakedAmount -= actualSlash;

    if (profile.stakedAmount < minimumStake) {
      profile.active = false;
    }

    (bool sent, ) = payable(recipient).call{ value: actualSlash }('');
    require(sent, 'Slash transfer failed');

    emit OracleSlashed(oracle, recipient, actualSlash);
  }

  /// @notice Checks whether an address is an active oracle.
  /// @param oracle The account to check.
  /// @return True when the account is active and meets the minimum stake.
  function isOracle(address oracle) external view returns (bool) {
    OracleProfile memory profile = oracleProfiles[oracle];
    return profile.active && profile.stakedAmount >= minimumStake;
  }

  /// @notice Returns the oracle profile for the given account.
  /// @param oracle The account to inspect.
  /// @return The current oracle profile.
  function getOracle(address oracle) external view returns (OracleProfile memory) {
    return oracleProfiles[oracle];
  }
}
