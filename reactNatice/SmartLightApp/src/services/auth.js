
import * as SecureStore from 'expo-secure-store';
import { apiRequest } from './api';

// Login and securely store the JWT.
export async function login(email, password) {
    const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
            email,
            password,
        }),
    });

    await SecureStore.setItemAsync('authToken', data.token);

    await SecureStore.setItemAsync(
        'userEmail',
        data.user.email
    );

    return data.user;
}

// Retrieve the saved JWT.
export async function getToken() {
    return await SecureStore.getItemAsync('authToken');
}

// Retrieve the authenticated user's account information.
export async function getCurrentUser() {
    const token = await getToken();

    if (!token) {
        return null;
    }

    try {
        const data = await apiRequest('/auth/me', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        return data.user;

    } catch (error) {
        await logout();
        return null;
    }
}

// Log out and remove stored authentication information.
export async function logout() {
    await SecureStore.deleteItemAsync('authToken');
    await SecureStore.deleteItemAsync('userEmail');
}
