
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
    const imageUrl =
      `${API_BASE_URL}/history/${eventId}/image`;

    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Image request failed: HTTP ${response.status}`
      );
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

  const loadHistory = useCallback(async (showLoader = true) => {

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
            sources[event.id] = await loadAuthenticatedImage(
              event.id,
              token
            );

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
      setError(
        err.message || 'Unable to load detection history.'
      );
    } finally {
      if (showLoader) {
        setLoading(false);
      }

      setRefreshing(false);
    }

  }, [view]);

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

    const confidence = Number(item.confidence);

    const imageSource = imageSources[item.id];

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

        {/* IMAGE EVIDENCE */}

        <View style={styles.imageContainer}>

          <Text style={styles.imageLabel}>
            Image Evidence
          </Text>

          {imageSource ? (

            <Pressable
              onPress={() => setSelectedImage(imageSource)}
            >

              <Image
                source={{ uri: imageSource }}
                style={styles.evidenceImage}
                resizeMode="contain"
                onLoad={() => console.log('Image loaded:', item.id)}
                onError={(error) =>
                  console.log(
                    'Image display failed:',
                    item.id,
                    error.nativeEvent
                  )
                }
              />

              <Text style={styles.tapText}>
                Tap to view full image
              </Text>

            </Pressable>

          ) : (

            <View style={styles.noImageContainer}>

              <Text style={styles.noImageText}>
                {item.image_path
                  ? 'Image unavailable'
                  : 'No image evidence'}
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

        <ActivityIndicator
          size="large"
          color="#2563EB"
        />

        <Text style={styles.loadingText}>
          Loading detection history...
        </Text>

      </View>

    );

  }

  // --------------------------------
  // MAIN SCREEN
  // --------------------------------

  return (

    <View style={styles.container}>

      <Text style={styles.heading}>
        Detection History
      </Text>

      <Text style={styles.subtitle}>
        AI detection events with image evidence
      </Text>


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
              view === filter.value &&
              styles.activeFilterButton,
            ]}
            onPress={() => setView(filter.value)}
          >
            <Text
              style={[
                styles.filterText,
                view === filter.value &&
                styles.activeFilterText,
              ]}
            >
              {filter.label}
            </Text>
          </Pressable>

        ))}

      </View>


      {error ? (

        <View style={styles.messageContainer}>

          <Text style={styles.errorText}>
            {error}
          </Text>

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
                Detection events will appear here
                when the camera detects a change.
              </Text>

            </View>

          }
        />

      )}

      {/* FULL-SCREEN IMAGE VIEWER */}

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

            <Text style={styles.closeButtonText}>
              ✕
            </Text>

          </Pressable>


          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullImage}
              resizeMode="contain"
              onLoad={() => console.log('Full-screen image loaded')}
              onError={(error) =>
                console.log(
                  'Full-screen image failed:',
                  error.nativeEvent
                )
              }
            />
          )}


        </View>

      </Modal>

    </View>

  );

}

// --------------------------------
// STYLES
// --------------------------------

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

  imageContainer: {
    marginTop: 16,
  },

  imageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 10,
  },

  evidenceImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },

  tapText: {
    fontSize: 12,
    color: '#2563EB',
    textAlign: 'center',
    marginTop: 7,
  },

  noImageContainer: {
    height: 90,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  noImageText: {
    fontSize: 13,
    color: '#94A3B8',
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

  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },

  fullImage: {
    width: '100%',
    height: '85%',
  },

  closeButton: {
    position: 'absolute',
    top: 45,
    right: 25,
    zIndex: 10,
    backgroundColor: '#334155',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },

  filterButton: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },

  activeFilterButton: {
    backgroundColor: '#2563EB',
  },

  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },

  activeFilterText: {
    color: '#FFFFFF',
  },

});
