import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    Pressable,
    ScrollView,
    StatusBar,
} from 'react-native';

import {
    getCurrentUser,
    logout,
} from '../services/auth';
import MosquitoMascot from '../components/MosquitoMascot';
import { COLORS } from '../components/AuthUi';

const EMERALD = '#34D399';
const DANGER = '#DC2626';
const FADE_MS = 1500; // how long the bulb takes to dim on logout

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fades + slides its children in once on mount. */
function FadeIn({ delay = 0, style, children }) {
    const v = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(v, {
            toValue: 1,
            duration: 450,
            delay,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [v, delay]);

    return (
        <Animated.View
            style={[
                style,
                {
                    opacity: v,
                    transform: [
                        {
                            translateY: v.interpolate({
                                inputRange: [0, 1],
                                outputRange: [16, 0],
                            }),
                        },
                    ],
                },
            ]}
        >
            {children}
        </Animated.View>
    );
}

/** Pressable that springs down while held. */
function PressableScale({ onPress, disabled, containerStyle, style, children }) {
    const scale = useRef(new Animated.Value(1)).current;

    const to = (value) =>
        Animated.spring(scale, {
            toValue: value,
            friction: 5,
            tension: 220,
            useNativeDriver: true,
        }).start();

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            onPressIn={() => to(0.96)}
            onPressOut={() => to(1)}
            style={containerStyle}
        >
            <Animated.View style={[style, { transform: [{ scale }] }]}>
                {children}
            </Animated.View>
        </Pressable>
    );
}

/** Small green dot that gently pulses. */
function StatusDot() {
    const pulse = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, {
                    toValue: 1,
                    duration: 1100,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(pulse, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [pulse]);

    return (
        <View style={styles.dotWrap}>
            <Animated.View
                style={[
                    styles.dotRing,
                    {
                        opacity: pulse.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.6, 0],
                        }),
                        transform: [
                            {
                                scale: pulse.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [1, 2.4],
                                }),
                            },
                        ],
                    },
                ]}
            />
            <View style={styles.dot} />
        </View>
    );
}

