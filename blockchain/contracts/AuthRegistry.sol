// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AuthRegistry {

    // ============================================================
    // STRUCTS
    // ============================================================

    struct User {
        bytes32 publicKeyHash;
        bool registered;
        bool revoked;
        uint256 registeredAt;
    }

    struct RSU {
        string id;
        string location;
        bool active;
        uint256 registeredAt;
    }

    struct Handover {
        string rsuId;
        uint256 timestamp;
        bool successful;
    }

    struct Authentication {
        string rsuId;
        uint256 timestamp;
        bool successful;
    }

    // ============================================================
    // STATE
    // ============================================================

    address public admin;

    mapping(address => User) public users;

    mapping(address => Handover) public lastHandover;

    mapping(address => Authentication)
        public lastAuthentication;

    mapping(string => RSU) private rsus;

    string[] private rsuIds;

    // ============================================================
    // EVENTS
    // ============================================================

    event UserRegistered(
        address indexed user,
        bytes32 publicKeyHash,
        uint256 timestamp
    );

    event UserRevoked(
        address indexed user,
        uint256 timestamp
    );

    event RSURegistered(
        string indexed rsuId,
        string location,
        uint256 timestamp
    );

    event RSUStatusChanged(
        string indexed rsuId,
        bool active,
        uint256 timestamp
    );

    event AuthenticationRecorded(
        address indexed user,
        string rsuId,
        uint256 timestamp
    );

    event HandoverRecorded(
        address indexed user,
        string rsuId,
        uint256 timestamp
    );

    // ============================================================
    // MODIFIER
    // ============================================================

    modifier onlyAdmin() {
        require(
            msg.sender == admin,
            "Only admin can perform this action"
        );
        _;
    }

    // ============================================================
    // CONSTRUCTOR
    // ============================================================

    constructor() {
        admin = msg.sender;
    }

    // ============================================================
    // VEHICLE REGISTRATION
    // ============================================================

    function registerUser(
        address _user,
        bytes32 _publicKeyHash
    ) external onlyAdmin {

        require(
            _user != address(0),
            "Invalid user address"
        );

        users[_user] = User({
            publicKeyHash: _publicKeyHash,
            registered: true,
            revoked: false,
            registeredAt: block.timestamp
        });

        emit UserRegistered(
            _user,
            _publicKeyHash,
            block.timestamp
        );
    }

    // ============================================================
    // VEHICLE REVOCATION
    // ============================================================

    function revokeUser(
        address _user
    ) external onlyAdmin {

        require(
            users[_user].registered,
            "User not registered"
        );

        users[_user].revoked = true;

        emit UserRevoked(
            _user,
            block.timestamp
        );
    }

    // ============================================================
    // VEHICLE AUTHENTICATION STATE
    // ============================================================

    function isAuthenticated(
        address _user
    ) public view returns (bool) {

        return
            users[_user].registered &&
            !users[_user].revoked;
    }

    // ============================================================
    // RECORD AUTHENTICATION
    // ============================================================

    function recordAuthentication(
        address _user,
        string memory _rsuId
    ) external onlyAdmin {

        require(
            users[_user].registered,
            "User not registered"
        );

        require(
            !users[_user].revoked,
            "User is revoked"
        );

        require(
            rsus[_rsuId].active,
            "RSU is not active"
        );

        lastAuthentication[_user] =
            Authentication({
                rsuId: _rsuId,
                timestamp: block.timestamp,
                successful: true
            });

        emit AuthenticationRecorded(
            _user,
            _rsuId,
            block.timestamp
        );
    }

    // ============================================================
    // HANDOVER
    // ============================================================

    function recordHandover(
        address _user,
        string memory _rsuId
    ) external onlyAdmin {

        require(
            users[_user].registered,
            "User not registered"
        );

        require(
            !users[_user].revoked,
            "User is revoked"
        );

        require(
            rsus[_rsuId].active,
            "RSU is not active"
        );

        lastHandover[_user] =
            Handover({
                rsuId: _rsuId,
                timestamp: block.timestamp,
                successful: true
            });

        emit HandoverRecorded(
            _user,
            _rsuId,
            block.timestamp
        );
    }

    // ============================================================
    // RSU REGISTRATION
    // ============================================================

    function registerRSU(
        string memory _rsuId,
        string memory _location
    ) external onlyAdmin {

        require(
            bytes(_rsuId).length > 0,
            "RSU ID required"
        );

        require(
            !rsus[_rsuId].active,
            "RSU already exists"
        );

        rsus[_rsuId] = RSU({
            id: _rsuId,
            location: _location,
            active: true,
            registeredAt: block.timestamp
        });

        rsuIds.push(_rsuId);

        emit RSURegistered(
            _rsuId,
            _location,
            block.timestamp
        );
    }

    // ============================================================
    // RSU ENABLE / DISABLE
    // ============================================================

    function setRSUStatus(
        string memory _rsuId,
        bool _active
    ) external onlyAdmin {

        require(
            bytes(rsus[_rsuId].id).length > 0,
            "RSU not found"
        );

        rsus[_rsuId].active = _active;

        emit RSUStatusChanged(
            _rsuId,
            _active,
            block.timestamp
        );
    }

    // ============================================================
    // GET RSU
    // ============================================================

    function getRSU(
        string memory _rsuId
    )
        external
        view
        returns (
            string memory,
            string memory,
            bool,
            uint256
        )
    {
        RSU memory rsu = rsus[_rsuId];

        return (
            rsu.id,
            rsu.location,
            rsu.active,
            rsu.registeredAt
        );
    }

    // ============================================================
    // GET ALL RSUS
    // ============================================================

    function getAllRSUs()
        external
        view
        returns (RSU[] memory)
    {
        RSU[] memory result =
            new RSU[](rsuIds.length);

        for (
            uint256 i = 0;
            i < rsuIds.length;
            i++
        ) {
            result[i] = rsus[rsuIds[i]];
        }

        return result;
    }

    // ============================================================
    // GET VEHICLE
    // ============================================================

    function getUser(address _user)
        public
        view
        returns (
            bytes32,
            bool,
            bool,
            uint256
        )
    {
        User memory user = users[_user];

        return (
            user.publicKeyHash,
            user.registered,
            user.revoked,
            user.registeredAt
        );
    }

    // ============================================================
    // LAST HANDOVER
    // ============================================================

    function getLastHandover(
        address _user
    )
        public
        view
        returns (
            string memory,
            uint256,
            bool
        )
    {
        Handover memory handover =
            lastHandover[_user];

        return (
            handover.rsuId,
            handover.timestamp,
            handover.successful
        );
    }

    // ============================================================
    // LAST AUTHENTICATION
    // ============================================================

    function getLastAuthentication(
        address _user
    )
        public
        view
        returns (
            string memory,
            uint256,
            bool
        )
    {
        Authentication memory auth =
            lastAuthentication[_user];

        return (
            auth.rsuId,
            auth.timestamp,
            auth.successful
        );
    }
}