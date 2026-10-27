const navigation = [
    {
        group: "MAIN",
        items: [
            {
                id: "overview",
                label: "Overview",
                icon: "⌂",
            },
            {
                id: "vehicles",
                label: "Vehicle Registry",
                icon: "▣",
            },
        ],
    },
    {
        group: "SECURITY",
        items: [
            {
                id: "authentication",
                label: "V2I Authentication",
                icon: "◈",
            },
            {
                id: "handover",
                label: "RSU Handover",
                icon: "⇄",
            },
            {
                id: "revocation",
                label: "Revocation Center",
                icon: "⊘",
            },
            {
                id: "keys",
                label: "Key Management",
                icon: "⌘",
            },
        ],
    },
    {
        group: "ANALYSIS",
        items: [
            {
                id: "attacks",
                label: "Attack Lab",
                icon: "⚡",
            },
            {
                id: "performance",
                label: "Performance",
                icon: "◒",
            },
        ],
    },
];

function Sidebar({
    page,
    setPage,
}) {
    return (
        <aside className="sidebar">

            <div className="brand">

                <div className="brand-mark">
                    V
                </div>

                <div>
                    <div className="brand-name">
                        V-CHAIN
                    </div>

                    <div className="brand-subtitle">
                        VANET SECURITY PLATFORM
                    </div>
                </div>

            </div>

            <div className="network-card">

                <div className="network-top">
                    <span className="status-dot active" />
                    NETWORK ONLINE
                </div>

                <div className="network-details">
                    <span>LOCAL TESTNET</span>
                    <span>HARDHAT</span>
                </div>

            </div>

            <nav className="sidebar-nav">

                {navigation.map(
                    (section) => (
                        <div
                            className="nav-group"
                            key={section.group}
                        >

                            <div className="nav-group-title">
                                {section.group}
                            </div>

                            {section.items.map(
                                (item) => (
                                    <button
                                        key={item.id}
                                        className={`nav-item ${
                                            page === item.id
                                                ? "selected"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            setPage(
                                                item.id
                                            )
                                        }
                                    >

                                        <span className="nav-icon">
                                            {item.icon}
                                        </span>

                                        <span>
                                            {item.label}
                                        </span>

                                        {item.id ===
                                            "authentication" && (
                                            <span className="nav-live">
                                                LIVE
                                            </span>
                                        )}

                                    </button>
                                )
                            )}

                        </div>
                    )
                )}

            </nav>

            <div className="sidebar-bottom">

                <div className="security-indicator">

                    <div className="security-icon">
                        ◉
                    </div>

                    <div>
                        <strong>
                            SECURE MODE
                        </strong>

                        <span>
                            Blockchain verified
                        </span>
                    </div>

                </div>

                <div className="version">
                    V-CHAIN v1.0 · LOCAL TESTNET
                </div>

            </div>

        </aside>
    );
}

export default Sidebar;