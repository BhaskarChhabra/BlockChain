function Overview({
    setPage,
}) {
    return (
        <div className="page-content">

            <div className="page-intro">
                <span className="eyebrow">
                    SECURE VEHICLE NETWORK
                </span>

                <h2>
                    Blockchain-powered
                    <br />
                    <span>
                        V2I Authentication
                    </span>
                </h2>

                <p>
                    Real-time VANET security
                    simulation and blockchain
                    identity management.
                </p>
            </div>

            <div className="stat-grid">

                <div className="stat-card">
                    <div className="stat-icon">
                        ◇
                    </div>

                    <div className="stat-body">
                        <span>BLOCKCHAIN</span>
                        <strong>
                            <span className="status-dot active" />
                            ONLINE
                        </strong>
                        <small>
                            Hardhat Localnet
                        </small>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        ▣
                    </div>

                    <div className="stat-body">
                        <span>VEHICLES</span>
                        <strong>0</strong>
                        <small>
                            Registered identities
                        </small>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        ◈
                    </div>

                    <div className="stat-body">
                        <span>AUTHENTICATIONS</span>
                        <strong>0</strong>
                        <small>
                            Successful sessions
                        </small>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        ⇄
                    </div>

                    <div className="stat-body">
                        <span>HANDOVERS</span>
                        <strong>0</strong>
                        <small>
                            Blockchain recorded
                        </small>
                    </div>
                </div>

            </div>

            <div className="panel">

                <div className="panel-header">
                    <div>
                        <h3>
                            V-CHAIN Security Console
                        </h3>

                        <span>
                            Select a module from the
                            navigation to begin.
                        </span>
                    </div>
                </div>

                <div className="module-launcher">

                    <button
                        onClick={() =>
                            setPage(
                                "authentication"
                            )
                        }
                    >
                        <strong>
                            ◈ V2I Authentication
                        </strong>

                        <span>
                            Challenge-response
                            authentication
                        </span>
                    </button>

                    <button
                        onClick={() =>
                            setPage("vehicles")
                        }
                    >
                        <strong>
                            ▣ Vehicle Registry
                        </strong>

                        <span>
                            Blockchain identities
                        </span>
                    </button>

                    <button
                        onClick={() =>
                            setPage("handover")
                        }
                    >
                        <strong>
                            ⇄ RSU Handover
                        </strong>

                        <span>
                            Secure mobility
                        </span>
                    </button>

                    <button
                        onClick={() =>
                            setPage("attacks")
                        }
                    >
                        <strong>
                            ⚡ Attack Lab
                        </strong>

                        <span>
                            Security testing
                        </span>
                    </button>

                </div>

            </div>

        </div>
    );
}

export default Overview;