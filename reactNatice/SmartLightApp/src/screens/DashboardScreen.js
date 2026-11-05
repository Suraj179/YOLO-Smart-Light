import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    TouchableOpacity,
    Alert,
    Switch,
    StatusBar,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import {
    getSystemState,
    updateMode,
    updateLight,
} from '../services/smartLight';
import MosquitoMascot from '../components/MosquitoMascot';
import { COLORS } from '../components/AuthUi';

const EMERALD = '#34D399';
const BLUE = '#60A5FA';
const OFF_GRAY = '#6B7280';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export default function DashboardScreen() {
    const [systemState, setSystemState] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    // Smoothly counting-down value (the backend only reports whole seconds every 2s).
    const [remaining, setRemaining] = useState(10);
    const anchorRef = useRef({ remaining: 10, at: Date.now() });

    const refreshState = useCallback(async () => {
        try {
            const data = await getSystemState();
            setSystemState(data);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshState();

        const interval = setInterval(refreshState, 2000);

        return () => clearInterval(interval);
    }, [refreshState]);

    // ---- Derived state (kept above early returns so hooks stay in order) ----
    const timer = systemState?.timer;
    const isAuto = systemState?.mode === 'AUTO';
    const lightOn = !!systemState?.light?.state;
    const timerRunning = !!timer?.running;
    const duration = timer?.durationSeconds || 10;
    const reportedRemaining = Number(timer?.remainingSeconds) || 0;

    // Re-anchor the local countdown when the backend disagrees with it
    // (timer restarted, stopped, or drifted by more than ~1s).
    useEffect(() => {
        if (!timer) return;
        const now = Date.now();
        const { remaining: r, at } = anchorRef.current;
        const extrapolated = Math.max(0, r - (now - at) / 1000);

        if (!timerRunning || Math.abs(reportedRemaining - extrapolated) > 1.2) {
            anchorRef.current = { remaining: reportedRemaining, at: now };
            setRemaining(reportedRemaining);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timerRunning, reportedRemaining]);

    // Tick every 100ms while the auto timer runs so the fade is smooth.
    useEffect(() => {
        if (!(isAuto && timerRunning)) return undefined;

        const id = setInterval(() => {
            const { remaining: r, at } = anchorRef.current;
            setRemaining(Math.max(0, r - (Date.now() - at) / 1000));
        }, 100);

        return () => clearInterval(id);
    }, [isAuto, timerRunning]);

    async function handleModeChange(mode) {
        if (busy || systemState?.mode === mode) {
            return;
        }

        try {
            setBusy(true);

            const result = await updateMode(mode);
            setSystemState(result.state);
            setError('');
        } catch (err) {
            Alert.alert('Mode Change Failed', err.message);
        } finally {
            setBusy(false);
            refreshState();
        }
    }

    async function handleLightChange(state) {
        if (busy) {
            return;
        }

        try {
            setBusy(true);

            const result = await updateLight(state);
            setSystemState(result.state);
            setError('');
        } catch (err) {
            Alert.alert('Light Control Failed', err.message);
        } finally {
            setBusy(false);
            refreshState();
        }
    }

    if (loading) {
        return (
            <View style={styles.center}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
                <ActivityIndicator size="large" color={COLORS.amber} />
                <Text style={styles.loadingText}>
                    Loading Smart Light...
                </Text>
            </View>
        );
    }

    if (!systemState) {
        return (
            <View style={styles.center}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
                <Text style={styles.errorText}>
                    Unable to load Smart Light status.
                </Text>
                <Text style={styles.errorDetails}>{error}</Text>

                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={refreshState}
                >
                    <Text style={styles.primaryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const personDetected = systemState.ai.personDetected;

    // Bulb brightness: fades from 100% to 0% over the timer in AUTO mode.
    let lightLevel = lightOn ? 1 : 0;
    if (isAuto && lightOn && timerRunning) {
        lightLevel = clamp(remaining / duration, 0, 1);
    }
    const levelPercent = Math.round(lightLevel * 100);

    const countdownLabel = timerRunning
        ? `${Math.ceil(remaining)}s`
        : lightOn
            ? `${duration}s`
            : '0s';

    let timerDesc = 'Waiting for the AI to start the timer.';
    if (timerRunning) {
        timerDesc = 'Bulb smoothly dimming down...';
    } else if (!lightOn) {
        timerDesc = 'Timer finished. Light is OFF.';
    }

    const statusText = isAuto
        ? 'Auto mode: AI detection controls the light'
        : 'Manual mode: you control the glowing bulb.';

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
        >
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

            <View style={styles.inner}>
                <View style={styles.mascot}>
                    <MosquitoMascot
                        width={200}
                        lookX={personDetected ? 0.6 : -0.6}
                        lookY={0.4}
                        busy={busy}
                        lightLevel={lightLevel}
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.heading}>Smart Light</Text>
                    <Text style={styles.subtitle}>
                        Monitor and control your room lighting
                    </Text>
                    <Text style={styles.status}>{statusText}</Text>

                    {error ? (
                        <Text style={styles.warning}>
                            Connection interrupted. Displaying last received data.
                        </Text>
                    ) : null}

                    {/* Mode + Light switches */}
                    <View style={styles.tileRow}>
                        <View style={styles.tile}>
                            <Text style={styles.tileLabel}>System Mode</Text>
                            <View style={styles.tileBottom}>
                                <Text
                                    style={[
                                        styles.tileValue,
                                        { color: isAuto ? COLORS.amberSoft : BLUE },
                                    ]}
                                >
                                    {isAuto ? 'AUTO' : 'MANUAL'}
                                </Text>
                                <Switch
                                    value={isAuto}
                                    onValueChange={(v) =>
                                        handleModeChange(v ? 'AUTO' : 'MANUAL')
                                    }
                                    disabled={busy}
                                    trackColor={{ false: '#2563EB', true: COLORS.amber }}
                                    thumbColor="#F3F4F6"
                                    ios_backgroundColor="#2563EB"
                                />
                            </View>
                        </View>

                        <View style={styles.tile}>
                            <Text style={styles.tileLabel}>Bulb Status</Text>
                            <View style={styles.tileBottom}>
                                <Text
                                    style={[
                                        styles.tileValue,
                                        { color: lightOn ? EMERALD : OFF_GRAY },
                                    ]}
                                >
                                    {lightOn ? 'ON' : 'OFF'}
                                </Text>
                                <Switch
                                    value={lightOn}
                                    onValueChange={handleLightChange}
                                    disabled={busy || isAuto}
                                    trackColor={{ false: '#1F2937', true: '#10B981' }}
                                    thumbColor="#F3F4F6"
                                    ios_backgroundColor="#1F2937"
                                />
                            </View>
                        </View>
                    </View>

                    {isAuto ? (
                        <Text style={styles.hint}>
                            Switch to MANUAL to control the bulb yourself.
                        </Text>
                    ) : null}

                    {/* Auto fade timer */}
                    {isAuto ? (
                        <View style={styles.panel}>
                            <Text style={styles.panelTitle}>
                                {duration}s Light Fade Timer
                            </Text>
                            <Text style={styles.panelSub}>
                                Fading bulb intensity to 0%
                            </Text>

                            <View style={styles.timerRow}>
                                <View style={styles.ringWrap}>
                                    <Svg width={56} height={56} viewBox="0 0 36 36">
                                        <Circle
                                            cx="18"
                                            cy="18"
                                            r="15.9155"
                                            stroke="rgba(55, 65, 81, 0.5)"
                                            strokeWidth={3.5}
                                            fill="none"
                                        />
                                        <Circle
                                            cx="18"
                                            cy="18"
                                            r="15.9155"
                                            stroke={COLORS.amber}
                                            strokeWidth={3.5}
                                            strokeLinecap="round"
                                            strokeDasharray="100,100"
                                            strokeDashoffset={(1 - lightLevel) * 100}
                                            fill="none"
                                            transform="rotate(-90 18 18)"
                                        />
                                    </Svg>
                                    <Text style={styles.countdown}>
                                        {countdownLabel}
                                    </Text>
                                </View>

                                <View style={styles.timerInfo}>
                                    <View style={styles.levelRow}>
                                        <Text style={styles.levelLabel}>Light Level:</Text>
                                        <Text style={styles.levelValue}>{levelPercent}%</Text>
                                    </View>
                                    <View style={styles.barTrack}>
                                        <View
                                            style={[
                                                styles.barFill,
                                                { width: `${levelPercent}%` },
                                            ]}
                                        />
                                    </View>
                                    <Text style={styles.timerDesc}>{timerDesc}</Text>
                                </View>
                            </View>
                        </View>
                    ) : null}

                    {/* AI detection */}
                    <View style={styles.panel}>
                        <Text style={styles.panelTitle}>AI Person Detection</Text>
                        <Text
                            style={[
                                styles.detection,
                                { color: personDetected ? EMERALD : OFF_GRAY },
                            ]}
                        >
                            {personDetected ? 'Person Detected' : 'No Person Detected'}
                        </Text>
                        <Text style={styles.panelSub}>
                            Confidence: {(systemState.ai.confidence * 100).toFixed(1)}%
                        </Text>
                    </View>

                    {busy ? (
                        <ActivityIndicator
                            style={styles.activity}
                            color={COLORS.amber}
                        />
                    ) : null}
                </View>

                <Text style={styles.footer}>
                    Smart Light IoT Monitoring System
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    content: {
        padding: 20,
        paddingTop: 40,
        paddingBottom: 32,
    },
    inner: {
        width: '100%',
        maxWidth: 480,
        alignSelf: 'center',
        alignItems: 'center',
    },
    center: {
        flex: 1,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    loadingText: {
        marginTop: 12,
        color: COLORS.muted,
        fontSize: 14,
    },
    errorText: {
        color: '#F3F4F6',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    errorDetails: {
        color: COLORS.errorText,
        fontSize: 13,
        textAlign: 'center',
        marginTop: 6,
        marginBottom: 16,
    },
    primaryButton: {
        backgroundColor: COLORS.amber,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 32,
    },
    primaryButtonText: {
        color: COLORS.onAmber,
        fontSize: 15,
        fontWeight: '700',
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
        paddingHorizontal: 18,
        paddingTop: 40,
        paddingBottom: 20,
        shadowColor: COLORS.amber,
        shadowOpacity: 0.18,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 10 },
        elevation: 8,
    },
    heading: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.muted,
        textAlign: 'center',
        marginTop: 4,
    },
    status: {
        fontSize: 11,
        color: COLORS.amberSoft,
        textAlign: 'center',
        marginTop: 6,
        marginBottom: 16,
    },
    warning: {
        fontSize: 12,
        color: COLORS.errorText,
        backgroundColor: COLORS.errorBg,
        borderWidth: 1,
        borderColor: COLORS.errorBorder,
        borderRadius: 12,
        padding: 10,
        textAlign: 'center',
        marginBottom: 14,
    },
    tileRow: {
        flexDirection: 'row',
        gap: 12,
    },
    tile: {
        flex: 1,
        backgroundColor: 'rgba(17, 24, 39, 0.6)',
        borderWidth: 1,
        borderColor: '#1F2937',
        borderRadius: 14,
        padding: 14,
    },
    tileLabel: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: COLORS.muted,
        marginBottom: 10,
    },
    tileBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    tileValue: {
        fontSize: 15,
        fontWeight: '700',
    },
    hint: {
        fontSize: 12,
        color: COLORS.muted,
        textAlign: 'center',
        marginTop: 10,
    },
    panel: {
        backgroundColor: 'rgba(17, 24, 39, 0.8)',
        borderWidth: 1,
        borderColor: 'rgba(31, 41, 55, 0.9)',
        borderRadius: 14,
        padding: 14,
        marginTop: 14,
    },
    panelTitle: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: '#E5E7EB',
    },
    panelSub: {
        fontSize: 12,
        color: COLORS.muted,
        marginTop: 3,
    },
    timerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: 'rgba(3, 7, 18, 0.5)',
        borderWidth: 1,
        borderColor: 'rgba(31, 41, 55, 0.6)',
        borderRadius: 12,
        padding: 12,
        marginTop: 12,
    },
    ringWrap: {
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    countdown: {
        position: 'absolute',
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.amberSoft,
    },
    timerInfo: {
        flex: 1,
    },
    levelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    levelLabel: {
        fontSize: 12,
        color: COLORS.muted,
    },
    levelValue: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.amberSoft,
    },
    barTrack: {
        height: 8,
        backgroundColor: '#1F2937',
        borderRadius: 4,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        backgroundColor: COLORS.amber,
        borderRadius: 4,
    },
    timerDesc: {
        fontSize: 10,
        fontStyle: 'italic',
        color: COLORS.muted,
        marginTop: 6,
    },
    detection: {
        fontSize: 18,
        fontWeight: '700',
        marginTop: 8,
    },
    activity: {
        marginTop: 14,
    },
    footer: {
        marginTop: 18,
        fontSize: 12,
        color: OFF_GRAY,
        textAlign: 'center',
    },
});