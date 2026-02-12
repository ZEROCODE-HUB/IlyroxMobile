import { APPOINTMENT_TYPES } from "./AppointmentTypeSelector";

/**
 * Helper to format dates for Google Calendar (YYYYMMDDTHHmmSS)
 */
const formatGoogleCalendarDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
};

/**
 * Builds a Google Calendar URL with the appointment details
 */
export function buildGoogleCalendarUrl(params: {
    date: string; // YYYY-MM-DD
    time: string; // HH:MM
    type: string;
    description?: string;
    location?: string;
    propertyTitle?: string;
    otherUserName?: string;
}): string {
    const {
        date,
        time,
        type,
        description = "",
        location = "",
        propertyTitle = "",
        otherUserName = "",
    } = params;

    // Find type label
    const typeLabel =
        APPOINTMENT_TYPES.find((t) => t.value === type)?.label || type;

    // Construct start Time
    const startDate = new Date(`${date}T${time}:00`);

    // Default duration: 1 hour
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const startDateTime = formatGoogleCalendarDate(startDate);
    const endDateTime = formatGoogleCalendarDate(endDate);

    // Construct Title: "Cita - [Type] - [Property]"
    let eventTitle = `Cita: ${typeLabel}`;
    if (propertyTitle) {
        eventTitle += ` en ${propertyTitle}`;
    }

    // Construct Description
    let details = `Tipo de cita: ${typeLabel}\n`;
    if (otherUserName) {
        details += `Con: ${otherUserName}\n`;
    }
    if (description) {
        details += `\nDetalles adicionales:\n${description}`;
    }

    // Encode params
    const titleEnc = encodeURIComponent(eventTitle);
    const detailsEnc = encodeURIComponent(details.trim());
    const locationEnc = encodeURIComponent(location);
    const dates = `${startDateTime}/${endDateTime}`;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titleEnc}&dates=${dates}&details=${detailsEnc}&location=${locationEnc}`;
}
