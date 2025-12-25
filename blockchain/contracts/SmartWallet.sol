// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SmartWallet
 * @dev Protocol-grade multisignature wallet with M-of-N approval scheme
 * @notice Owners defined at deployment, ETH custody, transaction lifecycle: propose → approve → execute
 */
contract SmartWallet {
    // ============ Structs ============
    
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 approvalCount;
    }
    
    // ============ State Variables ============
    
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public requiredApprovals;
    uint256 public transactionCount;
    
    mapping(uint256 => Transaction) public transactions;
    mapping(uint256 => mapping(address => bool)) public approvals;
    
    // ============ Events ============
    
    event Deposit(address indexed sender, uint256 value, uint256 balance);
    event TransactionProposed(
        uint256 indexed txId,
        address indexed proposer,
        address indexed to,
        uint256 value,
        bytes data
    );
    event TransactionApproved(
        uint256 indexed txId,
        address indexed approver,
        uint256 approvalCount,
        uint256 requiredApprovals
    );
    event TransactionExecuted(
        uint256 indexed txId,
        address indexed executor,
        address indexed to,
        uint256 value
    );
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        require(isOwner[msg.sender], "SmartWallet: caller is not an owner");
        _;
    }
    
    modifier txExists(uint256 _txId) {
        require(_txId < transactionCount, "SmartWallet: transaction does not exist");
        _;
    }
    
    modifier notExecuted(uint256 _txId) {
        require(!transactions[_txId].executed, "SmartWallet: transaction already executed");
        _;
    }
    
    modifier notApproved(uint256 _txId) {
        require(!approvals[_txId][msg.sender], "SmartWallet: transaction already approved by this owner");
        _;
    }
    
    // ============ Constructor ============
    
    /**
     * @dev Initializes the multisignature wallet
     * @param _owners Array of owner addresses
     * @param _requiredApprovals Number of approvals required to execute (M-of-N)
     * @notice M must be > 0, M <= N, and all owners must be unique non-zero addresses
     */
    constructor(address[] memory _owners, uint256 _requiredApprovals) {
        require(_owners.length > 0, "SmartWallet: must have at least one owner");
        require(_requiredApprovals > 0, "SmartWallet: required approvals must be greater than 0");
        require(
            _requiredApprovals <= _owners.length,
            "SmartWallet: required approvals cannot exceed number of owners"
        );
        
        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "SmartWallet: invalid owner address");
            require(!isOwner[owner], "SmartWallet: duplicate owner address");
            
            isOwner[owner] = true;
            owners.push(owner);
        }
        
        requiredApprovals = _requiredApprovals;
    }
    
    // ============ Receive Function ============
    
    /**
     * @dev Allows the contract to receive ETH
     */
    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }
    
    /**
     * @dev Fallback function for receiving ETH
     */
    fallback() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }
    
    // ============ Transaction Functions ============
    
    /**
     * @dev Proposes a new transaction
     * @param _to Recipient address
     * @param _value Amount of ETH to send (in wei)
     * @param _data Calldata for the transaction (can be empty)
     * @return txId The ID of the proposed transaction
     */
    function proposeTransaction(
        address _to,
        uint256 _value,
        bytes memory _data
    ) external onlyOwner returns (uint256 txId) {
        require(_to != address(0), "SmartWallet: invalid recipient address");
        require(
            _value <= address(this).balance,
            "SmartWallet: insufficient contract balance"
        );
        
        txId = transactionCount;
        transactions[txId] = Transaction({
            to: _to,
            value: _value,
            data: _data,
            executed: false,
            approvalCount: 0
        });
        
        transactionCount++;
        
        emit TransactionProposed(txId, msg.sender, _to, _value, _data);
        
        return txId;
    }
    
    /**
     * @dev Approves a transaction
     * @param _txId The ID of the transaction to approve
     */
    function approveTransaction(uint256 _txId)
        external
        onlyOwner
        txExists(_txId)
        notExecuted(_txId)
        notApproved(_txId)
    {
        approvals[_txId][msg.sender] = true;
        transactions[_txId].approvalCount++;
        
        emit TransactionApproved(
            _txId,
            msg.sender,
            transactions[_txId].approvalCount,
            requiredApprovals
        );
    }
    
    /**
     * @dev Executes a transaction if quorum is met
     * @param _txId The ID of the transaction to execute
     * @notice Reentrancy-safe: marks transaction as executed before external call
     */
    function executeTransaction(uint256 _txId)
        external
        onlyOwner
        txExists(_txId)
        notExecuted(_txId)
    {
        Transaction storage transaction = transactions[_txId];
        
        require(
            transaction.approvalCount >= requiredApprovals,
            "SmartWallet: quorum not met"
        );
        require(
            address(this).balance >= transaction.value,
            "SmartWallet: insufficient contract balance"
        );
        
        // Mark as executed BEFORE external call (reentrancy protection)
        // If the call fails, the entire transaction reverts, keeping executed = false
        transaction.executed = true;
        
        // Execute the transaction
        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );
        require(success, "SmartWallet: transaction execution failed");
        
        emit TransactionExecuted(_txId, msg.sender, transaction.to, transaction.value);
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Returns the number of owners
     * @return Number of owners
     */
    function getOwnerCount() external view returns (uint256) {
        return owners.length;
    }
    
    /**
     * @dev Returns all owner addresses
     * @return Array of owner addresses
     */
    function getOwners() external view returns (address[] memory) {
        return owners;
    }
    
    /**
     * @dev Returns transaction details
     * @param _txId The ID of the transaction
     * @return Transaction struct with all details
     */
    function getTransaction(uint256 _txId)
        external
        view
        returns (Transaction memory)
    {
        require(_txId < transactionCount, "SmartWallet: transaction does not exist");
        return transactions[_txId];
    }
    
    /**
     * @dev Checks if a transaction has been approved by a specific owner
     * @param _txId The ID of the transaction
     * @param _owner The owner address to check
     * @return True if approved by the owner, false otherwise
     */
    function isApprovedBy(uint256 _txId, address _owner)
        external
        view
        returns (bool)
    {
        return approvals[_txId][_owner];
    }
    
    /**
     * @dev Returns the contract's ETH balance
     * @return Balance in wei
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

