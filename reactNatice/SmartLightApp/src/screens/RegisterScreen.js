import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    StatusBar,
} from 'react-native';

import { apiRequest } from '../services/api';
import MosquitoMascot from '../components/MosquitoMascot';
import { AuthTabs, AuthField, AuthButton, COLORS } from '../components/AuthUi';

export default function RegisterScreen({ navigation }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [focusedField, setFocusedField] = useState(null);

    const emailRef = useRef(null);
    const passwordRef = useRef(null);
    const confirmRef = useRef(null);

    const handleRegister = async () => {
        setError('');
        setSuccess('');

        // Validate the form before contacting the backend.
        if (!name.trim() || !email.trim() || !password || !confirmPassword) {
            setError('Please fill in all fields.');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        try {
            setLoading(true);

            await apiRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    password,
                }),
            });

            setSuccess('Account created successfully. You can now log in.');

            setName('');
            setEmail('');
            setPassword('');
            setConfirmPassword('');
        } catch (err) {
            setError(err.message || 'Unable to create your account.');
        } finally {
            setLoading(false);
        }
    };

    // Mascot reactions: hide eyes on password fields, otherwise follow the typing.
    const shy = focusedField === 'password' || focusedField === 'confirm';
    const typedLength =
        focusedField === 'name' ? name.length : focusedField === 'email' ? email.length : 0;
    const lookX =
        focusedField === 'name' || focusedField === 'email'
            ? Math.min(1, typedLength / 24) * 2 - 1
            : 0;
    const lookY = focusedField ? 0.6 : 0;

    const statusText = shy
        ? 'Shh! Mosquito is covering its eyes for privacy.'
        : 'Join the illuminated swarm today...';

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

                    <View style={styles.mascot}>
                        <MosquitoMascot
                            width={200}
                            shy={shy}
                            lookX={lookX}
                            lookY={lookY}
                            busy={loading}
                        />
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>
                            Join Smart Light to monitor and control your lighting.
                        </Text>

                        <View style={styles.form}>
                            <AuthField
                                label="Full name"
                                placeholder="Enter your full name"
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                                autoCorrect={false}
                                editable={!loading}
                                returnKeyType="next"
                                onSubmitEditing={() => emailRef.current?.focus()}
                                onFocus={() => setFocusedField('name')}
                                onBlur={() => setFocusedField(null)}
                            />

                            <AuthField
                                ref={emailRef}
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
                                placeholder="At least 8 characters"
                                value={password}
                                onChangeText={setPassword}
                                password
                                autoCapitalize="none"
                                editable={!loading}
                                returnKeyType="next"
                                onSubmitEditing={() => confirmRef.current?.focus()}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                            />

                            <AuthField
                                ref={confirmRef}
                                label="Confirm password"
                                placeholder="Enter your password again"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                password
                                autoCapitalize="none"
                                editable={!loading}
                                returnKeyType="go"
                                onSubmitEditing={handleRegister}
                                onFocus={() => setFocusedField('confirm')}
                                onBlur={() => setFocusedField(null)}
                            />

                            {!!error && (
                                <View style={styles.errorBox}>
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            )}

                            {!!success && (
                                <View style={styles.successBox}>
                                    <Text style={styles.successText}>{success}</Text>
                                </View>
                            )}

                            <AuthButton onPress={handleRegister} loading={loading}>
                                {loading ? (
                                    <ActivityIndicator color={COLORS.onAmber} />
                                ) : (
                                    <Text style={styles.buttonText}>Create Account</Text>
                                )}
                            </AuthButton>

                            <View style={styles.loginRow}>
                                <Text style={styles.loginText}>Already have an account?</Text>
                                <Pressable onPress={() => navigation.goBack()} disabled={loading}>
                                    <Text style={styles.loginLink}> Log in</Text>
                                </Pressable>
                            </View>
                        </View>
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
        paddingBottom: 32,
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
    errorBox: {
        backgroundColor: COLORS.errorBg,
        borderWidth: 1,
        borderColor: COLORS.errorBorder,
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
    },
    errorText: {
        color: COLORS.errorText,
        fontSize: 13,
        textAlign: 'center',
    },
    successBox: {
        backgroundColor: COLORS.successBg,
        borderWidth: 1,
        borderColor: COLORS.successBorder,
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
    },
    successText: {
        color: COLORS.successText,
        fontSize: 13,
        textAlign: 'center',
    },
    buttonText: {
        color: COLORS.onAmber,
        fontSize: 15,
        fontWeight: '700',
    },
    loginRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 18,
    },
    loginText: {
        fontSize: 13,
        color: COLORS.muted,
    },
    loginLink: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.amberSoft,
    },
});