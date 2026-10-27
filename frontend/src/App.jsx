import { useState } from "react";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import Overview from "./pages/Overview";
import VehicleRegistry from "./pages/VehicleRegistry";
import Authentication from "./pages/Authentication";
import Handover from "./pages/Handover";
import Revocation from "./pages/Revocation";
import KeyManagement from "./pages/KeyManagement";
import AttackLab from "./pages/AttackLab";
import Performance from "./pages/Performance";

import "./styles/global.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/pages.css";

function App() {
    const [page, setPage] = useState("overview");

    const renderPage = () => {
        switch (page) {
            case "overview":
                return <Overview setPage={setPage} />;

            case "vehicles":
                return <VehicleRegistry />;

            case "authentication":
                return <Authentication />;

            case "handover":
                return <Handover />;

            case "revocation":
                return <Revocation />;

            case "keys":
                return <KeyManagement />;

            case "attacks":
                return <AttackLab />;

            case "performance":
                return <Performance />;

            default:
                return <Overview setPage={setPage} />;
        }
    };

    return (
        <div className="app-shell">

            <Sidebar
                page={page}
                setPage={setPage}
            />

            <main className="main">

                <Topbar page={page} />

                <div className="page-wrapper">
                    {renderPage()}
                </div>

            </main>

        </div>
    );
}

export default App;