
import { apiRequest } from './api';
import { getToken } from './auth';

// Retrieve current system state.
export async function getSystemState() {
    const token = await getToken();

    if (!token) {
        throw new Error('Authentication required.');
    }

    return apiRequest('/state', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}

// Switch between AUTO and MANUAL modes.
export async function updateMode(mode) {
    const token = await getToken();

    if (!token) {
        throw new Error('Authentication required.');
    }

    return apiRequest('/mode', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mode }),
    });
}

// Control the light manually.
export async function updateLight(state) {
    const token = await getToken();

    if (!token) {
        throw new Error('Authentication required.');
    }

    return apiRequest('/light', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ state }),
    });
}
