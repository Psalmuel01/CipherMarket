# Wave 3C Validation Checklist

This validation checklist supports the integration plan in [docs/wave-3c-spec.md](/Users/sam/Desktop/Fhenix/CipherMarket/docs/wave-3c-spec.md) and the sequence in [docs/roadmap.md](/Users/sam/Desktop/Fhenix/CipherMarket/docs/roadmap.md).

## Purpose

Before CipherMarket changes its dispute custody model, we need to confirm that Privara can support the Wave 3C release logic on Sepolia without weakening the current dispute flow.

## Inputs Required

- Sepolia RPC access
- deployed `PredictionMarket` address
- deployed `OracleRegistry` address
- Sepolia USDC address
- Privara / Reineira SDK installation
- any Privara credentials or project configuration required by their SDK

## Bootstrap Command

From the repo root:

```bash
pnpm validate:privara
```

This bootstrap script:

- checks the expected Sepolia env values
- confirms whether `@reineira-os/sdk` is installed
- prints the next validation steps

## Validation Questions

The validation is successful only if we can answer all of these with confidence:

1. Can a dispute bond escrow be created for the target collateral we use in disputes?
2. Can refund vs forfeiture be tied to finalized CipherMarket state?
3. Can the normal release path complete without manual operator action?
4. Can the protocol keep a safe fallback path if Privara is unavailable?

## Expected Output

At the end of the validation spike, we should have a short written result that says one of:

- `PASS`
  - Wave 3C can proceed into contract integration
- `PARTIAL`
  - some escrow mechanics work, but release conditions or operational reliability are not ready
- `FAIL`
  - Wave 3C should stay native for now and not proceed

## Recommended Notes To Capture

- how escrow is created
- what identifiers we receive back from Privara
- whether Sepolia USDC works cleanly
- what condition expression is needed for refund vs forfeiture
- whether the release target should be:
  - direct disputer refund
  - protocol-owned settlement receiver
  - another distribution address
- what operational failure modes remain

## Decision Rule

If refund vs forfeiture cannot be expressed reliably against finalized CipherMarket state, Wave 3C should not proceed beyond validation.
