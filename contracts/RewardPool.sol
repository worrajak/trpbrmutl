// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

/**
 * @title RewardPool
 * @notice RPF token reward distribution for the Royal Project Follow-up system.
 *         Links to RPFToken (TRC-20) and ProjectManager.
 *         Deployed on TRON Nile Testnet.
 *
 *         - Admin deposits RPF tokens at the start of each fiscal year.
 *         - Rewards are allocated when reports are approved, KPIs verified,
 *           or activities completed on time.
 *         - Exchange rate (RPF -> THB) is hidden until the admin reveals it
 *           at year end.
 */

// ---------- minimal interfaces (avoids import) ----------

interface IRPFToken {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IProjectManager {
    function isReportApproved(uint256 reportId) external view returns (bool);
    function getReportSubmitter(uint256 reportId) external view returns (address);
    function isKPIVerified(uint256 kpiId) external view returns (bool);
    function getKPIProjectResponsible(uint256 kpiId) external view returns (address);
    function getKPIPercentage(uint256 kpiId) external view returns (uint256);
    function getActivityStatus(string calldata projectCode, uint8 activityOrder) external view returns (uint8);
    function getProjectResponsible(string calldata projectCode) external view returns (address);
}

contract RewardPool {

    // ---------------------------------------------------------------
    //  Structs
    // ---------------------------------------------------------------

    struct RewardConfig {
        uint256 reportApprovedReward;   // RPF per approved report   (e.g. 500 * 1e6)
        uint256 kpiFullReward;          // RPF per KPI >= 100%       (e.g. 2000 * 1e6)
        uint256 kpiPartialReward;       // RPF per KPI 80-99%        (e.g. 1200 * 1e6)
        uint256 onTimeBonus;            // RPF for on-time activity  (e.g. 300 * 1e6)
        uint256 newsUpdateReward;       // RPF per news update       (e.g. 200 * 1e6)
    }

    // ---------------------------------------------------------------
    //  State
    // ---------------------------------------------------------------

    address public admin;
    IRPFToken public rpfToken;
    IProjectManager public projectManager;

    RewardConfig public rewardConfig;

    uint256 public totalDeposited;
    uint256 public totalAllocated;

    // Exchange rate: RPF -> THB (in satang per 1 RPF token unit).
    // Hidden (returns 0) until admin sets it at year end.
    uint256 private _exchangeRate;
    bool    public  exchangeRateRevealed;

    // Tracking per-user earned rewards
    mapping(address => uint256) public earnedRewards;

    // Guard: prevent double-rewarding
    mapping(uint256 => bool) private _reportRewarded;
    mapping(uint256 => bool) private _kpiRewarded;
    mapping(bytes32 => bool) private _onTimeBonusRewarded; // keccak256(projectCode, actOrder)

    // ---------------------------------------------------------------
    //  Events
    // ---------------------------------------------------------------

    event PoolDeposited(address indexed from, uint256 amount, uint256 totalDeposited);
    event RewardAllocated(address indexed to, uint256 amount, string reason);
    event ExchangeRateSet(uint256 ratePerRPF);
    event RewardConfigUpdated();

    // ---------------------------------------------------------------
    //  Modifiers
    // ---------------------------------------------------------------

    modifier onlyAdmin() {
        require(msg.sender == admin, "RewardPool: caller is not admin");
        _;
    }

    // ---------------------------------------------------------------
    //  Constructor
    // ---------------------------------------------------------------

    /**
     * @param _rpfToken        Address of deployed RPFToken contract.
     * @param _projectManager  Address of deployed ProjectManager contract.
     */
    constructor(address _rpfToken, address _projectManager) {
        require(_rpfToken != address(0), "RewardPool: zero token address");
        require(_projectManager != address(0), "RewardPool: zero manager address");
        admin          = msg.sender;
        rpfToken       = IRPFToken(_rpfToken);
        projectManager = IProjectManager(_projectManager);

        // Sensible defaults (can be changed by admin)
        rewardConfig = RewardConfig({
            reportApprovedReward: 500  * 1e6,
            kpiFullReward:       2000 * 1e6,
            kpiPartialReward:    1200 * 1e6,
            onTimeBonus:         300  * 1e6,
            newsUpdateReward:    200  * 1e6
        });
    }

    // ---------------------------------------------------------------
    //  Pool management
    // ---------------------------------------------------------------

    /**
     * @notice Admin deposits RPF tokens into this pool.
     *         Caller must first call rpfToken.approve(rewardPoolAddress, amount).
     */
    function depositPool(uint256 amount) external onlyAdmin {
        require(amount > 0, "RewardPool: zero amount");
        bool ok = rpfToken.transferFrom(msg.sender, address(this), amount);
        require(ok, "RewardPool: transfer failed");
        totalDeposited += amount;
        emit PoolDeposited(msg.sender, amount, totalDeposited);
    }

    function setRewardConfig(
        uint256 _reportApprovedReward,
        uint256 _kpiFullReward,
        uint256 _kpiPartialReward,
        uint256 _onTimeBonus,
        uint256 _newsUpdateReward
    ) external onlyAdmin {
        rewardConfig = RewardConfig({
            reportApprovedReward: _reportApprovedReward,
            kpiFullReward:       _kpiFullReward,
            kpiPartialReward:    _kpiPartialReward,
            onTimeBonus:         _onTimeBonus,
            newsUpdateReward:    _newsUpdateReward
        });
        emit RewardConfigUpdated();
    }

    // ---------------------------------------------------------------
    //  Reward allocation
    // ---------------------------------------------------------------

    /**
     * @notice Allocate reward for an approved report.
     */
    function allocateReportReward(address to, uint256 reportId) external onlyAdmin {
        require(!_reportRewarded[reportId], "RewardPool: report already rewarded");
        require(projectManager.isReportApproved(reportId), "RewardPool: report not approved");

        address submitter = projectManager.getReportSubmitter(reportId);
        require(to == submitter, "RewardPool: recipient must be report submitter");

        uint256 reward = rewardConfig.reportApprovedReward;
        _sendReward(to, reward, "report-approved");
        _reportRewarded[reportId] = true;
    }

    /**
     * @notice Allocate reward for a verified KPI.
     *         Full reward if >= 100%, partial if 80-99%.
     */
    function allocateKPIReward(address to, uint256 kpiId) external onlyAdmin {
        require(!_kpiRewarded[kpiId], "RewardPool: KPI already rewarded");
        require(projectManager.isKPIVerified(kpiId), "RewardPool: KPI not verified");

        address responsible = projectManager.getKPIProjectResponsible(kpiId);
        require(to == responsible, "RewardPool: recipient must be project responsible");

        uint256 pct = projectManager.getKPIPercentage(kpiId);
        uint256 reward;
        if (pct >= 100) {
            reward = rewardConfig.kpiFullReward;
        } else if (pct >= 80) {
            reward = rewardConfig.kpiPartialReward;
        } else {
            revert("RewardPool: KPI below 80% threshold");
        }

        _sendReward(to, reward, "kpi-verified");
        _kpiRewarded[kpiId] = true;
    }

    /**
     * @notice Admin grants an on-time completion bonus.
     *         Activity must be in Completed status (enum value 2).
     */
    function allocateOnTimeBonus(
        address to,
        string calldata projectCode,
        uint8 activityOrder
    ) external onlyAdmin {
        bytes32 key = keccak256(abi.encodePacked(projectCode, activityOrder));
        require(!_onTimeBonusRewarded[key], "RewardPool: on-time bonus already given");

        // ActivityStatus.Completed == 2
        uint8 status = projectManager.getActivityStatus(projectCode, activityOrder);
        require(status == 2, "RewardPool: activity not completed");

        address responsible = projectManager.getProjectResponsible(projectCode);
        require(to == responsible, "RewardPool: recipient must be project responsible");

        uint256 reward = rewardConfig.onTimeBonus;
        _sendReward(to, reward, "on-time-bonus");
        _onTimeBonusRewarded[key] = true;
    }

    /**
     * @notice Admin grants a news-update reward (manual trigger).
     */
    function allocateNewsReward(address to) external onlyAdmin {
        require(to != address(0), "RewardPool: zero address");
        _sendReward(to, rewardConfig.newsUpdateReward, "news-update");
    }

    // ---------------------------------------------------------------
    //  Exchange rate (hidden until revealed)
    // ---------------------------------------------------------------

    /**
     * @notice Admin sets the RPF-to-THB exchange rate at year end.
     * @param ratePerRPF  Satang per 1 RPF (smallest unit).
     */
    function setExchangeRate(uint256 ratePerRPF) external onlyAdmin {
        require(ratePerRPF > 0, "RewardPool: rate must be > 0");
        _exchangeRate = ratePerRPF;
        exchangeRateRevealed = true;
        emit ExchangeRateSet(ratePerRPF);
    }

    /**
     * @notice Returns exchange rate. Returns 0 until admin reveals it.
     */
    function getExchangeRate() external view returns (uint256) {
        if (!exchangeRateRevealed) return 0;
        return _exchangeRate;
    }

    // ---------------------------------------------------------------
    //  Views
    // ---------------------------------------------------------------

    function getEarnedRewards(address user) external view returns (uint256) {
        return earnedRewards[user];
    }

    function getTotalPoolBalance() external view returns (uint256) {
        return rpfToken.balanceOf(address(this));
    }

    /**
     * @notice Public pool info (does NOT reveal exchange rate).
     */
    function getPoolInfo()
        external view
        returns (
            uint256 _totalDeposited,
            uint256 _totalAllocated,
            uint256 _currentBalance,
            bool    _exchangeRateRevealed
        )
    {
        return (
            totalDeposited,
            totalAllocated,
            rpfToken.balanceOf(address(this)),
            exchangeRateRevealed
        );
    }

    // ---------------------------------------------------------------
    //  Admin helpers
    // ---------------------------------------------------------------

    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "RewardPool: zero address");
        admin = newAdmin;
    }

    /**
     * @notice Emergency: withdraw remaining pool tokens back to admin.
     */
    function emergencyWithdraw() external onlyAdmin {
        uint256 bal = rpfToken.balanceOf(address(this));
        require(bal > 0, "RewardPool: nothing to withdraw");
        bool ok = rpfToken.transfer(admin, bal);
        require(ok, "RewardPool: transfer failed");
    }

    // ---------------------------------------------------------------
    //  Internal
    // ---------------------------------------------------------------

    function _sendReward(address to, uint256 amount, string memory reason) internal {
        require(amount > 0, "RewardPool: zero reward");
        uint256 poolBal = rpfToken.balanceOf(address(this));
        require(poolBal >= amount, "RewardPool: insufficient pool balance");

        bool ok = rpfToken.transfer(to, amount);
        require(ok, "RewardPool: transfer failed");

        totalAllocated += amount;
        earnedRewards[to] += amount;

        emit RewardAllocated(to, amount, reason);
    }
}
