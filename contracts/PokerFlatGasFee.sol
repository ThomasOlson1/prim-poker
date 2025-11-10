// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title PokerFlatGasFee
 * @dev Texas Hold'em Poker with dynamic gas fee model + Chainlink VRF for verifiable randomness
 * Total fee = (gas cost) + (Chainlink VRF cost) + markup ($0.20)
 */
contract PokerFlatGasFee is VRFConsumerBaseV2Plus {

    // DYNAMIC GAS FEE MODEL
    // Estimated gas units needed for distributeWinnings + other ops
    uint256 public estimatedGasUnits = 60000; // ~60k gas for typical hand completion

    // Chainlink VRF cost calculation parameters
    // Verification gas: gas used by Chainlink to verify the VRF proof on-chain
    uint256 public vrfVerificationGas = 200000; // ~200k gas for VRF verification

    // Premium percentage charged by Chainlink (typically 20-25%)
    uint256 public vrfPremiumPercentage = 20; // 20% premium

    // LINK/ETH price feed address (Chainlink oracle)
    AggregatorV3Interface public linkEthPriceFeed;

    // Markup in wei to add on top of gas + VRF costs (can be set to ~$0.20 worth of ETH)
    // Example: 0.0001 ETH = ~$0.20 at $2000/ETH
    uint256 public gasMarkup = 0.0001 ether;

    // Minimum fee to prevent going too low
    uint256 public minimumGasFee = 0.00005 ether; // Minimum $0.10 worth

    // Card commitment structure for commit-reveal
    struct CardCommitment {
        bytes32 cardHash;      // keccak256(card1 + card2 + salt)
        bool committed;
        bool revealed;
        string card1;          // Revealed cards (e.g., "Ah", "Kd")
        string card2;
        string salt;
    }

    struct Table {
        uint256 tableId;
        uint256 smallBlind;
        uint256 bigBlind;
        uint256 minBuyIn;
        address[9] players;
        mapping(address => uint256) chips;
        mapping(address => bool) isSeated;
        mapping(address => CardCommitment) cardCommitments; // Commitments for current hand
        uint256 pot;
        uint8 dealerIndex;
        uint8 numPlayers;
        bool isActive;
        uint256 handNumber;
        uint256 randomSeed;        // VRF random seed for this hand (0 if not received yet)
        uint256 vrfRequestId;      // Chainlink VRF request ID for pending requests
    }

    mapping(uint256 => Table) public tables;
    uint256 public tableCounter;
    address public gameServer;

    // Chainlink VRF Configuration
    uint256 public vrfSubscriptionId;
    bytes32 public vrfKeyHash;
    uint32 public vrfCallbackGasLimit = 100000;
    uint16 public vrfRequestConfirmations = 3;
    uint32 public vrfNumWords = 1; // We only need 1 random number per hand

    // Map VRF request ID to table ID
    mapping(uint256 => uint256) public vrfRequestToTable;

    // Emergency shutdown state
    bool public emergencyShutdown;

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
    event CardCommitted(uint256 indexed tableId, address indexed player, bytes32 cardHash);
    event CardRevealed(uint256 indexed tableId, address indexed player, string card1, string card2);
    event RandomSeedRequested(uint256 indexed tableId, uint256 indexed requestId);
    event RandomSeedFulfilled(uint256 indexed tableId, uint256 randomSeed);
    event EmergencyShutdown(address indexed triggeredBy, uint256 totalRefunded);
    event PlayerRefunded(uint256 indexed tableId, address indexed player, uint256 amount);

    constructor(address vrfCoordinator) VRFConsumerBaseV2Plus(vrfCoordinator) {
        // Owner is set by VRFConsumerBaseV2Plus parent contract
    }

    /**
     * @dev Calculate Chainlink VRF cost using proper formula
     * Formula: Total Gas Cost (in ETH) * ((100 + Premium%) / 100) / (LINK/ETH Price)
     * Where Total Gas = Verification Gas + Callback Gas
     * Returns cost in ETH equivalent
     */
    function calculateVrfCost() public view returns (uint256) {
        // If price feed not configured, return 0
        if (address(linkEthPriceFeed) == address(0)) {
            return 0;
        }

        // Total gas = verification gas + callback gas limit
        uint256 totalGas = vrfVerificationGas + vrfCallbackGasLimit;

        // Total gas cost in wei (ETH)
        uint256 totalGasCostWei = totalGas * tx.gasprice;

        // Apply premium percentage: cost * (100 + premium) / 100
        uint256 costWithPremium = (totalGasCostWei * (100 + vrfPremiumPercentage)) / 100;

        // Get LINK/ETH price from Chainlink oracle
        // Price feed returns LINK/ETH with 18 decimals
        (, int256 linkEthPrice, , , ) = linkEthPriceFeed.latestRoundData();
        require(linkEthPrice > 0, "Invalid LINK/ETH price");

        // Convert to ETH cost: costWithPremium / (LINK/ETH price)
        // Since linkEthPrice has 18 decimals, we need to scale properly
        // Cost in ETH = costWithPremium * 1e18 / linkEthPrice
        uint256 vrfCostInEth = (costWithPremium * 1e18) / uint256(linkEthPrice);

        return vrfCostInEth;
    }

    /**
     * @dev Calculate current total fee: gas + VRF + markup
     * Fee = (estimated gas units * current gas price) + VRF request cost + markup ($0.20)
     * This ensures we cover actual gas costs, Chainlink VRF costs, plus a buffer
     */
    function getCurrentGasFee() public view returns (uint256) {
        // Calculate expected gas cost based on current gas price
        uint256 estimatedGasCost = estimatedGasUnits * tx.gasprice;

        // Calculate VRF request cost using proper formula
        uint256 vrfCost = calculateVrfCost();

        // Add VRF cost to total
        uint256 totalCost = estimatedGasCost + vrfCost;

        // Add markup for safety buffer (~$0.20)
        uint256 totalFee = totalCost + gasMarkup;

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

    /**
     * @dev Update VRF verification gas estimate (only owner)
     * @param newGas New verification gas estimate
     */
    function setVrfVerificationGas(uint256 newGas) external onlyOwner {
        require(newGas > 0, "Verification gas must be positive");
        vrfVerificationGas = newGas;
    }

    /**
     * @dev Update VRF premium percentage (only owner)
     * @param newPremium New premium percentage (e.g., 20 for 20%)
     */
    function setVrfPremiumPercentage(uint256 newPremium) external onlyOwner {
        require(newPremium <= 100, "Premium too high");
        vrfPremiumPercentage = newPremium;
    }

    /**
     * @dev Set LINK/ETH price feed address (only owner)
     * @param priceFeedAddress Address of Chainlink LINK/ETH price feed
     */
    function setLinkEthPriceFeed(address priceFeedAddress) external onlyOwner {
        require(priceFeedAddress != address(0), "Invalid price feed address");
        linkEthPriceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    /**
     * @dev Configure Chainlink VRF parameters (only owner)
     * @param subscriptionId Chainlink VRF subscription ID
     * @param keyHash Gas lane key hash
     */
    function configureVRF(
        uint256 subscriptionId,
        bytes32 keyHash
    ) external onlyOwner {
        vrfSubscriptionId = subscriptionId;
        vrfKeyHash = keyHash;
    }

    /**
     * @dev Request random seed from Chainlink VRF for a hand
     * @param tableId Table ID
     * @return requestId VRF request ID
     */
    function requestRandomSeed(uint256 tableId) external onlyGameServer returns (uint256) {
        Table storage table = tables[tableId];
        require(table.isActive, "Table not active");
        require(vrfSubscriptionId != 0, "VRF not configured");
        require(table.randomSeed == 0, "Random seed already set");

        // Request random words from Chainlink VRF
        uint256 requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: vrfKeyHash,
                subId: vrfSubscriptionId,
                requestConfirmations: vrfRequestConfirmations,
                callbackGasLimit: vrfCallbackGasLimit,
                numWords: vrfNumWords,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );

        table.vrfRequestId = requestId;
        vrfRequestToTable[requestId] = tableId;

        emit RandomSeedRequested(tableId, requestId);

        return requestId;
    }

    /**
     * @dev Chainlink VRF callback - receives random number
     * @param requestId VRF request ID
     * @param randomWords Array of random numbers (we only use first one)
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] calldata randomWords
    ) internal override {
        uint256 tableId = vrfRequestToTable[requestId];
        require(tableId != 0 || tables[tableId].isActive, "Invalid request");

        Table storage table = tables[tableId];
        table.randomSeed = randomWords[0];

        emit RandomSeedFulfilled(tableId, randomWords[0]);
    }

    modifier onlyGameServer() {
        require(msg.sender == gameServer, "Only game server can call this");
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
        require(!emergencyShutdown, "Contract in emergency shutdown");
        require(smallBlind > 0 && bigBlind > 0, "Blinds must be greater than zero");
        require(smallBlind < bigBlind, "Small blind must be less than big blind");

        uint256 totalBlinds = smallBlind + bigBlind;

        // Require minimum blinds to cover gas fee (use current estimate)
        uint256 currentGasFee = getCurrentGasFee();
        require(totalBlinds > currentGasFee, "Stakes too small");

        uint256 tableId = ++tableCounter; // Pre-increment to start at 1
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
        require(!emergencyShutdown, "Contract in emergency shutdown");
        require(tableId > 0 && tableId <= tableCounter, "Table does not exist");
        Table storage table = tables[tableId];

        require(table.isActive, "Table not active");
        require(msg.value >= table.minBuyIn, "Buy-in below minimum");
        require(table.numPlayers < 9, "Table is full");
        require(!table.isSeated[msg.sender], "Already seated at this table");

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

        require(table.isSeated[msg.sender], "Not seated at this table");
        require(table.pot == 0, "Cannot leave during active hand");

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
        require(tableId > 0 && tableId <= tableCounter, "Table does not exist");
        Table storage table = tables[tableId];

        require(table.isActive, "Table not active");
        require(table.numPlayers >= 2, "Need at least 2 players");
        require(table.pot == 0, "Hand already in progress");

        // Clear card commitments from previous hand
        for (uint8 i = 0; i < 9; i++) {
            address player = table.players[i];
            if (player != address(0)) {
                delete table.cardCommitments[player];
            }
        }

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
        payable(owner()).transfer(gasFee);

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

        require(table.isSeated[player], "Player not seated");
        require(table.chips[player] >= amount, "Insufficient chips");

        table.chips[player] -= amount;
        table.pot += amount;
    }

    /**
     * @dev Commit card hash for a player (called during deal)
     * @param tableId Table ID
     * @param player Player address
     * @param cardHash Hash of cards (keccak256(card1 + card2 + salt))
     */
    function commitCards(
        uint256 tableId,
        address player,
        bytes32 cardHash
    ) external onlyGameServer {
        Table storage table = tables[tableId];

        require(table.isSeated[player], "Player not seated");
        require(!table.cardCommitments[player].committed, "Already committed");

        table.cardCommitments[player].cardHash = cardHash;
        table.cardCommitments[player].committed = true;
        table.cardCommitments[player].revealed = false;

        emit CardCommitted(tableId, player, cardHash);
    }

    /**
     * @dev Reveal and verify cards (called at showdown)
     * @param tableId Table ID
     * @param player Player address
     * @param card1 First card (e.g., "Ah")
     * @param card2 Second card (e.g., "Kd")
     * @param salt Random salt used in commitment
     */
    function revealCards(
        uint256 tableId,
        address player,
        string calldata card1,
        string calldata card2,
        string calldata salt
    ) external onlyGameServer returns (bool) {
        Table storage table = tables[tableId];
        CardCommitment storage commitment = table.cardCommitments[player];

        require(commitment.committed, "No commitment found");
        require(!commitment.revealed, "Already revealed");

        // Verify the hash matches
        bytes32 computedHash = keccak256(abi.encodePacked(card1, card2, salt));
        require(computedHash == commitment.cardHash, "Card verification failed");

        // Store revealed cards
        commitment.card1 = card1;
        commitment.card2 = card2;
        commitment.salt = salt;
        commitment.revealed = true;

        emit CardRevealed(tableId, player, card1, card2);

        return true;
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

        // If winner's cards were committed, they must be revealed
        if (table.cardCommitments[winner].committed) {
            require(table.cardCommitments[winner].revealed, "Winner cards not revealed");
        }

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
        if (smallBlind == 0 || bigBlind == 0) {
            return (false, "Blinds must be greater than zero");
        }

        if (smallBlind >= bigBlind) {
            return (false, "Small blind must be less than big blind");
        }

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
     * @dev Get card commitment for a player
     */
    function getCardCommitment(uint256 tableId, address player)
        external
        view
        returns (
            bytes32 cardHash,
            bool committed,
            bool revealed,
            string memory card1,
            string memory card2
        )
    {
        CardCommitment storage commitment = tables[tableId].cardCommitments[player];
        return (
            commitment.cardHash,
            commitment.committed,
            commitment.revealed,
            commitment.card1,
            commitment.card2
        );
    }

    /**
     * @dev Get random seed for a table (used by game server for shuffling)
     */
    function getRandomSeed(uint256 tableId) external view returns (uint256) {
        return tables[tableId].randomSeed;
    }

    /**
     * @dev Owner can withdraw accumulated fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        payable(owner()).transfer(balance);
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

    /**
     * @dev Emergency shutdown: If owner's wallet balance is 0, anyone can trigger
     * this function to return all funds to players and shut down the contract.
     * This safety mechanism protects players if something goes wrong.
     */
    function emergencyRefundAllPlayers() external {
        require(!emergencyShutdown, "Already in emergency shutdown");
        require(owner().balance == 0, "Owner balance must be 0 to trigger emergency");

        emergencyShutdown = true;
        uint256 totalRefunded = 0;

        // Refund all players at all tables
        for (uint256 tableId = 1; tableId <= tableCounter; tableId++) {
            Table storage table = tables[tableId];

            // Refund each player's chips
            for (uint8 i = 0; i < 9; i++) {
                address player = table.players[i];
                if (player != address(0)) {
                    uint256 chipCount = table.chips[player];

                    // Add their share of the pot if there is one
                    if (table.pot > 0 && table.numPlayers > 0) {
                        chipCount += table.pot / table.numPlayers;
                    }

                    if (chipCount > 0) {
                        table.chips[player] = 0;
                        totalRefunded += chipCount;
                        payable(player).transfer(chipCount);
                        emit PlayerRefunded(tableId, player, chipCount);
                    }
                }
            }

            // Clear the pot
            table.pot = 0;
            table.isActive = false;
        }

        emit EmergencyShutdown(msg.sender, totalRefunded);
    }
}
