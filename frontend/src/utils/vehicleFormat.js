export function shortenAddress(value, start = 8, end = 6) {
    if (!value) return "—";
    if (value.length <= start + end + 3) return value;
    return value.slice(0, start) + "..." + value.slice(-end);
}

export function formatVehicleOption(vehicle) {
    if (!vehicle) return "—";
    const name = vehicle.name || "Vehicle";
    const addr = shortenAddress(vehicle.vehicleAddress || vehicle.address, 6, 4);
    const status = vehicle.revoked || vehicle.deactivated ? "Inactive" : "Active";
    return `${name} | ${addr} | ${status}`;
}