export default function ProfileScreen({ navigation }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // idle -> confirm -> loggingOut -> bye
    const [phase, setPhase] = useState('idle');
    const [error, setError] = useState('');
    const [lightLevel, setLightLevel] = useState(1);
    const [greeting, setGreeting] = useState(false);

    const fadeTimer = useRef(null);
    const greetTimer = useRef(null);
    const shake = useRef(new Animated.Value(0)).current;
    const overlay = useRef(new Animated.Value(0)).current;
    const avatarScale = useRef(new Animated.Value(1)).current;
    const ring = useRef(new Animated.Value(0)).current;

    const goToLogin = useCallback(() => {
        navigation.getParent()?.reset({
            index: 0,
            routes: [{ name: 'Login' }],
        });
    }, [navigation]);

    // Load authenticated user information.
    useEffect(() => {
        async function loadProfile() {
            try {
                const currentUser = await getCurrentUser();

                if (!currentUser) {
                    goToLogin();
                    return;
                }

                setUser(currentUser);

            } catch (err) {
                Alert.alert(
                    'Error',
                    'Unable to load your profile.'
                );
            } finally {
                setLoading(false);
            }
        }

        loadProfile();
    }, [goToLogin]);

    // Pulsing ring around the avatar.
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(ring, {
                    toValue: 1,
                    duration: 1800,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(ring, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [ring]);

    // Clean up timers when leaving the screen.
    useEffect(() => {
        return () => {
            if (fadeTimer.current) clearInterval(fadeTimer.current);
            if (greetTimer.current) clearTimeout(greetTimer.current);
        };
    }, []);

    function stopFade() {
        if (fadeTimer.current) {
            clearInterval(fadeTimer.current);
            fadeTimer.current = null;
        }
    }

    // Dims the mosquito's bulb from 100% to 0%.
    function startFade() {
        return new Promise((resolve) => {
            const startedAt = Date.now();

            fadeTimer.current = setInterval(() => {
                const t = (Date.now() - startedAt) / FADE_MS;

                if (t >= 1) {
                    stopFade();
                    setLightLevel(0);
                    resolve();
                } else {
                    setLightLevel(1 - t);
                }
            }, 80);
        });
    }

    function runShake() {
        Animated.sequence([
            Animated.timing(shake, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(shake, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(shake, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shake, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    }

    // Tapping the avatar: bounce it and make the mosquito look at it.
    function handleAvatarPress() {
        Animated.sequence([
            Animated.spring(avatarScale, { toValue: 1.18, friction: 4, useNativeDriver: true }),
            Animated.spring(avatarScale, { toValue: 1, friction: 4, useNativeDriver: true }),
        ]).start();

        setGreeting(true);
        if (greetTimer.current) clearTimeout(greetTimer.current);
        greetTimer.current = setTimeout(() => setGreeting(false), 1400);
    }

    // Step 1: ask for confirmation (replaces the system alert).
    function handleLogoutPress() {
        setError('');
        setPhase('confirm');
    }

    function handleCancel() {
        setPhase('idle');
    }

    // Step 2: clear the token, dim the bulb, then return to Login.
    async function handleConfirmLogout() {
        setError('');
        setPhase('loggingOut');
        setLightLevel(1);

        const fade = startFade();

        try {
            await logout();
        } catch (err) {
            // Logout failed: bring the light back and show feedback.
            stopFade();
            setLightLevel(1);
            setPhase('idle');
            setError('Unable to log out. Please try again.');
            runShake();
            return;
        }

        // Let the bulb finish dimming so the feedback is always visible.
        await fade;
        setPhase('bye');
        await wait(700);

        Animated.timing(overlay, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
        }).start(goToLogin);
    }

    if (loading) {
        return (
            <View style={styles.center}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
                <ActivityIndicator size="large" color={COLORS.amber} />
                <Text style={styles.loadingText}>Loading your profile...</Text>
            </View>
        );
    }

    const confirming = phase === 'confirm';
    const loggingOut = phase === 'loggingOut';
    const signedOut = phase === 'bye';

    let statusText = 'Your account is glowing and secure.';
    if (greeting) statusText = 'Buzz! Hello there.';
    if (confirming) statusText = "Wait... I can't look!";
    if (loggingOut) statusText = 'Dimming the light...';
    if (signedOut) statusText = 'Signed out. Buzz you later!';

    const initial = user?.email?.charAt(0).toUpperCase() || '?';

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.container}>
                    <View style={styles.mascot}>
                        <MosquitoMascot
                            width={200}
                            shy={confirming}
                            lookX={greeting ? 0 : 0.3}
                            lookY={greeting ? 1 : 0.4}
                            busy={loggingOut}
                            lightLevel={lightLevel}
                        />
                    </View>

                    <Animated.View
                        style={[styles.card, { transform: [{ translateX: shake }] }]}
                    >
                        {/* Avatar */}
                        <FadeIn delay={0} style={styles.avatarArea}>
                            <Pressable onPress={handleAvatarPress}>
                                <View style={styles.avatarBox}>
                                    <Animated.View
                                        style={[
                                            styles.avatarRing,
                                            {
                                                opacity: ring.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: [0.6, 0],
                                                }),
                                                transform: [
                                                    {
                                                        scale: ring.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [1, 1.5],
                                                        }),
                                                    },
                                                ],
                                            },
                                        ]}
                                    />
                                    <Animated.View
                                        style={[
                                            styles.avatar,
                                            { transform: [{ scale: avatarScale }] },
                                        ]}
                                    >
                                        <Text style={styles.avatarText}>{initial}</Text>
                                    </Animated.View>
                                </View>
                            </Pressable>

                            <Text style={styles.heading}>My Profile</Text>
                            <Text style={styles.status}>{statusText}</Text>
                        </FadeIn>

                        {/* Account details */}
                        <FadeIn delay={120} style={styles.panel}>
                            {user?.name ? (
                                <View style={styles.infoBlock}>
                                    <Text style={styles.label}>Name</Text>
                                    <Text style={styles.value}>{user.name}</Text>
                                </View>
                            ) : null}

                            <View style={styles.infoBlock}>
                                <Text style={styles.label}>Registered Email</Text>
                                <Text style={styles.value} numberOfLines={1}>
                                    {user?.email || 'Not available'}
                                </Text>
                            </View>

                            <View style={styles.statusRow}>
                                <StatusDot />
                                <Text style={styles.accountStatus}>
                                    Authenticated Account
                                </Text>
                            </View>
                        </FadeIn>

                        {error ? (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {/* Logout area */}
                        <FadeIn delay={240} style={styles.actions}>
                            {confirming ? (
                                <FadeIn>
                                    <Text style={styles.confirmTitle}>
                                        Are you sure you want to log out?
                                    </Text>
                                    <View style={styles.confirmRow}>
                                        <PressableScale
                                            containerStyle={styles.flex}
                                            style={styles.stayButton}
                                            onPress={handleCancel}
                                        >
                                            <Text style={styles.stayText}>Stay</Text>
                                        </PressableScale>

                                        <PressableScale
                                            containerStyle={styles.flex}
                                            style={styles.confirmButton}
                                            onPress={handleConfirmLogout}
                                        >
                                            <Text style={styles.confirmText}>Logout</Text>
                                        </PressableScale>
                                    </View>
                                </FadeIn>
                            ) : (
                                <PressableScale
                                    style={[
                                        styles.logoutButton,
                                        (loggingOut || signedOut) && styles.logoutBusy,
                                    ]}
                                    onPress={handleLogoutPress}
                                    disabled={loggingOut || signedOut}
                                >
                                    {loggingOut ? (
                                        <View style={styles.busyRow}>
                                            <ActivityIndicator color={COLORS.errorText} />
                                            <Text style={styles.logoutText}>
                                                Switching off the light...
                                            </Text>
                                        </View>
                                    ) : signedOut ? (
                                        <Text style={styles.doneText}>
                                            ✓ Signed out
                                        </Text>
                                    ) : (
                                        <Text style={styles.logoutText}>Logout</Text>
                                    )}
                                </PressableScale>
                            )}
                        </FadeIn>
                    </Animated.View>

                    <Text style={styles.footer}>
                        Smart Light IoT Monitoring System
                    </Text>
                </View>
            </ScrollView>

            {/* Fades the screen out right before returning to Login */}
            <Animated.View
                pointerEvents={signedOut ? 'auto' : 'none'}
                style={[styles.overlay, { opacity: overlay }]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    center: {
        flex: 1,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: COLORS.muted,
        fontSize: 14,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
        paddingTop: 40,
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
        paddingTop: 36,
        paddingBottom: 22,
        shadowColor: COLORS.amber,
        shadowOpacity: 0.18,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 10 },
        elevation: 8,
    },
    avatarArea: {
        alignItems: 'center',
    },
    avatarBox: {
        width: 84,
        height: 84,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarRing: {
        position: 'absolute',
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 2,
        borderColor: COLORS.amber,
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderWidth: 2,
        borderColor: COLORS.amber,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 30,
        fontWeight: '700',
        color: COLORS.amberSoft,
    },
    heading: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        marginTop: 10,
    },
    status: {
        fontSize: 12,
        color: COLORS.amberSoft,
        marginTop: 6,
        marginBottom: 16,
        minHeight: 16,
        textAlign: 'center',
    },
    panel: {
        backgroundColor: 'rgba(17, 24, 39, 0.8)',
        borderWidth: 1,
        borderColor: 'rgba(31, 41, 55, 0.9)',
        borderRadius: 14,
        padding: 16,
    },
    infoBlock: {
        marginBottom: 14,
    },
    label: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: COLORS.muted,
        marginBottom: 4,
    },
    value: {
        fontSize: 16,
        fontWeight: '600',
        color: '#F3F4F6',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dotWrap: {
        width: 14,
        height: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: EMERALD,
    },
    dotRing: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: EMERALD,
    },
    accountStatus: {
        fontSize: 13,
        fontWeight: '600',
        color: EMERALD,
    },
    errorBox: {
        backgroundColor: COLORS.errorBg,
        borderWidth: 1,
        borderColor: COLORS.errorBorder,
        borderRadius: 12,
        padding: 12,
        marginTop: 14,
    },
    errorText: {
        color: COLORS.errorText,
        fontSize: 13,
        textAlign: 'center',
    },
    actions: {
        marginTop: 18,
    },
    flex: {
        flex: 1,
    },
    logoutButton: {
        backgroundColor: COLORS.errorBg,
        borderWidth: 1,
        borderColor: COLORS.errorBorder,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutBusy: {
        opacity: 0.85,
    },
    busyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    logoutText: {
        color: COLORS.errorText,
        fontSize: 15,
        fontWeight: '700',
    },
    doneText: {
        color: EMERALD,
        fontSize: 15,
        fontWeight: '700',
    },
    confirmTitle: {
        fontSize: 14,
        color: '#E5E7EB',
        textAlign: 'center',
        marginBottom: 12,
    },
    confirmRow: {
        flexDirection: 'row',
        gap: 12,
    },
    stayButton: {
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        backgroundColor: COLORS.inputBg,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    stayText: {
        color: '#F3F4F6',
        fontSize: 15,
        fontWeight: '600',
    },
    confirmButton: {
        backgroundColor: DANGER,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    confirmText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    footer: {
        marginTop: 18,
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'center',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.bg,
    },
});