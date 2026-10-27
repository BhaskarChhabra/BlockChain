import {
    connectVehicleWallet,
} from "../services/blockchain";

const pageNames = {
    overview: "Overview",
    vehicles: "Vehicle Registry",
    authentication: "V2I Authentication",
    handover: "RSU Handover",
    revocation: "Revocation Center",
    keys: "Key Management",
    attacks: "Attack Lab",
    performance: "Performance",
};

function Topbar({
    page,
}) {
    const connectWallet = async () => {
        try {
            const wallet =
                await connectVehicleWallet();

            console.log(
                "Vehicle wallet:",
                wallet.address
            );
        } catch (error) {
            console.error(
                error.message
            );
        }
    };

    return (
        <header className="topbar">

            <div>

                <div className="breadcrumb">
                    V-CHAIN
                    <span>/</span>
                    {pageNames[page]}
                </div>

                <h1>
                    {pageNames[page]}
                </h1>

            </div>

            <div className="topbar-actions">

                <div className="chain-pill">

                    <span className="status-dot active" />

                    <span>
                        Hardhat Localnet
                    </span>

                    <strong>
                        LOCAL
                    </strong>

                </div>

                <button
                    className="wallet-button"
                    onClick={
                        connectWallet
                    }
                >
                    <span>
                        ◉
                    </span>

                    Connect Vehicle
                </button>

            </div>

        </header>
    );
}

export default Topbar;