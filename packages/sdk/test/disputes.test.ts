import { describe, expect, it } from 'vitest';
import { zeroAddress } from 'viem';
import { deriveReineiraDisputeStatus } from '../src/disputes.js';

const FINALIZED = 4;
const RESOLUTION_OPEN = 2;
const adapter = '0x1111111111111111111111111111111111111111';

describe('deriveReineiraDisputeStatus', () => {
  it('marks finalized adapter disputes that are not settled as needing settlement', () => {
    const status = deriveReineiraDisputeStatus({
      marketState: FINALIZED,
      disputeOpened: true,
      disputeRefundsEnabled: true,
      marketDisputeAdapter: adapter,
      escrowId: 77n,
      escrowRegistered: true,
      escrowActivated: true,
      escrowSettled: false,
    });

    expect(status.needsSettlement).toBe(true);
    expect(status.needsActivation).toBe(false);
    expect(status.usesReineira).toBe(true);
  });

  it('marks funded but inactive escrows as needing activation', () => {
    const status = deriveReineiraDisputeStatus({
      marketState: RESOLUTION_OPEN,
      disputeOpened: false,
      disputeRefundsEnabled: false,
      marketDisputeAdapter: null,
      escrowId: 78n,
      escrowRegistered: true,
      escrowActivated: false,
      escrowSettled: false,
    });

    expect(status.needsActivation).toBe(true);
    expect(status.needsSettlement).toBe(false);
    expect(status.usesReineira).toBe(true);
  });

  it('returns inactive status when no adapter or escrow is present', () => {
    const status = deriveReineiraDisputeStatus({
      marketState: FINALIZED,
      disputeOpened: false,
      disputeRefundsEnabled: false,
      marketDisputeAdapter: null,
      escrowId: null,
      escrowRegistered: false,
      escrowActivated: false,
      escrowSettled: false,
    });

    expect(status.usesReineira).toBe(false);
    expect(status.needsSettlement).toBe(false);
    expect(status.adapterAddress).toBeNull();
  });

  it('does not require settlement after escrow is settled', () => {
    const status = deriveReineiraDisputeStatus({
      marketState: FINALIZED,
      disputeOpened: true,
      disputeRefundsEnabled: false,
      marketDisputeAdapter: adapter,
      escrowId: 79n,
      escrowRegistered: true,
      escrowActivated: true,
      escrowSettled: true,
    });

    expect(status.needsSettlement).toBe(false);
  });

  it('treats zero adapter address as absent', () => {
    const status = deriveReineiraDisputeStatus({
      marketState: FINALIZED,
      disputeOpened: true,
      disputeRefundsEnabled: true,
      marketDisputeAdapter: zeroAddress,
      escrowId: null,
      escrowRegistered: false,
      escrowActivated: false,
      escrowSettled: false,
    });

    expect(status.adapterAddress).toBeNull();
    expect(status.usesReineira).toBe(false);
  });
});
