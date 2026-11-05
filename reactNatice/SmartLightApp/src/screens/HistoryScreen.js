import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Image,
  Modal,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { apiRequest, API_BASE_URL } from '../services/api';
import { getToken } from '../services/auth';

export default function HistoryScreen() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Store image URLs and authentication headers.
  const [imageSources, setImageSources] = useState({});

  // Store the image selected for full-screen viewing.
  const [selectedImage, setSelectedImage] = useState(null);

  const [view, setView] = useState('recent');

  // --------------------------------
  // FETCH HISTORY
  // --------------------------------
  const loadAuthenticatedImage = async (eventId, token) => {
    const imageUrl = `${API_BASE_URL}/history/${eventId}/image`;

    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Image request failed: HTTP ${response.status}`);
    }

    const imageBlob = await response.blob();

    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        const result = reader.result;
        resolve(result.split(',')[1]);
      };

      reader.onerror = reject;
      reader.readAsDataURL(imageBlob);
    });

    return `data:image/jpeg;base64,${base64}`;
  };

  const loadHistory = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setLoading(true);
      }

      setError('');

      try {
        const token = await getToken();

        if (!token) {
          throw new Error('Please log in to view history.');
        }

        // Build the backend query based on the selected filter.
        let endpoint = '/history';

        if (view === 'all') {
          endpoint += '?all=true';
        } else if (view === 'detected') {
          endpoint += '?status=detected';
        } else if (view === 'absent') {
          endpoint += '?status=absent';
        }

        const data = await apiRequest(endpoint, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const fetchedEvents = data.events || [];

        setEvents(fetchedEvents);

        // Prepare authenticated image sources.
        const sources = {};

        await Promise.all(
          fetchedEvents.map(async (event) => {
            if (!event.image_path) return;

            try {
              sources[event.id] = await loadAuthenticatedImage(event.id, token);
            } catch (imageError) {
              console.log(
                `Image loading failed for event ${event.id}:`,
                imageError.message
              );
            }
          })
        );

        setImageSources(sources);
      } catch (err) {
        setError(err.message || 'Unable to load detection history.');
      } finally {
        if (showLoader) {
          setLoading(false);
        }

        setRefreshing(false);
      }
    },
    [view]
  );

  // Reload history when the user opens the tab.
  useFocusEffect(
    useCallback(() => {
      loadHistory(true);
    }, [loadHistory])
  );

  // --------------------------------
  // REFRESH
  // --------------------------------
  const handleRefresh = () => {
    setRefreshing(true);
    loadHistory(false);
  };

  // --------------------------------
  // DATE FORMATTING
  // --------------------------------
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

  // --------------------------------
  // HISTORY CARD
  // --------------------------------
  const renderEvent = ({ item }) => {
    const detected = Boolean(item.person_detected);
    const rawConfidence = Number(item.confidence);
    const imageSource = imageSources[item.id];

    // Safely calculate confidence percentage
    const formattedConfidence = Number.isFinite(rawConfidence)
      ? `${(rawConfidence * 100).toFixed(1)}%`
      : 'N/A';

    return (
      <View style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <View style={styles.eventTitleContainer}>
            <Text style={styles.eventTitle}>
              {detected ? 'Person Detected' : 'Person Not Detected'}
            </Text>
            <Text style={styles.eventDate}>{formatDate(item.detected_at)}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              detected ? styles.detectedBadge : styles.absentBadge,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                detected ? styles.detectedDot : styles.absentDot,
              ]}
            />
            <Text
              style={[
                styles.statusText,
                detected ? styles.detectedText : styles.absentText,
              ]}
            >
              {detected ? 'DETECTED' : 'ABSENT'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailsRow}>
          <Text style={styles.detailLabel}>Event ID</Text>
          <Text style={styles.detailValue}>#{item.id}</Text>
        </View>

        <View style={styles.detailsRow}>
          <Text style={styles.detailLabel}>AI Confidence</Text>
          <Text style={styles.detailValue}>{formattedConfidence}</Text>
        </View>

        {/* IMAGE EVIDENCE */}
        <View style={styles.imageContainer}>
          <Text style={styles.imageLabel}>Image Evidence</Text>

          {imageSource ? (
            <Pressable
              style={styles.imageWrapper}
              onPress={() => setSelectedImage(imageSource)}
            >
              <Image
                source={{ uri: imageSource }}
                style={styles.evidenceImage}
                resizeMode="cover"
                onLoad={() => console.log('Image loaded:', item.id)}
                onError={(error) =>
                  console.log(
                    'Image display failed:',
                    item.id,
                    error.nativeEvent
                  )
                }
              />
              <View style={styles.imageOverlay}>
                <Text style={styles.tapText}>Tap to view full image</Text>
              </View>
            </Pressable>
          ) : (
            <View style={styles.noImageContainer}>
              <Text style={styles.noImageText}>
                {item.image_path ? 'Image loading...' : 'No image evidence'}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // --------------------------------
  // LOADING SCREEN
  // --------------------------------
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading detection history...</Text>
      </View>
    );
  }

  // --------------------------------
  // MAIN SCREEN
  // --------------------------------
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header Section */}
      <View style={styles.headerContainer}>
        <Text style={styles.heading}>Detection History</Text>
        <Text style={styles.subtitle}>AI detection events with image evidence</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {[
          { label: 'Recent 25', value: 'recent' },
          { label: 'All', value: 'all' },
          { label: 'Detected', value: 'detected' },
          { label: 'Absent', value: 'absent' },
        ].map((filter) => (
          <Pressable
            key={filter.value}
            style={[
              styles.filterButton,
              view === filter.value && styles.activeFilterButton,
            ]}
            onPress={() => setView(filter.value)}
          >
            <Text
              style={[
                styles.filterText,
                view === filter.value && styles.activeFilterText,
              ]}
            >
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content Area */}
      {error ? (
        <View style={styles.messageContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => loadHistory(true)}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderEvent}
          contentContainerStyle={
            events.length === 0 ? styles.emptyList : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#6366f1"
              colors={['#6366f1']}
            />
          }
          ListEmptyComponent={
            <View style={styles.messageContainer}>
              <Text style={styles.emptyTitle}>No detection events yet</Text>
              <Text style={styles.emptyText}>
                Detection events will appear here when the camera detects a change.
              </Text>
            </View>
          }
        />
      )}

      {/* FULL-SCREEN IMAGE VIEWER MODAL */}
      <Modal
        visible={selectedImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <StatusBar hidden />
        <View style={styles.modalContainer}>
          <Pressable
            style={styles.closeButton}
            onPress={() => setSelectedImage(null)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>

          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullImage}
              resizeMode="contain"
              onLoad={() => console.log('Full-screen image loaded')}
              onError={(error) =>
                console.log('Full-screen image failed:', error.nativeEvent)
              }
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

// --------------------------------
// DARK GLASSMORPHISM STYLESHEET
// --------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // Dark Slate Blue / Obsidian theme
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 12,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 14,
    fontSize: 14,
  },

  /* FILTER TABS */
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  activeFilterButton: {
    backgroundColor: '#6366f1',
    borderColor: '#818cf8',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  filterText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  activeFilterText: {
    color: '#ffffff',
    fontWeight: '700',
  },

  /* LIST & EVENT CARDS */
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  eventCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.65)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventTitleContainer: {
    flex: 1,
    paddingRight: 8,
  },
  eventTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  eventDate: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },

  /* BADGES */
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  detectedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  absentBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  detectedDot: {
    backgroundColor: '#10b981',
  },
  absentDot: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  detectedText: {
    color: '#34d399',
  },
  absentText: {
    color: '#f87171',
  },

  /* CARD DETAILS */
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 14,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    color: '#94a3b8',
    fontSize: 13,
  },
  detailValue: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
  },

  /* IMAGE EVIDENCE */
  imageContainer: {
    marginTop: 10,
  },
  imageLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  imageWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  evidenceImage: {
    width: '100%',
    height: 180,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingVertical: 6,
    alignItems: 'center',
  },
  tapText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '500',
  },
  noImageContainer: {
    height: 80,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  noImageText: {
    color: '#64748b',
    fontSize: 13,
    fontStyle: 'italic',
  },

  /* ERROR & EMPTY STATES */
  messageContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  /* MODAL */
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  fullImage: {
    width: '100%',
    height: '85%',
  },
});