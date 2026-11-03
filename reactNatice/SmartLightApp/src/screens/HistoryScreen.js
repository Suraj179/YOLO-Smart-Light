
import React, { useCallback, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { apiRequest } from '../services/api';
import { getToken } from '../services/auth';

export default function HistoryScreen() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    // Fetch detection events from the protected backend endpoint.
    const loadHistory = useCallback(async (showLoader = true) => {
        if (showLoader) {
            setLoading(true);
        }

        setError('');

        try {
            const token = await getToken();

            if (!token) {
                throw new Error('Please log in to view detection history.');
            }

            const data = await apiRequest('/history', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            setEvents(data.events || []);
        } catch (err) {
            setError(err.message || 'Unable to load detection history.');
        } finally {
            if (showLoader) {
                setLoading(false);
            }

            setRefreshing(false);
        }
    }, []);

    // Reload history whenever the user opens this tab.
    useFocusEffect(
        useCallback(() => {
            loadHistory(true);
        }, [loadHistory])
    );

    // Pull down on the list to refresh it.
    const handleRefresh = () => {
        setRefreshing(true);
        loadHistory(false);
    };

    const formatDate = (dateString) => {
        if (!dateString) {
            return 'Time unavailable';
        }

        const date = new Date(dateString);

        if (Number.isNaN(date.getTime())) {
            return dateString;
        }

        return date.toLocaleString();
    };

    const renderEvent = ({ item }) => {
        const detected = Boolean(item.person_detected);
        const confidence = Number(item.confidence);

        return (
            <View style={styles.eventCard}>
                <View style={styles.eventHeader}>
                    <View style={styles.eventTitleContainer}>
                        <Text style={styles.eventTitle}>
                            {detected
                                ? 'Person Detected'
                                : 'Person Not Detected'}
                        </Text>

                        <Text style={styles.eventDate}>
                            {formatDate(item.detected_at)}
                        </Text>
                    </View>

                    <View
                        style={[
                            styles.statusBadge,
                            detected
                                ? styles.detectedBadge
                                : styles.absentBadge,
                        ]}
                    >
                        <Text
                            style={[
                                styles.statusText,
                                detected
                                    ? styles.detectedText
                                    : styles.absentText,
                            ]}
                        >
                            {detected ? 'DETECTED' : 'ABSENT'}
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailsRow}>
                    <Text style={styles.detailLabel}>
                        Event ID
                    </Text>
                    <Text style={styles.detailValue}>
                        #{item.id}
                    </Text>
                </View>

                <View style={styles.detailsRow}>
                    <Text style={styles.detailLabel}>
                        AI Confidence
                    </Text>
                    <Text style={styles.detailValue}>
                        {Number.isFinite(confidence)
                            ? `${(confidence * 100).toFixed(1)}%`
                            : 'N/A'}
                    </Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.loadingText}>
                    Loading detection history...
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.heading}>
                Detection History
            </Text>

            <Text style={styles.subtitle}>
                Recent changes in AI person detection
            </Text>

            {error ? (
                <View style={styles.messageContainer}>
                    <Text style={styles.errorText}>{error}</Text>

                    <Pressable
                        style={styles.retryButton}
                        onPress={() => loadHistory(true)}
                    >
                        <Text style={styles.retryButtonText}>
                            Try Again
                        </Text>
                    </Pressable>
                </View>
            ) : (
                <FlatList
                    data={events}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderEvent}
                    contentContainerStyle={
                        events.length === 0
                            ? styles.emptyList
                            : styles.listContent
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={['#2563EB']}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.messageContainer}>
                            <Text style={styles.emptyTitle}>
                                No detection events yet
                            </Text>

                            <Text style={styles.emptyText}>
                                Detection changes recorded by the
                                backend will appear here.
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    heading: {
        fontSize: 25,
        fontWeight: '700',
        color: '#0F172A',
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 6,
        marginBottom: 20,
    },
    listContent: {
        paddingBottom: 24,
    },
    emptyList: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    eventCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    eventHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 10,
    },
    eventTitleContainer: {
        flex: 1,
    },
    eventTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
    },
    eventDate: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 5,
    },
    statusBadge: {
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 6,
    },
    detectedBadge: {
        backgroundColor: '#DCFCE7',
    },
    absentBadge: {
        backgroundColor: '#F1F5F9',
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
    },
    detectedText: {
        color: '#166534',
    },
    absentText: {
        color: '#475569',
    },
    divider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 14,
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    detailLabel: {
        fontSize: 13,
        color: '#64748B',
    },
    detailValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#334155',
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
    },
    loadingText: {
        marginTop: 12,
        color: '#64748B',
    },
    messageContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#334155',
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 21,
    },
    errorText: {
        color: '#B91C1C',
        textAlign: 'center',
        lineHeight: 21,
    },
    retryButton: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        marginTop: 14,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
});
