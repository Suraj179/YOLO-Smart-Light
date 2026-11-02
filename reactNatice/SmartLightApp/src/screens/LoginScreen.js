
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from 'react-native';

import { login } from '../services/auth';

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleLogin() {
        if (!email.trim() || !password) {
            Alert.alert(
                'Missing Information',
                'Please enter your email and password.'
            );
            return;
        }

        try {
            setLoading(true);

            // Authenticate with the backend.
            await login(email.trim(), password);

            // Navigate to the main application.
            navigation.replace('MainTabs');

        } catch (error) {
            Alert.alert('Login Failed', error.message);

        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Smart Light</Text>

            <Text style={styles.subtitle}>
                Sign in to your account
            </Text>

            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
            />

            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.buttonText}>
                        Login
                    </Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
            >
                <Text style={styles.registerText}>
                    Don't have an account? Create Account
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 25,
        backgroundColor: '#F8FAFC',
    },

    title: {
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#2563EB',
        marginBottom: 8,
    },

    subtitle: {
        textAlign: 'center',
        fontSize: 16,
        color: '#64748B',
        marginBottom: 35,
    },

    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 10,
        padding: 14,
        marginBottom: 15,
        fontSize: 16,
    },

    loginButton: {
        backgroundColor: '#2563EB',
        padding: 16,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
    },

    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },

    registerText: {
        textAlign: 'center',
        color: '#2563EB',
        marginTop: 25,
        fontSize: 14,
    },
});
