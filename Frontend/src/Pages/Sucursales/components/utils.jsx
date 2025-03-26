export const reverseGeocode = async (lat, lng) => {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error en reverse geocoding:", error);
        return null;
    }
};

export const parseAddressComponents = (displayName, address) => {
    if (!address) {
        const parts = displayName.split(',');
        return {
            direccion: parts[0]?.trim() || "",
            calle: parts[0]?.trim() || "",
            colonia: parts[1]?.trim() || "",
            municipio: parts[2]?.trim() || parts[1]?.trim() || "",
            estado: parts[3]?.trim() || parts[2]?.trim() || "",
            cp: parts[parts.length - 2]?.trim() || ""
        };
    }

    return {
        direccion: displayName,
        calle: [address.road, address.house_number].filter(Boolean).join(' ') || displayName.split(',')[0],
        colonia: address.neighbourhood || address.suburb || address.city_district || "",
        municipio: address.city || address.town || address.village || address.county || "",
        estado: address.state || "",
        cp: address.postcode || ""
    };
};