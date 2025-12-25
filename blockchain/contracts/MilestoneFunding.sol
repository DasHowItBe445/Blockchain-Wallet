// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MilestoneFunding is ReentrancyGuard, Ownable {
    
    struct Milestone {
        uint256 requiredAmount;
        uint256 fundedAmount;
        bool completed;
        bool fundsReleased;
        string proofHash;
    }
    
    struct Project {
        address ngoAddress;
        string projectId;
        uint256 totalRequired;
        uint256 totalFunded;
        uint256 milestoneCount;
        bool active;
        mapping(uint256 => Milestone) milestones;
    }
    
    uint256 public projectCount;
    mapping(uint256 => Project) public projects;
    mapping(string => uint256) public projectIdToIndex;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    
    event ProjectCreated(uint256 indexed projectIndex, string projectId, address ngoAddress, uint256 totalRequired);
    event ProjectFunded(uint256 indexed projectIndex, address indexed funder, uint256 amount);
    event MilestoneCompleted(uint256 indexed projectIndex, uint256 milestoneIndex, string proofHash);
    event FundsReleased(uint256 indexed projectIndex, uint256 milestoneIndex, uint256 amount);
    
    constructor() Ownable(msg.sender) {}
    
    function createProject(
        string memory _projectId,
        address _ngoAddress,
        uint256 _totalRequired,
        uint256[] memory _milestoneAmounts
    ) external returns (uint256) {
        require(_ngoAddress != address(0), "Invalid NGO address");
        require(_milestoneAmounts.length > 0, "At least one milestone required");
        require(projectIdToIndex[_projectId] == 0, "Project already exists");
        
        uint256 sum = 0;
        for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
            sum += _milestoneAmounts[i];
        }
        require(sum == _totalRequired, "Milestone amounts must equal total required");
        
        projectCount++;
        uint256 projectIndex = projectCount;
        
        Project storage newProject = projects[projectIndex];
        newProject.ngoAddress = _ngoAddress;
        newProject.projectId = _projectId;
        newProject.totalRequired = _totalRequired;
        newProject.totalFunded = 0;
        newProject.milestoneCount = _milestoneAmounts.length;
        newProject.active = true;
        
        for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
            newProject.milestones[i] = Milestone({
                requiredAmount: _milestoneAmounts[i],
                fundedAmount: 0,
                completed: false,
                fundsReleased: false,
                proofHash: ""
            });
        }
        
        projectIdToIndex[_projectId] = projectIndex;
        emit ProjectCreated(projectIndex, _projectId, _ngoAddress, _totalRequired);
        
        return projectIndex;
    }
    
    function fundProject(uint256 _projectIndex) external payable nonReentrant {
        require(_projectIndex > 0 && _projectIndex <= projectCount, "Invalid project");
        Project storage project = projects[_projectIndex];
        require(project.active, "Project not active");
        require(msg.value > 0, "Must send ETH");
        require(project.totalFunded + msg.value <= project.totalRequired, "Exceeds required amount");
        
        project.totalFunded += msg.value;
        contributions[_projectIndex][msg.sender] += msg.value;
        
        uint256 remaining = msg.value;
        for (uint256 i = 0; i < project.milestoneCount && remaining > 0; i++) {
            Milestone storage milestone = project.milestones[i];
            if (!milestone.completed) {
                uint256 needed = milestone.requiredAmount - milestone.fundedAmount;
                uint256 toFund = remaining > needed ? needed : remaining;
                milestone.fundedAmount += toFund;
                remaining -= toFund;
            }
        }
        
        emit ProjectFunded(_projectIndex, msg.sender, msg.value);
    }
    
    function completeMilestone(
        uint256 _projectIndex,
        uint256 _milestoneIndex,
        string memory _proofHash
    ) external {
        require(_projectIndex > 0 && _projectIndex <= projectCount, "Invalid project");
        Project storage project = projects[_projectIndex];
        require(msg.sender == project.ngoAddress || msg.sender == owner(), "Not authorized");
        require(_milestoneIndex < project.milestoneCount, "Invalid milestone");
        
        Milestone storage milestone = project.milestones[_milestoneIndex];
        require(!milestone.completed, "Milestone already completed");
        require(milestone.fundedAmount >= milestone.requiredAmount, "Milestone not fully funded");
        require(bytes(_proofHash).length > 0, "Proof hash required");
        
        milestone.completed = true;
        milestone.proofHash = _proofHash;
        
        emit MilestoneCompleted(_projectIndex, _milestoneIndex, _proofHash);
    }
    
    function releaseFunds(uint256 _projectIndex, uint256 _milestoneIndex) external nonReentrant {
        require(_projectIndex > 0 && _projectIndex <= projectCount, "Invalid project");
        Project storage project = projects[_projectIndex];
        require(_milestoneIndex < project.milestoneCount, "Invalid milestone");
        
        Milestone storage milestone = project.milestones[_milestoneIndex];
        require(milestone.completed, "Milestone not completed");
        require(!milestone.fundsReleased, "Funds already released");
        require(milestone.fundedAmount > 0, "No funds to release");
        
        milestone.fundsReleased = true;
        uint256 amount = milestone.fundedAmount;
        
        (bool success, ) = payable(project.ngoAddress).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit FundsReleased(_projectIndex, _milestoneIndex, amount);
    }
    
    function getProject(uint256 _projectIndex) external view returns (
        address ngoAddress,
        string memory projectId,
        uint256 totalRequired,
        uint256 totalFunded,
        uint256 milestoneCount,
        bool active
    ) {
        require(_projectIndex > 0 && _projectIndex <= projectCount, "Invalid project");
        Project storage project = projects[_projectIndex];
        return (
            project.ngoAddress,
            project.projectId,
            project.totalRequired,
            project.totalFunded,
            project.milestoneCount,
            project.active
        );
    }
    
    function getMilestone(uint256 _projectIndex, uint256 _milestoneIndex) external view returns (
        uint256 requiredAmount,
        uint256 fundedAmount,
        bool completed,
        bool fundsReleased,
        string memory proofHash
    ) {
        require(_projectIndex > 0 && _projectIndex <= projectCount, "Invalid project");
        Project storage project = projects[_projectIndex];
        require(_milestoneIndex < project.milestoneCount, "Invalid milestone");
        
        Milestone storage milestone = project.milestones[_milestoneIndex];
        return (
            milestone.requiredAmount,
            milestone.fundedAmount,
            milestone.completed,
            milestone.fundsReleased,
            milestone.proofHash
        );
    }
    
    function getProjectByMongoId(string memory _projectId) external view returns (uint256) {
        return projectIdToIndex[_projectId];
    }
    
    function deactivateProject(uint256 _projectIndex) external onlyOwner {
        require(_projectIndex > 0 && _projectIndex <= projectCount, "Invalid project");
        projects[_projectIndex].active = false;
    }
    
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}