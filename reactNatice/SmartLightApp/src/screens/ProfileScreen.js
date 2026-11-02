
import React, { useEffect, useState } from 'react';

import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';

import {
    getCurrentUser,
    logout,
} from '../services/auth';

export default function ProfileScreen({ navigation }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loggingOut, setLoggingOut] = useState(false);

    // Load authenticated user information.
    useEffect(() => {
        async function loadProfile() {
            try {
                const currentUser = await getCurrentUser();

                if (!currentUser) {
                    navigation.getParent()?.reset({
                        index: 0,
                        routes: [{ name: 'Login' }],
                    });
                    return;
                }

                setUser(currentUser);

            } catch (error) {
                Alert.alert(
                    'Error',
                    'Unable to load your profile.'
                );
            } finally {
                setLoading(false);
            }
        }

        loadProfile();
    }, [navigation]);

    // Clear the token and return to Login.
    async function handleLogout() {
        Alert.alert(
            'Logout',
            'Are you sure you want to log out?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoggingOut(true);

                            await logout();

                            navigation.getParent()?.reset({
                                index: 0,
                                routes: [{ name: 'Login' }],
                            });

                        } catch (error) {
                            Alert.alert(
                                'Logout Failed',
                                'Unable to log out. Please try again.'
                            );
                        } finally {
                            setLoggingOut(false);
                        }
                    },
                },
            ]
        );
    }

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator
                    size="large"
                    color="#2563EB"
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.profileCard}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {user?.email?.charAt(0).toUpperCase() || '?'}
                    </Text>
                </View>

                <Text style={styles.heading}>
                    My Profile
                </Text>

                <Text style={styles.label}>
                    Registered Email
                </Text>

                <Text style={styles.email}>
                    {user?.email || 'Not available'}
                </Text>

                <Text style={styles.accountStatus}>
                    Authenticated Account
                </Text>
            </View>

            <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
                disabled={loggingOut}
            >
                {loggingOut ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.logoutText}>
                        Logout
                    </Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        padding: 20,
    },

    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    profileCard: {
        backgroundColor: '#FFFFFF',
        padding: 25,
        borderRadius: 15,
        alignItems: 'center',
        marginTop: 30,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },

    avatar: {
        width: 85,
        height: 85,
        borderRadius: 45,
        backgroundColor: '#DBEAFE',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },

    avatarText: {
        fontSize: 34,
        fontWeight: 'bold',
        color: '#2563EB',
    },

    heading: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 25,
    },

    label: {
        color: '#64748B',
        fontSize: 14,
        marginBottom: 8,
    },

    email: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 15,
    },

    accountStatus: {
        color: '#15803D',
        fontSize: 13,
        marginTop: 5,
    },

    logoutButton: {
        backgroundColor: '#DC2626',
        padding: 16,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 30,
    },

    logoutText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
