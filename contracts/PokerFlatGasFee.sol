// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PokerFlatGasFee
 * @dev Texas Hold'em Poker with dynamic gas fee model
 * Gas fee = (estimated gas cost) + markup to cover fluctuations
 */
contract PokerFlatGasFee {

    // DYNAMIC GAS FEE MODEL
    // Estimated gas units needed for distributeWinnings + other ops
    uint256 public estimatedGasUnits = 60000; // ~60k gas for typical hand completion

    // Markup in wei to add on top of gas costs (can be set to ~$0.20 worth of ETH)
    // Example: 0.0001 ETH = ~$0.20 at $2000/ETH
    uint256 public gasMarkup = 0.0001 ether;

    // Minimum fee to prevent going too low
    uint256 public minimumGasFee = 0.00005 ether; // Minimum $0.10 worth

    struct Table {
        uint256 tableId;
        uint256 smallBlind;
        uint256 bigBlind;
        uint256 minBuyIn;
        address[9] players;
        mapping(address => uint256) chips;
        mapping(address => bool) isSeated;
        uint256 pot;
        uint8 dealerIndex;
        uint8 numPlayers;
        bool isActive;
        uint256 handNumber;
    }

    mapping(uint256 => Table) public tables;
    uint256 public tableCounter;
    address public owner;
    address public gameServer;

    // Events
    event TableCreated(uint256 indexed tableId, uint256 smallBlind, uint256 bigBlind, uint256 minBuyIn);
    event PlayerJoined(uint256 indexed tableId, address indexed player, uint256 buyIn, uint8 seatIndex);
    event PlayerLeft(uint256 indexed tableId, address indexed player, uint256 cashOut);
    event HandStarted(uint256 indexed tableId, uint256 handNumber, uint256 pot);
    event BlindsPosted(uint256 indexed tableId, address smallBlind, address bigBlind, uint256 gasFee);
    event WinnerPaid(uint256 indexed tableId, address indexed winner, uint256 amount);
    event GasFeeCollected(uint256 indexed tableId, uint256 amount);
    event GameServerUpdated(address indexed oldServer, address indexed newServer);
    event GasMarkupUpdated(uint256 oldMarkup, uint256 newMarkup);
    event EstimatedGasUnitsUpdated(uint256 oldUnits, uint256 newUnits);

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Calculate current gas fee based on tx.gasprice + markup
     * Fee = (estimated gas units * current gas price) + markup
     * This ensures we cover actual gas costs plus a buffer
     */
    function getCurrentGasFee() public view returns (uint256) {
        // Calculate expected gas cost based on current gas price
        uint256 estimatedGasCost = estimatedGasUnits * tx.gasprice;

        // Add markup for safety buffer
        uint256 totalFee = estimatedGasCost + gasMarkup;

        // Ensure we don't go below minimum
        if (totalFee < minimumGasFee) {
            return minimumGasFee;
        }

        return totalFee;
    }

    /**
     * @dev Update the gas markup (only owner)
     * @param newMarkup New markup amount in wei
     */
    function setGasMarkup(uint256 newMarkup) external onlyOwner {
        uint256 oldMarkup = gasMarkup;
        gasMarkup = newMarkup;
        emit GasMarkupUpdated(oldMarkup, newMarkup);
    }

    /**
     * @dev Update estimated gas units (only owner)
     * @param newUnits New gas units estimate
     */
    function setEstimatedGasUnits(uint256 newUnits) external onlyOwner {
        require(newUnits > 0, "Gas units must be positive");
        uint256 oldUnits = estimatedGasUnits;
        estimatedGasUnits = newUnits;
        emit EstimatedGasUnitsUpdated(oldUnits, newUnits);
    }

    /**
     * @dev Update minimum gas fee (only owner)
     * @param newMinimum New minimum fee in wei
     */
    function setMinimumGasFee(uint256 newMinimum) external onlyOwner {
        minimumGasFee = newMinimum;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyGameServer() {
        require(msg.sender == gameServer, "Not game server");
        _;
    }

    /**
     * @dev Create a new poker table
     * @param smallBlind Small blind amount
     * @param bigBlind Big blind amount
     */
    function createTable(
        uint256 smallBlind,
        uint256 bigBlind
    ) external returns (uint256) {
        uint256 totalBlinds = smallBlind + bigBlind;

        // Require minimum blinds to cover gas fee (use current estimate)
        uint256 currentGasFee = getCurrentGasFee();
        require(totalBlinds > currentGasFee, "Blinds too low to cover gas");

        uint256 tableId = tableCounter++;
        Table storage table = tables[tableId];

        table.tableId = tableId;
        table.smallBlind = smallBlind;
        table.bigBlind = bigBlind;
        table.minBuyIn = bigBlind * 50; // 50 BB minimum
        table.isActive = true;
        table.handNumber = 0;

        emit TableCreated(tableId, smallBlind, bigBlind, table.minBuyIn);

        return tableId;
    }

    /**
     * @dev Join a table with buy-in
     * @param tableId Table to join
     */
    function joinTable(uint256 tableId) external payable {
        Table storage table = tables[tableId];

        require(table.isActive, "Table not active");
        require(msg.value >= table.minBuyIn, "Buy-in too low");
        require(table.numPlayers < 9, "Table full");
        require(!table.isSeated[msg.sender], "Already seated");

        // Find empty seat
        uint8 seatIndex;
        for (uint8 i = 0; i < 9; i++) {
            if (table.players[i] == address(0)) {
                seatIndex = i;
                break;
            }
        }

        table.players[seatIndex] = msg.sender;
        table.chips[msg.sender] = msg.value;
        table.isSeated[msg.sender] = true;
        table.numPlayers++;

        emit PlayerJoined(tableId, msg.sender, msg.value, seatIndex);
    }

    /**
     * @dev Leave table and cash out
     * @param tableId Table to leave
     */
    function leaveTable(uint256 tableId) external {
        Table storage table = tables[tableId];

        require(table.isSeated[msg.sender], "Not seated");

        uint256 chipCount = table.chips[msg.sender];
        require(chipCount > 0, "No chips to cash out");

        // Remove player from seat
        for (uint8 i = 0; i < 9; i++) {
            if (table.players[i] == msg.sender) {
                table.players[i] = address(0);
                break;
            }
        }

        table.chips[msg.sender] = 0;
        table.isSeated[msg.sender] = false;
        table.numPlayers--;

        // Transfer chips back to player
        payable(msg.sender).transfer(chipCount);

        emit PlayerLeft(tableId, msg.sender, chipCount);
    }

    /**
     * @dev Start a new hand - post blinds and extract gas fee
     * @param tableId Table ID
     */
    function startNewHand(uint256 tableId) external onlyGameServer {
        Table storage table = tables[tableId];

        require(table.isActive, "Table not active");
        require(table.numPlayers >= 2, "Need at least 2 players");
        require(table.pot == 0, "Hand already in progress");

        // Get blind positions
        uint8 sbPos = findPlayerPosition(tableId, table.dealerIndex + 1);
        uint8 bbPos = findPlayerPosition(tableId, table.dealerIndex + 2);

        address sbPlayer = table.players[sbPos];
        address bbPlayer = table.players[bbPos];

        // Collect blinds
        require(table.chips[sbPlayer] >= table.smallBlind, "SB insufficient");
        require(table.chips[bbPlayer] >= table.bigBlind, "BB insufficient");

        table.chips[sbPlayer] -= table.smallBlind;
        table.chips[bbPlayer] -= table.bigBlind;

        uint256 totalBlinds = table.smallBlind + table.bigBlind;

        // Extract DYNAMIC gas fee (current gas price + markup)
        uint256 gasFee = getCurrentGasFee();

        // Ensure we can cover the gas fee
        require(totalBlinds > gasFee, "Blinds insufficient for gas fee");

        // Remaining goes to pot
        uint256 toPot = totalBlinds - gasFee;
        table.pot = toPot;
        table.handNumber++;

        // Send gas fee to owner
        payable(owner).transfer(gasFee);

        emit HandStarted(tableId, table.handNumber, toPot);
        emit BlindsPosted(tableId, sbPlayer, bbPlayer, gasFee);
        emit GasFeeCollected(tableId, gasFee);
    }

    /**
     * @dev Add to pot (bets/raises during hand)
     * @param tableId Table ID
     * @param player Player making the bet
     * @param amount Amount to add to pot
     */
    function addToPot(uint256 tableId, address player, uint256 amount) external onlyGameServer {
        Table storage table = tables[tableId];

        require(table.isSeated[player], "Not seated");
        require(table.chips[player] >= amount, "Insufficient chips");

        table.chips[player] -= amount;
        table.pot += amount;
    }

    /**
     * @dev Distribute winnings to winner(s)
     * @param tableId Table ID
     * @param winner Winner address
     */
    function distributeWinnings(uint256 tableId, address winner) external onlyGameServer {
        Table storage table = tables[tableId];

        require(table.isSeated[winner], "Winner not seated");
        require(table.pot > 0, "No pot to distribute");

        // Winner gets FULL remaining pot
        uint256 winnings = table.pot;
        table.chips[winner] += winnings;
        table.pot = 0;

        // Move dealer button
        table.dealerIndex = uint8((table.dealerIndex + 1) % 9);

        emit WinnerPaid(tableId, winner, winnings);
    }

    /**
     * @dev Find next active player position
     */
    function findPlayerPosition(uint256 tableId, uint256 offset)
        internal
        view
        returns (uint8)
    {
        Table storage table = tables[tableId];
        uint8 pos = uint8(offset % 9);
        uint8 iterations = 0;

        while (table.players[pos] == address(0) && iterations < 9) {
            pos = uint8((pos + 1) % 9);
            iterations++;
        }

        return pos;
    }

    /**
     * @dev Check if stakes are viable
     */
    function isViableStakes(uint256 smallBlind, uint256 bigBlind)
        public
        view
        returns (bool viable, string memory reason)
    {
        uint256 totalBlinds = smallBlind + bigBlind;
        uint256 currentGasFee = getCurrentGasFee();

        if (totalBlinds <= currentGasFee) {
            return (false, "Blinds too small to cover gas fee");
        }

        uint256 toPot = totalBlinds - currentGasFee;
        uint256 effectiveRake = (currentGasFee * 100) / toPot;

        if (effectiveRake > 10) {
            return (false, "Gas fee too high relative to stakes");
        }

        return (true, "Stakes are viable");
    }

    /**
     * @dev Get table info
     */
    function getTableInfo(uint256 tableId)
        external
        view
        returns (
            uint256 smallBlind,
            uint256 bigBlind,
            uint256 minBuyIn,
            uint8 numPlayers,
            uint256 pot,
            bool isActive,
            uint256 handNumber
        )
    {
        Table storage table = tables[tableId];
        return (
            table.smallBlind,
            table.bigBlind,
            table.minBuyIn,
            table.numPlayers,
            table.pot,
            table.isActive,
            table.handNumber
        );
    }

    /**
     * @dev Get player info at table
     */
    function getPlayerInfo(uint256 tableId, address player)
        external
        view
        returns (uint256 chips, bool isSeated)
    {
        Table storage table = tables[tableId];
        return (table.chips[player], table.isSeated[player]);
    }

    /**
     * @dev Get all players at table
     */
    function getPlayers(uint256 tableId)
        external
        view
        returns (address[9] memory)
    {
        return tables[tableId].players;
    }

    /**
     * @dev Owner can withdraw accumulated fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        payable(owner).transfer(balance);
    }

    /**
     * @dev Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    /**
     * @dev Set the game server address (only owner can call)
     * @param _gameServer Address of the trusted game server
     */
    function setGameServer(address _gameServer) external onlyOwner {
        require(_gameServer != address(0), "Invalid address");
        address oldServer = gameServer;
        gameServer = _gameServer;
        emit GameServerUpdated(oldServer, _gameServer);
    }
}
