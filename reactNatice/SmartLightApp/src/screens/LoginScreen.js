import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
} from 'react-native';

import { login } from '../services/auth';
import { AuthField, AuthButton, COLORS } from '../components/AuthUi';
import MosquitoMascot from '../components/MosquitoMascot';



export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState(null);

    const passwordRef = useRef(null);

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

    // Mascot reactions: hide eyes on the password field, otherwise follow the typing.
    const shy = focusedField === 'password';
    const lookX = focusedField === 'email' ? Math.min(1, email.length / 24) * 2 - 1 : 0;
    const lookY = focusedField ? 0.6 : 0;

    const statusText = shy
        ? 'Shh! Mosquito is covering its eyes for privacy.'
        : 'The glowing buzz is watching your inputs...';

    return (
        <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.container}>
                    {/* <AuthTabs
                        active="login"
                        onLogin={() => {}}
                        onRegister={() => navigation.navigate('Register')}
                        disabled={loading}
                    /> */}

                    <View style={styles.mascot}>
                        <MosquitoMascot
                            width={220}
                            shy={shy}
                            lookX={lookX}
                            lookY={lookY}
                            busy={loading}
                        />
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.title}>Smart Light</Text>
                        <Text style={styles.subtitle}>Sign in to your account</Text>
                        {/* <Text style={styles.status}>{statusText}</Text> */}

                        <View style={styles.form}>
                            <AuthField
                                label="Email address"
                                placeholder="you@example.com"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!loading}
                                returnKeyType="next"
                                onSubmitEditing={() => passwordRef.current?.focus()}
                                onFocus={() => setFocusedField('email')}
                                onBlur={() => setFocusedField(null)}
                            />

                            <AuthField
                                ref={passwordRef}
                                label="Password"
                                placeholder="••••••••••••"
                                value={password}
                                onChangeText={setPassword}
                                password
                                autoCapitalize="none"
                                editable={!loading}
                                returnKeyType="go"
                                onSubmitEditing={handleLogin}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                            />

                            <AuthButton onPress={handleLogin} loading={loading}>
                                {loading ? (
                                    <ActivityIndicator color={COLORS.onAmber} />
                                ) : (
                                    <Text style={styles.buttonText}>Login</Text>
                                )}
                            </AuthButton>
                        </View>

                        <TouchableOpacity
                            onPress={() => navigation.navigate('Register')}
                            disabled={loading}
                        >
                            <Text style={styles.registerText}>
                                Don't have an account?{' '}
                                <Text style={styles.registerLink}>Create Account</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
        paddingTop: 48,
    },
    container: {
        width: '100%',
        maxWidth: 440,
        alignSelf: 'center',
        alignItems: 'center',
    },
    mascot: {
        zIndex: 2,
        marginBottom: -26,
    },
    card: {
        zIndex: 1,
        width: '100%',
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        borderRadius: 20,
        paddingHorizontal: 22,
        paddingTop: 40,
        paddingBottom: 22,
        shadowColor: COLORS.amber,
        shadowOpacity: 0.18,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 10 },
        elevation: 8,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.muted,
        textAlign: 'center',
        marginTop: 4,
        marginBottom: 18,
    },
    form: {
        width: '100%',
    },
    buttonText: {
        color: COLORS.onAmber,
        fontSize: 15,
        fontWeight: '700',
    },
    registerText: {
        marginTop: 18,
        textAlign: 'center',
        fontSize: 13,
        color: COLORS.muted,
    },
    registerLink: {
        color: COLORS.amberSoft,
        fontWeight: '600',
    },
});