# RPF Smart Contracts (TRON Nile Testnet)

Smart contracts for the Royal Project Follow-up (RPF) on-chain tracking system.

**Admin wallet:** `TU7VbEyrdZMmfMAqsNUmjmcG4CMBLtK7qj`

---

## Contracts

### 1. RPFToken.sol (TRC-20)

Standard TRC-20 token used as the internal reward currency.

| Property | Value |
|----------|-------|
| Name | RPF Reward Token |
| Symbol | RPF |
| Decimals | 6 |

Key features:
- `mint(address, uint256)` -- owner-only, creates new tokens.
- `burn(uint256)` -- any holder can burn their own tokens.
- Standard TRC-20 functions: `transfer`, `approve`, `transferFrom`, `balanceOf`, `allowance`, `totalSupply`.

### 2. ProjectManager.sol

Core logic for managing projects, activities, reports, and KPIs.

- **Projects** -- admin adds projects with budget, dates, and a responsible address.
- **Activities** -- each project has ordered activities with planned months and expected output.
- **Reports** -- the responsible person submits a report (content hash); signers approve via multi-sig (2-of-N by default).
- **KPIs** -- the responsible person submits KPI results; auto-verified when actual >= target.

Multi-sig: admin can add/remove signers. A report is approved when `approvalCount >= requiredApprovals` (default 2).

### 3. RewardPool.sol

Token reward distribution that reads from RPFToken and ProjectManager.

- Admin deposits RPF tokens at the start of the fiscal year.
- Rewards are allocated for: approved reports, verified KPIs (full/partial), on-time activity completion, and news updates.
- Exchange rate (RPF to THB) is hidden until admin reveals it at year end.
- Includes emergency withdrawal for admin.

---

## Deployment Order

Contracts must be deployed in this exact order:

```
1. RPFToken          (constructor arg: initialSupply, e.g. 10000000000000 = 10M RPF)
2. ProjectManager    (no constructor args)
3. RewardPool        (constructor args: RPFToken address, ProjectManager address)
```

---

## Deployment with TronIDE

1. Open [TronIDE](https://www.tronide.io/).
2. Create three files and paste each `.sol` source.
3. Set compiler to `^0.8.6`.
4. Connect your wallet (TronLink) to **Nile Testnet**.
5. Deploy in order:
   - **RPFToken**: pass `10000000000000` (10M RPF) as `initialSupply`.
   - **ProjectManager**: no arguments.
   - **RewardPool**: pass the deployed RPFToken address and ProjectManager address.

## Deployment with TronBox

```bash
npm install -g tronbox

# In the project directory:
tronbox compile
tronbox migrate --network nile
```

`tronbox.js` config for Nile:

```js
module.exports = {
  networks: {
    nile: {
      privateKey: process.env.PRIVATE_KEY,
      fullHost: "https://nile.trongrid.io",
      network_id: "3"
    }
  },
  compilers: {
    solc: {
      version: "0.8.6"
    }
  }
};
```

---

## Example Interactions

All examples assume admin wallet `TU7VbEyrdZMmfMAqsNUmjmcG4CMBLtK7qj`.

### Setup

```js
// After deploying all three contracts:

// 1. Approve RewardPool to spend admin's RPF tokens
rpfToken.approve(rewardPoolAddress, 5000000 * 1e6);

// 2. Deposit tokens into the reward pool
rewardPool.depositPool(5000000 * 1e6);

// 3. Add a signer for multi-sig
projectManager.addSigner("TPx7a8vB...");
```

### Add a Project and Activity

```js
projectManager.addProject(
  "plant-profile",              // projectCode
  "Plant Profile Database",     // projectName
  "TResearcherWalletAddr...",   // responsible
  50000000,                     // budgetTotal (500,000 baht in satang)
  1696118400,                   // startDate (Oct 1 2023)
  1727654400                    // endDate (Sep 30 2024)
);

projectManager.addActivity(
  "plant-profile",              // projectCode
  1,                            // activityOrder
  "Data Collection",            // activityName
  10000000,                     // budget
  [10, 11, 12],                 // plannedMonths
  "Collected plant species data" // output
);
```

### Submit and Approve a Report

```js
// Responsible person submits (from their wallet):
projectManager.submitReport("plant-profile", 1, contentHash);
// Returns reportId = 0

// Signer 1 approves:
projectManager.approveReport(0);

// Signer 2 approves (reaches threshold of 2):
projectManager.approveReport(0);
// Emits ReportApproved event

// Admin allocates reward:
rewardPool.allocateReportReward(responsibleAddress, 0);
```

### Submit a KPI

```js
// Responsible person submits:
projectManager.submitKPI("plant-profile", "kpi-10", 100, 105);
// Auto-verified because 105 >= 100
// Returns kpiId = 0

// Admin allocates KPI reward:
rewardPool.allocateKPIReward(responsibleAddress, 0);
```

### Year-End: Reveal Exchange Rate

```js
// Admin sets exchange rate (e.g. 1 RPF = 0.50 baht = 50 satang)
rewardPool.setExchangeRate(50);

// Anyone can now read it:
rewardPool.getExchangeRate(); // returns 50
```

### Check Balances

```js
rpfToken.balanceOf(userAddress);           // user's RPF balance
rewardPool.getEarnedRewards(userAddress);  // total RPF earned via rewards
rewardPool.getTotalPoolBalance();          // remaining tokens in pool
rewardPool.getPoolInfo();                  // pool summary (no rate shown until revealed)
```
