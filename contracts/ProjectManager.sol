// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

/**
 * @title ProjectManager
 * @notice Core contract for the Royal Project Follow-up (RPF) system.
 *         Manages projects, activities, reports (multi-sig approval) and KPI
 *         verification.  Deployed on TRON Nile Testnet.
 */
contract ProjectManager {

    // ---------------------------------------------------------------
    //  Enums
    // ---------------------------------------------------------------

    enum ActivityStatus { NotStarted, InProgress, Completed, Delayed, Cancelled }

    // ---------------------------------------------------------------
    //  Structs
    // ---------------------------------------------------------------

    struct Project {
        string   projectCode;
        string   projectName;
        address  responsible;
        uint256  budgetTotal;    // smallest unit (satang)
        uint256  budgetUsed;
        uint256  startDate;      // unix timestamp
        uint256  endDate;
        bool     active;
    }

    struct Activity {
        string         projectCode;
        uint8          activityOrder;
        string         activityName;
        uint256        budget;
        uint8[]        plannedMonths;  // e.g. [10,11,12,1,2]
        string         output;
        ActivityStatus status;
    }

    // Report is stored with an id; the nested mapping (approvals) prevents
    // it from being used inside a dynamic array directly, so we use a
    // mapping(uint256 => Report).
    struct Report {
        string   projectCode;
        uint8    activityOrder;
        bytes32  contentHash;
        address  submitter;
        uint256  submittedAt;
        uint8    approvalCount;
        bool     approved;
    }
    // approvals tracked separately: reportId => signer => bool
    mapping(uint256 => mapping(address => bool)) private _reportApprovals;

    struct KPIResult {
        string   projectCode;
        string   indicatorId;   // e.g. "kpi-10"
        uint256  target;
        uint256  actual;
        bool     verified;
    }

    // ---------------------------------------------------------------
    //  State
    // ---------------------------------------------------------------

    address public admin;
    uint8   public requiredApprovals = 2;

    // Projects  (projectCode hash => Project)
    mapping(bytes32 => Project) private _projects;
    bytes32[] private _projectKeys;   // for enumeration

    // Activities  (keccak256(projectCode, activityOrder) => Activity)
    mapping(bytes32 => Activity) private _activities;
    // projectCode hash => list of activity keys
    mapping(bytes32 => bytes32[]) private _projectActivityKeys;

    // Reports
    Report[] private _reports;       // reportId = array index
    uint256 public reportCount;

    // KPI Results
    KPIResult[] private _kpiResults; // kpiId = array index
    uint256 public kpiCount;
    // projectCode hash => list of kpiIds
    mapping(bytes32 => uint256[]) private _projectKpiIds;

    // Multi-sig signers
    mapping(address => bool) public isSigner;
    address[] public signers;

    // ---------------------------------------------------------------
    //  Events
    // ---------------------------------------------------------------

    event ProjectAdded(string projectCode, string projectName, address responsible);
    event ActivityAdded(string projectCode, uint8 activityOrder, string activityName);
    event ReportSubmitted(uint256 indexed reportId, string projectCode, uint8 activityOrder, address submitter);
    event ReportApproved(uint256 indexed reportId, string projectCode, uint8 activityOrder);
    event ActivityStatusUpdated(string projectCode, uint8 activityOrder, ActivityStatus status);
    event KPISubmitted(uint256 indexed kpiId, string projectCode, string indicatorId);
    event KPIVerified(uint256 indexed kpiId, string projectCode, string indicatorId);
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);

    // ---------------------------------------------------------------
    //  Modifiers
    // ---------------------------------------------------------------

    modifier onlyAdmin() {
        require(msg.sender == admin, "ProjectManager: caller is not admin");
        _;
    }

    modifier onlyAdminOrSigner() {
        require(
            msg.sender == admin || isSigner[msg.sender],
            "ProjectManager: caller is not admin or signer"
        );
        _;
    }

    // ---------------------------------------------------------------
    //  Constructor
    // ---------------------------------------------------------------

    constructor() {
        admin = msg.sender;
        // Admin is also a signer by default
        isSigner[msg.sender] = true;
        signers.push(msg.sender);
    }

    // ---------------------------------------------------------------
    //  Signer management
    // ---------------------------------------------------------------

    function addSigner(address signer) external onlyAdmin {
        require(signer != address(0), "ProjectManager: zero address");
        require(!isSigner[signer], "ProjectManager: already a signer");
        isSigner[signer] = true;
        signers.push(signer);
        emit SignerAdded(signer);
    }

    function removeSigner(address signer) external onlyAdmin {
        require(isSigner[signer], "ProjectManager: not a signer");
        require(signer != admin, "ProjectManager: cannot remove admin signer");
        isSigner[signer] = false;
        // Remove from array
        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i] == signer) {
                signers[i] = signers[signers.length - 1];
                signers.pop();
                break;
            }
        }
        emit SignerRemoved(signer);
    }

    function setRequiredApprovals(uint8 _required) external onlyAdmin {
        require(_required >= 1, "ProjectManager: must require at least 1");
        requiredApprovals = _required;
    }

    function getSigners() external view returns (address[] memory) {
        return signers;
    }

    // ---------------------------------------------------------------
    //  Project management
    // ---------------------------------------------------------------

    function addProject(
        string calldata projectCode,
        string calldata projectName,
        address responsible,
        uint256 budgetTotal,
        uint256 startDate,
        uint256 endDate
    ) external onlyAdmin {
        require(bytes(projectCode).length > 0, "ProjectManager: empty project code");
        require(responsible != address(0), "ProjectManager: zero responsible");
        require(endDate > startDate, "ProjectManager: end must be after start");

        bytes32 key = keccak256(bytes(projectCode));
        require(bytes(_projects[key].projectCode).length == 0, "ProjectManager: project already exists");

        _projects[key] = Project({
            projectCode: projectCode,
            projectName: projectName,
            responsible: responsible,
            budgetTotal: budgetTotal,
            budgetUsed:  0,
            startDate:   startDate,
            endDate:     endDate,
            active:      true
        });
        _projectKeys.push(key);

        emit ProjectAdded(projectCode, projectName, responsible);
    }

    function getProject(string calldata projectCode)
        external view
        returns (
            string memory _projectName,
            address       _responsible,
            uint256       _budgetTotal,
            uint256       _budgetUsed,
            uint256       _startDate,
            uint256       _endDate,
            bool          _active
        )
    {
        bytes32 key = keccak256(bytes(projectCode));
        Project storage p = _projects[key];
        require(bytes(p.projectCode).length > 0, "ProjectManager: project not found");
        return (p.projectName, p.responsible, p.budgetTotal, p.budgetUsed, p.startDate, p.endDate, p.active);
    }

    function setProjectActive(string calldata projectCode, bool active) external onlyAdmin {
        bytes32 key = keccak256(bytes(projectCode));
        require(bytes(_projects[key].projectCode).length > 0, "ProjectManager: project not found");
        _projects[key].active = active;
    }

    function getAllProjectCodes() external view returns (string[] memory) {
        string[] memory codes = new string[](_projectKeys.length);
        for (uint256 i = 0; i < _projectKeys.length; i++) {
            codes[i] = _projects[_projectKeys[i]].projectCode;
        }
        return codes;
    }

    // ---------------------------------------------------------------
    //  Activity management
    // ---------------------------------------------------------------

    function addActivity(
        string calldata projectCode,
        uint8           activityOrder,
        string calldata activityName,
        uint256         budget,
        uint8[] calldata plannedMonths,
        string calldata output
    ) external onlyAdmin {
        bytes32 projKey = keccak256(bytes(projectCode));
        require(bytes(_projects[projKey].projectCode).length > 0, "ProjectManager: project not found");

        bytes32 actKey = keccak256(abi.encodePacked(projectCode, activityOrder));
        require(bytes(_activities[actKey].projectCode).length == 0, "ProjectManager: activity already exists");

        Activity storage a = _activities[actKey];
        a.projectCode   = projectCode;
        a.activityOrder  = activityOrder;
        a.activityName   = activityName;
        a.budget         = budget;
        a.plannedMonths  = plannedMonths;
        a.output         = output;
        a.status         = ActivityStatus.NotStarted;

        _projectActivityKeys[projKey].push(actKey);

        emit ActivityAdded(projectCode, activityOrder, activityName);
    }

    function updateActivityStatus(
        string calldata projectCode,
        uint8           activityOrder,
        ActivityStatus  status
    ) external {
        bytes32 projKey = keccak256(bytes(projectCode));
        Project storage p = _projects[projKey];
        require(bytes(p.projectCode).length > 0, "ProjectManager: project not found");
        require(
            msg.sender == admin || msg.sender == p.responsible,
            "ProjectManager: not admin or responsible"
        );

        bytes32 actKey = keccak256(abi.encodePacked(projectCode, activityOrder));
        require(bytes(_activities[actKey].projectCode).length > 0, "ProjectManager: activity not found");

        _activities[actKey].status = status;

        emit ActivityStatusUpdated(projectCode, activityOrder, status);
    }

    function getActivity(string calldata projectCode, uint8 activityOrder)
        external view
        returns (
            string memory _activityName,
            uint256       _budget,
            uint8[] memory _plannedMonths,
            string memory _output,
            ActivityStatus _status
        )
    {
        bytes32 actKey = keccak256(abi.encodePacked(projectCode, activityOrder));
        Activity storage a = _activities[actKey];
        require(bytes(a.projectCode).length > 0, "ProjectManager: activity not found");
        return (a.activityName, a.budget, a.plannedMonths, a.output, a.status);
    }

    /**
     * @notice Returns all activity orders for a project (caller can then
     *         use getActivity to fetch details).
     */
    function getProjectActivities(string calldata projectCode)
        external view
        returns (uint8[] memory orders)
    {
        bytes32 projKey = keccak256(bytes(projectCode));
        bytes32[] storage keys = _projectActivityKeys[projKey];
        orders = new uint8[](keys.length);
        for (uint256 i = 0; i < keys.length; i++) {
            orders[i] = _activities[keys[i]].activityOrder;
        }
    }

    // ---------------------------------------------------------------
    //  Report submission & multi-sig approval
    // ---------------------------------------------------------------

    function submitReport(
        string calldata projectCode,
        uint8           activityOrder,
        bytes32         contentHash
    ) external returns (uint256 reportId) {
        bytes32 projKey = keccak256(bytes(projectCode));
        Project storage p = _projects[projKey];
        require(bytes(p.projectCode).length > 0, "ProjectManager: project not found");
        require(p.active, "ProjectManager: project not active");
        require(
            msg.sender == p.responsible || msg.sender == admin,
            "ProjectManager: not responsible or admin"
        );

        bytes32 actKey = keccak256(abi.encodePacked(projectCode, activityOrder));
        require(bytes(_activities[actKey].projectCode).length > 0, "ProjectManager: activity not found");
        require(contentHash != bytes32(0), "ProjectManager: empty content hash");

        reportId = _reports.length;
        _reports.push(Report({
            projectCode:   projectCode,
            activityOrder: activityOrder,
            contentHash:   contentHash,
            submitter:     msg.sender,
            submittedAt:   block.timestamp,
            approvalCount: 0,
            approved:      false
        }));
        reportCount = _reports.length;

        emit ReportSubmitted(reportId, projectCode, activityOrder, msg.sender);
    }

    function approveReport(uint256 reportId) external onlyAdminOrSigner {
        require(reportId < _reports.length, "ProjectManager: invalid reportId");
        Report storage r = _reports[reportId];
        require(!r.approved, "ProjectManager: already approved");
        require(!_reportApprovals[reportId][msg.sender], "ProjectManager: already signed");

        _reportApprovals[reportId][msg.sender] = true;
        r.approvalCount += 1;

        if (r.approvalCount >= requiredApprovals) {
            r.approved = true;
            emit ReportApproved(reportId, r.projectCode, r.activityOrder);
        }
    }

    function getReport(uint256 reportId)
        external view
        returns (
            string memory _projectCode,
            uint8         _activityOrder,
            bytes32       _contentHash,
            address       _submitter,
            uint256       _submittedAt,
            uint8         _approvalCount,
            bool          _approved
        )
    {
        require(reportId < _reports.length, "ProjectManager: invalid reportId");
        Report storage r = _reports[reportId];
        return (r.projectCode, r.activityOrder, r.contentHash, r.submitter, r.submittedAt, r.approvalCount, r.approved);
    }

    function getReportApprovals(uint256 reportId)
        external view
        returns (address[] memory approvers, bool[] memory approved)
    {
        require(reportId < _reports.length, "ProjectManager: invalid reportId");
        approvers = new address[](signers.length);
        approved  = new bool[](signers.length);
        for (uint256 i = 0; i < signers.length; i++) {
            approvers[i] = signers[i];
            approved[i]  = _reportApprovals[reportId][signers[i]];
        }
    }

    // ---------------------------------------------------------------
    //  KPI submission & auto-verification
    // ---------------------------------------------------------------

    function submitKPI(
        string calldata projectCode,
        string calldata indicatorId,
        uint256         target,
        uint256         actual
    ) external returns (uint256 kpiId) {
        bytes32 projKey = keccak256(bytes(projectCode));
        Project storage p = _projects[projKey];
        require(bytes(p.projectCode).length > 0, "ProjectManager: project not found");
        require(
            msg.sender == p.responsible || msg.sender == admin,
            "ProjectManager: not responsible or admin"
        );
        require(target > 0, "ProjectManager: target must be > 0");

        kpiId = _kpiResults.length;
        bool verified = (actual >= target);

        _kpiResults.push(KPIResult({
            projectCode: projectCode,
            indicatorId: indicatorId,
            target:      target,
            actual:      actual,
            verified:    verified
        }));
        _projectKpiIds[projKey].push(kpiId);
        kpiCount = _kpiResults.length;

        emit KPISubmitted(kpiId, projectCode, indicatorId);

        if (verified) {
            emit KPIVerified(kpiId, projectCode, indicatorId);
        }
    }

    /**
     * @notice Re-check verification for a KPI (e.g. after actual was updated
     *         off-chain and re-submitted). Anyone can call this.
     */
    function autoVerifyKPI(uint256 kpiId) external {
        require(kpiId < _kpiResults.length, "ProjectManager: invalid kpiId");
        KPIResult storage k = _kpiResults[kpiId];
        if (!k.verified && k.actual >= k.target) {
            k.verified = true;
            emit KPIVerified(kpiId, k.projectCode, k.indicatorId);
        }
    }

    function getKPI(uint256 kpiId)
        external view
        returns (
            string memory _projectCode,
            string memory _indicatorId,
            uint256       _target,
            uint256       _actual,
            bool          _verified
        )
    {
        require(kpiId < _kpiResults.length, "ProjectManager: invalid kpiId");
        KPIResult storage k = _kpiResults[kpiId];
        return (k.projectCode, k.indicatorId, k.target, k.actual, k.verified);
    }

    function getKPIResults(string calldata projectCode)
        external view
        returns (uint256[] memory kpiIds)
    {
        bytes32 projKey = keccak256(bytes(projectCode));
        return _projectKpiIds[projKey];
    }

    // ---------------------------------------------------------------
    //  Helpers used by RewardPool
    // ---------------------------------------------------------------

    function isReportApproved(uint256 reportId) external view returns (bool) {
        require(reportId < _reports.length, "ProjectManager: invalid reportId");
        return _reports[reportId].approved;
    }

    function getReportSubmitter(uint256 reportId) external view returns (address) {
        require(reportId < _reports.length, "ProjectManager: invalid reportId");
        return _reports[reportId].submitter;
    }

    function isKPIVerified(uint256 kpiId) external view returns (bool) {
        require(kpiId < _kpiResults.length, "ProjectManager: invalid kpiId");
        return _kpiResults[kpiId].verified;
    }

    function getKPIProjectResponsible(uint256 kpiId) external view returns (address) {
        require(kpiId < _kpiResults.length, "ProjectManager: invalid kpiId");
        bytes32 projKey = keccak256(bytes(_kpiResults[kpiId].projectCode));
        return _projects[projKey].responsible;
    }

    function getKPIPercentage(uint256 kpiId) external view returns (uint256) {
        require(kpiId < _kpiResults.length, "ProjectManager: invalid kpiId");
        KPIResult storage k = _kpiResults[kpiId];
        if (k.target == 0) return 0;
        return (k.actual * 100) / k.target;
    }

    function getActivityStatus(string calldata projectCode, uint8 activityOrder)
        external view returns (ActivityStatus)
    {
        bytes32 actKey = keccak256(abi.encodePacked(projectCode, activityOrder));
        require(bytes(_activities[actKey].projectCode).length > 0, "ProjectManager: activity not found");
        return _activities[actKey].status;
    }

    function getProjectResponsible(string calldata projectCode) external view returns (address) {
        bytes32 key = keccak256(bytes(projectCode));
        require(bytes(_projects[key].projectCode).length > 0, "ProjectManager: project not found");
        return _projects[key].responsible;
    }
}
