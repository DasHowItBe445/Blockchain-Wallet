// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Escrow
 * @dev Milestone-based escrow contract that releases funds ONLY to multisig wallet
 * @notice Funds flow: Funder → Escrow → Multisig Wallet (no shortcuts)
 */
contract Escrow is ReentrancyGuard {
    // ============ Enums ============
    
    enum MilestoneState {
        PENDING,      // Initial state, waiting for submission
        SUBMITTED,    // NGO submitted proof
        APPROVED,     // Approved by protocol/authority
        DISPUTED      // Disputed, funds locked
    }
    
    // ============ Structs ============
    
    struct Milestone {
        uint256 amount;           // Amount locked for this milestone
        uint256 fundedAmount;     // Amount actually funded so far
        MilestoneState state;     // Current state
        string proofHash;         // IPFS hash or proof identifier
        uint256 submissionTime;   // When proof was submitted
        uint256 approvalTime;     // When approved
        uint256 disputeWindowEnd; // When dispute window ends (if approved)
        bool released;            // Whether funds have been released
    }
    
    struct Project {
        address ngoAddress;       // NGO beneficiary address (for reference only)
        string projectId;         // Unique project identifier
        address multisigWallet;   // Multisig wallet address (ONLY release destination)
        uint256 totalFunded;      // Total amount funded
        uint256 milestoneCount;   // Number of milestones
        bool active;              // Whether project is active
        mapping(uint256 => Milestone) milestones;
    }
    
    // ============ State Variables ============
    
    address public protocolOwner; // Protocol owner/authority (can approve milestones)
    uint256 public constant DISPUTE_WINDOW = 7 days; // 7-day dispute window after approval
    
    uint256 public projectCount;
    mapping(uint256 => Project) public projects;
    mapping(string => uint256) public projectIdToIndex;
    
    // Track funder contributions per project
    mapping(uint256 => mapping(address => uint256)) public contributions;
    
    // ============ Events ============
    
    event ProjectCreated(
        uint256 indexed projectIndex,
        string indexed projectId,
        address indexed ngoAddress,
        address multisigWallet,
        uint256 milestoneCount
    );
    
    event FundsDeposited(
        uint256 indexed projectIndex,
        address indexed funder,
        uint256 amount,
        uint256 totalFunded
    );
    
    event MilestoneSubmitted(
        uint256 indexed projectIndex,
        uint256 indexed milestoneIndex,
        string proofHash,
        uint256 submissionTime
    );
    
    event MilestoneApproved(
        uint256 indexed projectIndex,
        uint256 indexed milestoneIndex,
        uint256 approvalTime,
        uint256 disputeWindowEnd
    );
    
    event MilestoneDisputed(
        uint256 indexed projectIndex,
        uint256 indexed milestoneIndex,
        uint256 disputeTime
    );
    
    event FundsReleased(
        uint256 indexed projectIndex,
        uint256 indexed milestoneIndex,
        address indexed multisigWallet,
        uint256 amount
    );
    
    // ============ Modifiers ============
    
    modifier onlyProtocolOwner() {
        require(msg.sender == protocolOwner, "Escrow: caller is not protocol owner");
        _;
    }
    
    modifier projectExists(uint256 _projectIndex) {
        require(_projectIndex > 0 && _projectIndex <= projectCount, "Escrow: project does not exist");
        _;
    }
    
    modifier milestoneExists(uint256 _projectIndex, uint256 _milestoneIndex) {
        require(_projectIndex > 0 && _projectIndex <= projectCount, "Escrow: project does not exist");
        Project storage project = projects[_projectIndex];
        require(_milestoneIndex < project.milestoneCount, "Escrow: milestone does not exist");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(address _protocolOwner) {
        require(_protocolOwner != address(0), "Escrow: invalid protocol owner");
        protocolOwner = _protocolOwner;
    }
    
    /**
     * @dev Allow contract to receive ETH
     */
    receive() external payable {
        // ETH can be sent directly to contract for deposits
        // Should use depositFunds() for proper tracking
    }
    
    // ============ Project Management ============
    
    /**
     * @dev Create a new project with milestones
     * @param _projectId Unique project identifier
     * @param _ngoAddress NGO beneficiary address (reference only, cannot withdraw)
     * @param _multisigWallet Multisig wallet address (ONLY release destination)
     * @param _milestoneAmounts Array of amounts per milestone
     */
    function createProject(
        string memory _projectId,
        address _ngoAddress,
        address _multisigWallet,
        uint256[] memory _milestoneAmounts
    ) external returns (uint256 projectIndex) {
        require(bytes(_projectId).length > 0, "Escrow: project ID required");
        require(_ngoAddress != address(0), "Escrow: invalid NGO address");
        require(_multisigWallet != address(0), "Escrow: invalid multisig wallet");
        require(_milestoneAmounts.length > 0, "Escrow: at least one milestone required");
        require(projectIdToIndex[_projectId] == 0, "Escrow: project ID already exists");
        
        // Verify multisig wallet is a contract (basic check)
        uint256 codeSize;
        assembly {
            codeSize := extcodesize(_multisigWallet)
        }
        require(codeSize > 0, "Escrow: multisig wallet must be a contract");
        
        projectCount++;
        projectIndex = projectCount;
        
        Project storage newProject = projects[projectIndex];
        newProject.ngoAddress = _ngoAddress;
        newProject.projectId = _projectId;
        newProject.multisigWallet = _multisigWallet;
        newProject.totalFunded = 0;
        newProject.milestoneCount = _milestoneAmounts.length;
        newProject.active = true;
        
        // Initialize milestones
        for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
            require(_milestoneAmounts[i] > 0, "Escrow: milestone amount must be greater than 0");
            newProject.milestones[i] = Milestone({
                amount: _milestoneAmounts[i],
                fundedAmount: 0,
                state: MilestoneState.PENDING,
                proofHash: "",
                submissionTime: 0,
                approvalTime: 0,
                disputeWindowEnd: 0,
                released: false
            });
        }
        
        projectIdToIndex[_projectId] = projectIndex;
        
        emit ProjectCreated(projectIndex, _projectId, _ngoAddress, _multisigWallet, _milestoneAmounts.length);
        
        return projectIndex;
    }
    
    // ============ Funding ============
    
    /**
     * @dev Deposit funds into escrow for a project
     * @param _projectIndex Project index
     */
    function depositFunds(uint256 _projectIndex) external payable projectExists(_projectIndex) {
        require(msg.value > 0, "Escrow: must send ETH");
        
        Project storage project = projects[_projectIndex];
        require(project.active, "Escrow: project not active");
        
        // Distribute funds across milestones in order
        uint256 remaining = msg.value;
        
        for (uint256 i = 0; i < project.milestoneCount && remaining > 0; i++) {
            Milestone storage milestone = project.milestones[i];
            
            if (milestone.fundedAmount < milestone.amount) {
                uint256 needed = milestone.amount - milestone.fundedAmount;
                uint256 toFund = remaining > needed ? needed : remaining;
                milestone.fundedAmount += toFund;
                remaining -= toFund;
            }
        }
        
        project.totalFunded += msg.value;
        contributions[_projectIndex][msg.sender] += msg.value;
        
        emit FundsDeposited(_projectIndex, msg.sender, msg.value, project.totalFunded);
    }
    
    // ============ Milestone Management ============
    
    /**
     * @dev Submit proof for a milestone (can be called by anyone, typically NGO)
     * @param _projectIndex Project index
     * @param _milestoneIndex Milestone index
     * @param _proofHash Proof hash (IPFS hash or identifier)
     */
    function submitMilestone(
        uint256 _projectIndex,
        uint256 _milestoneIndex,
        string memory _proofHash
    ) external milestoneExists(_projectIndex, _milestoneIndex) {
        require(bytes(_proofHash).length > 0, "Escrow: proof hash required");
        
        Project storage project = projects[_projectIndex];
        Milestone storage milestone = project.milestones[_milestoneIndex];
        
        require(milestone.state == MilestoneState.PENDING, "Escrow: milestone not in PENDING state");
        require(milestone.fundedAmount >= milestone.amount, "Escrow: milestone not fully funded");
        
        milestone.state = MilestoneState.SUBMITTED;
        milestone.proofHash = _proofHash;
        milestone.submissionTime = block.timestamp;
        
        emit MilestoneSubmitted(_projectIndex, _milestoneIndex, _proofHash, block.timestamp);
    }
    
    /**
     * @dev Approve a milestone (only protocol owner)
     * @param _projectIndex Project index
     * @param _milestoneIndex Milestone index
     */
    function approveMilestone(
        uint256 _projectIndex,
        uint256 _milestoneIndex
    ) external onlyProtocolOwner milestoneExists(_projectIndex, _milestoneIndex) {
        Project storage project = projects[_projectIndex];
        Milestone storage milestone = project.milestones[_milestoneIndex];
        
        require(milestone.state == MilestoneState.SUBMITTED, "Escrow: milestone must be SUBMITTED");
        require(milestone.fundedAmount >= milestone.amount, "Escrow: milestone not fully funded");
        require(!milestone.released, "Escrow: milestone already released");
        
        milestone.state = MilestoneState.APPROVED;
        milestone.approvalTime = block.timestamp;
        milestone.disputeWindowEnd = block.timestamp + DISPUTE_WINDOW;
        
        emit MilestoneApproved(_projectIndex, _milestoneIndex, block.timestamp, milestone.disputeWindowEnd);
    }
    
    /**
     * @dev Dispute a milestone (only protocol owner, can dispute even after approval)
     * @param _projectIndex Project index
     * @param _milestoneIndex Milestone index
     */
    function disputeMilestone(
        uint256 _projectIndex,
        uint256 _milestoneIndex
    ) external onlyProtocolOwner milestoneExists(_projectIndex, _milestoneIndex) {
        Project storage project = projects[_projectIndex];
        Milestone storage milestone = project.milestones[_milestoneIndex];
        
        require(
            milestone.state == MilestoneState.SUBMITTED || milestone.state == MilestoneState.APPROVED,
            "Escrow: milestone must be SUBMITTED or APPROVED"
        );
        require(!milestone.released, "Escrow: milestone already released");
        
        milestone.state = MilestoneState.DISPUTED;
        
        emit MilestoneDisputed(_projectIndex, _milestoneIndex, block.timestamp);
    }
    
    // ============ Fund Release ============
    
    /**
     * @dev Release funds for an approved milestone to the multisig wallet
     * @param _projectIndex Project index
     * @param _milestoneIndex Milestone index
     * @notice Funds are sent ONLY to the multisig wallet, never to EOA
     */
    function releaseFunds(
        uint256 _projectIndex,
        uint256 _milestoneIndex
    ) external nonReentrant milestoneExists(_projectIndex, _milestoneIndex) {
        Project storage project = projects[_projectIndex];
        Milestone storage milestone = project.milestones[_milestoneIndex];
        
        require(milestone.state == MilestoneState.APPROVED, "Escrow: milestone must be APPROVED");
        require(block.timestamp >= milestone.disputeWindowEnd, "Escrow: dispute window not elapsed");
        require(!milestone.released, "Escrow: funds already released");
        require(milestone.fundedAmount > 0, "Escrow: no funds to release");
        
        // Mark as released BEFORE external call (reentrancy protection)
        milestone.released = true;
        
        uint256 amount = milestone.fundedAmount;
        address multisigWallet = project.multisigWallet;
        
        // Send funds ONLY to multisig wallet
        (bool success, ) = multisigWallet.call{value: amount}("");
        require(success, "Escrow: transfer to multisig wallet failed");
        
        emit FundsReleased(_projectIndex, _milestoneIndex, multisigWallet, amount);
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get project information
     */
    function getProject(uint256 _projectIndex)
        external
        view
        projectExists(_projectIndex)
        returns (
            address ngoAddress,
            string memory projectId,
            address multisigWallet,
            uint256 totalFunded,
            uint256 milestoneCount,
            bool active
        )
    {
        Project storage project = projects[_projectIndex];
        return (
            project.ngoAddress,
            project.projectId,
            project.multisigWallet,
            project.totalFunded,
            project.milestoneCount,
            project.active
        );
    }
    
    /**
     * @dev Get milestone information
     */
    function getMilestone(uint256 _projectIndex, uint256 _milestoneIndex)
        external
        view
        milestoneExists(_projectIndex, _milestoneIndex)
        returns (Milestone memory)
    {
        return projects[_projectIndex].milestones[_milestoneIndex];
    }
    
    /**
     * @dev Get project index by project ID
     */
    function getProjectByProjectId(string memory _projectId)
        external
        view
        returns (uint256)
    {
        return projectIdToIndex[_projectId];
    }
    
    /**
     * @dev Get contract ETH balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Get funder's contribution to a project
     */
    function getContribution(uint256 _projectIndex, address _funder)
        external
        view
        projectExists(_projectIndex)
        returns (uint256)
    {
        return contributions[_projectIndex][_funder];
    }
    
    // ============ Admin Functions ============
    
    /**
     * @dev Deactivate a project (only protocol owner)
     */
    function deactivateProject(uint256 _projectIndex)
        external
        onlyProtocolOwner
        projectExists(_projectIndex)
    {
        projects[_projectIndex].active = false;
    }
    
    /**
     * @dev Update protocol owner (only current owner)
     */
    function updateProtocolOwner(address _newOwner) external onlyProtocolOwner {
        require(_newOwner != address(0), "Escrow: invalid new owner");
        protocolOwner = _newOwner;
    }
}

