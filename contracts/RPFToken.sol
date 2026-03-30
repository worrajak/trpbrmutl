// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

/**
 * @title RPFToken (TRC-20)
 * @notice TRC-20 reward token for the Royal Project Follow-up system.
 *         Deployed on TRON Nile Testnet.
 *
 *         Name     : RPF Reward Token
 *         Symbol   : RPF
 *         Decimals : 6
 */
contract RPFToken {

    // ---------------------------------------------------------------
    //  State
    // ---------------------------------------------------------------

    string  public constant name     = "RPF Reward Token";
    string  public constant symbol   = "RPF";
    uint8   public constant decimals = 6;

    uint256 public totalSupply;
    address public owner;

    mapping(address => uint256)                      private _balances;
    mapping(address => mapping(address => uint256))  private _allowances;

    // ---------------------------------------------------------------
    //  Events (TRC-20 / ERC-20 standard)
    // ---------------------------------------------------------------

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ---------------------------------------------------------------
    //  Modifiers
    // ---------------------------------------------------------------

    modifier onlyOwner() {
        require(msg.sender == owner, "RPFToken: caller is not the owner");
        _;
    }

    // ---------------------------------------------------------------
    //  Constructor
    // ---------------------------------------------------------------

    /**
     * @param initialSupply Total tokens minted to deployer (in smallest unit,
     *                      e.g. 1_000_000 * 1e6 for 1 million RPF).
     */
    constructor(uint256 initialSupply) {
        owner = msg.sender;
        _mint(msg.sender, initialSupply);
    }

    // ---------------------------------------------------------------
    //  TRC-20 Views
    // ---------------------------------------------------------------

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function allowance(address _owner, address spender) public view returns (uint256) {
        return _allowances[_owner][spender];
    }

    // ---------------------------------------------------------------
    //  TRC-20 Mutative
    // ---------------------------------------------------------------

    function transfer(address to, uint256 amount) public returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        uint256 currentAllowance = _allowances[from][msg.sender];
        require(currentAllowance >= amount, "RPFToken: transfer amount exceeds allowance");
        unchecked {
            _approve(from, msg.sender, currentAllowance - amount);
        }
        _transfer(from, to, amount);
        return true;
    }

    // ---------------------------------------------------------------
    //  Owner-only: Mint
    // ---------------------------------------------------------------

    /**
     * @notice Mint new tokens to `to`. Only the contract owner may call this.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // ---------------------------------------------------------------
    //  Public: Burn own tokens
    // ---------------------------------------------------------------

    /**
     * @notice Burn `amount` tokens from caller's balance.
     */
    function burn(uint256 amount) external {
        require(_balances[msg.sender] >= amount, "RPFToken: burn amount exceeds balance");
        unchecked {
            _balances[msg.sender] -= amount;
        }
        totalSupply -= amount;
        emit Transfer(msg.sender, address(0), amount);
    }

    // ---------------------------------------------------------------
    //  Ownership management
    // ---------------------------------------------------------------

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "RPFToken: new owner is the zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ---------------------------------------------------------------
    //  Internal helpers
    // ---------------------------------------------------------------

    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "RPFToken: transfer from the zero address");
        require(to   != address(0), "RPFToken: transfer to the zero address");
        require(_balances[from] >= amount, "RPFToken: transfer amount exceeds balance");
        unchecked {
            _balances[from] -= amount;
        }
        _balances[to] += amount;
        emit Transfer(from, to, amount);
    }

    function _approve(address _owner, address spender, uint256 amount) internal {
        require(_owner  != address(0), "RPFToken: approve from the zero address");
        require(spender != address(0), "RPFToken: approve to the zero address");
        _allowances[_owner][spender] = amount;
        emit Approval(_owner, spender, amount);
    }

    function _mint(address to, uint256 amount) internal {
        require(to != address(0), "RPFToken: mint to the zero address");
        totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }
}
