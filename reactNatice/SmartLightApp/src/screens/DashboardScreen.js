
import React, { useCallback, useEffect, useState } from 'react';

import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';

import {
    getSystemState,
    updateMode,
    updateLight,
} from '../services/smartLight';

export default function DashboardScreen() {
    const [systemState, setSystemState] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

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
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.loadingText}>
                    Loading Smart Light...
                </Text>
            </View>
        );
    }

    if (!systemState) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>
                    Unable to load Smart Light status.
                </Text>
                <Text style={styles.errorDetails}>{error}</Text>

                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={refreshState}
                >
                    <Text style={styles.buttonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const personDetected = systemState.ai.personDetected;
    const lightOn = systemState.light.state;
    const isAuto = systemState.mode === 'AUTO';

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.heading}>
                Smart Light Dashboard
            </Text>

            <Text style={styles.subtitle}>
                Monitor and control your room lighting
            </Text>

            {error ? (
                <Text style={styles.warning}>
                    Connection interrupted. Displaying last received data.
                </Text>
            ) : null}

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Operating Mode</Text>

                <Text style={styles.modeValue}>
                    {systemState.mode}
                </Text>

                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[
                            styles.modeButton,
                            isAuto && styles.selectedButton,
                        ]}
                        onPress={() => handleModeChange('AUTO')}
                        disabled={busy}
                    >
                        <Text
                            style={[
                                styles.modeButtonText,
                                isAuto && styles.selectedButtonText,
                            ]}
                        >
                            AUTO
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.modeButton,
                            !isAuto && styles.selectedButton,
                        ]}
                        onPress={() => handleModeChange('MANUAL')}
                        disabled={busy}
                    >
                        <Text
                            style={[
                                styles.modeButtonText,
                                !isAuto && styles.selectedButtonText,
                            ]}
                        >
                            MANUAL
                        </Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.description}>
                    {isAuto
                        ? 'YOLO detection controls the light.'
                        : 'Use the buttons below to control the light.'}
                </Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>
                    AI Person Detection
                </Text>

                <Text
                    style={[
                        styles.status,
                        {
                            color: personDetected
                                ? '#16A34A'
                                : '#64748B',
                        },
                    ]}
                >
                    {personDetected
                        ? 'Person Detected'
                        : 'No Person Detected'}
                </Text>

                <Text style={styles.description}>
                    Confidence: {(systemState.ai.confidence * 100).toFixed(1)}%
                </Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Room Light</Text>

                <Text
                    style={[
                        styles.lightValue,
                        {
                            color: lightOn ? '#16A34A' : '#64748B',
                        },
                    ]}
                >
                    {lightOn ? 'ON' : 'OFF'}
                </Text>

                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[
                            styles.lightButton,
                            styles.onButton,
                        ]}
                        onPress={() => handleLightChange(true)}
                        disabled={busy || isAuto}
                    >
                        <Text style={styles.buttonText}>Turn ON</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.lightButton,
                            styles.offButton,
                        ]}
                        onPress={() => handleLightChange(false)}
                        disabled={busy || isAuto}
                    >
                        <Text style={styles.buttonText}>Turn OFF</Text>
                    </TouchableOpacity>
                </View>

                {isAuto ? (
                    <Text style={styles.hint}>
                        Switch to MANUAL to enable light controls.
                    </Text>
                ) : null}
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>
                    Automatic OFF Timer
                </Text>

                <Text style={styles.timerValue}>
                    {systemState.timer.running
                        ? `${systemState.timer.remainingSeconds} seconds`
                        : 'Not Running'}
                </Text>

                <Text style={styles.description}>
                    Configured delay: {systemState.timer.durationSeconds} seconds
                </Text>
            </View>

            {busy ? (
                <ActivityIndicator
                    style={styles.activity}
                    color="#2563EB"
                />
            ) : null}

            <Text style={styles.footer}>
                Smart Light IoT Monitoring System
            </Text>
        </ScrollView>
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
        padding: 20,
    },

    heading: {
        fontSize: 25,
        fontWeight: 'bold',
        color: '#1E293B',
        marginTop: 15,
    },

    subtitle: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 5,
        marginBottom: 20,
    },

    card: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },

    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 12,
    },

    modeValue: {
        fontSize: 27,
        fontWeight: 'bold',
        color: '#2563EB',
    },

    status: {
        fontSize: 22,
        fontWeight: 'bold',
    },

    lightValue: {
        fontSize: 30,
        fontWeight: 'bold',
    },

    timerValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2563EB',
    },

    description: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 8,
    },

    buttonRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 15,
    },

    modeButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#2563EB',
        alignItems: 'center',
    },

    selectedButton: {
        backgroundColor: '#2563EB',
    },

    modeButtonText: {
        color: '#2563EB',
        fontWeight: 'bold',
    },

    selectedButtonText: {
        color: '#FFFFFF',
    },

    lightButton: {
        flex: 1,
        padding: 13,
        borderRadius: 8,
        alignItems: 'center',
    },

    onButton: {
        backgroundColor: '#16A34A',
    },

    offButton: {
        backgroundColor: '#DC2626',
    },

    primaryButton: {
        backgroundColor: '#2563EB',
        padding: 12,
        borderRadius: 8,
        marginTop: 15,
    },

    buttonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },

    hint: {
        color: '#B45309',
        fontSize: 13,
        marginTop: 12,
    },

    loadingText: {
        marginTop: 12,
        color: '#64748B',
    },

    errorText: {
        color: '#DC2626',
        fontWeight: 'bold',
        textAlign: 'center',
    },

    errorDetails: {
        color: '#64748B',
        marginTop: 10,
        textAlign: 'center',
    },

    warning: {
        color: '#B45309',
        backgroundColor: '#FEF3C7',
        padding: 10,
        borderRadius: 8,
        marginBottom: 12,
    },

    activity: {
        marginTop: 5,
    },

    footer: {
        textAlign: 'center',
        color: '#94A3B8',
        fontSize: 12,
        marginVertical: 20,
    },
});
