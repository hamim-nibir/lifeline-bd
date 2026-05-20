// This file contains the improved fire-dispatch-status screen
// Integration code - copy the render section from the original file with these improvements:

/*
IMPROVEMENTS TO APPLY:

1. Add Progress Indicator at the top showing:
   - Service Type (completed)
   - Incident Details (in-progress or completed)
   - Location & Station (completed)
   - Tracking & Status (current)

2. Use StatusTimeline component instead of custom timeline rendering

3. Use IncidentDetailsForm component for better form UX

4. Add real-time status notifications with haptic feedback

5. Better header with emergency info prominently displayed

6. Loading states with meaningful messages

7. Better map rendering with live updates

8. Confirmation modal for status updates

9. Better button styles and accessibility

10. Live tracking indicator showing progress

REPLACEMENT CODE FOR RETURN STATEMENT:

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      {/* Progress Indicator */}
      <ProgressIndicator
        steps={[
          { label: "Service", completed: true },
          { label: "Details", completed: currentStepIndex > 0 },
          { label: "Location", completed: currentStepIndex > 1 },
          { label: "Tracking", completed: currentStepIndex > 2 },
        ]}
        currentStep={Math.min(currentStepIndex + 2, 3)}
      />

      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Fire Emergency Response</Text>
          <Text style={styles.headerSubtitle}>{dispatch?.serviceTitle}</Text>
          {dispatch && (
            <Text style={styles.etaText}>
              🕐 ETA: {dispatch.etaText ?? "Calculating..."}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.callBtn} onPress={callFire} activeOpacity={0.7}>
          <Text style={styles.callPhone}>📞</Text>
          <Text style={styles.callBtnText}>999</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#E74C3C" />
          <Text style={styles.loadingText}>Loading incident details...</Text>
        </View>
      ) : !dispatch ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🔥</Text>
          <Text style={styles.emptyTitle}>Incident Not Found</Text>
          <Text style={styles.emptySub}>
            The dispatch record may have been deleted or expired.
          </Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          {/* Status Timeline */}
          <StatusTimeline
            events={statusTimeline}
            currentStatus={STATUS_STEPS[currentStepIndex]?.key ?? "received"}
          />

          {/* Map Section */}
          <View style={styles.mapCard}>
            <Text style={styles.cardTitle}>Live Location Tracking</Text>
            <View style={styles.mapInfo}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Distance</Text>
                <Text style={styles.infoValue}>
                  {dispatch.distanceKm.toFixed(1)} km
                </Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>ETA</Text>
                <Text style={styles.infoValue}>{dispatch.etaText}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Status</Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: getStatusColor(STATUS_STEPS[currentStepIndex]?.key ?? "received") },
                  ]}
                >
                  {STATUS_STEPS[currentStepIndex]?.label ?? "Received"}
                </Text>
              </View>
            </View>

            {mapCoords ? (
              <View style={styles.mapWrap}>
                <MapView
                  style={styles.mapView}
                  initialRegion={mapCoords.region}
                  scrollEnabled={!isNarrow}
                  rotateEnabled={false}
                  pitchEnabled={false}
                >
                  <Marker
                    coordinate={{
                      latitude: mapCoords.uLat,
                      longitude: mapCoords.uLng,
                    }}
                    title="📍 Your Location"
                    pinColor="#3498DB"
                  />
                  <Marker
                    coordinate={{
                      latitude: mapCoords.sLat,
                      longitude: mapCoords.sLng,
                    }}
                    title="🚒 Fire Station"
                    description={dispatch.selectedStationName}
                    pinColor="#E74C3C"
                  />
                  <Polyline
                    coordinates={[
                      { latitude: mapCoords.sLat, longitude: mapCoords.sLng },
                      { latitude: mapCoords.uLat, longitude: mapCoords.uLng },
                    ]}
                    strokeColor="#E74C3C"
                    strokeWidth={2}
                    lineDashPattern={[8, 4]}
                  />
                </MapView>
              </View>
            ) : (
              <View style={styles.mapPlaceholder}>
                <Text style={styles.mapPlaceholderText}>
                  Location data not available
                </Text>
              </View>
            )}

            {dispatch.mapsLink && (
              <TouchableOpacity
                style={styles.openMapBtn}
                onPress={() => Linking.openURL(dispatch.mapsLink)}
              >
                <Text style={styles.openMapBtnText}>🗺️ Open Full Map</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Incident Details Form */}
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Incident Details</Text>
            <IncidentDetailsForm
              initialData={incidentDetails}
              onDataChange={setIncidentDetails}
              contactNumberSuggestion={dispatch?.incidentDetails?.contactNumber}
            />
          </View>

          {/* Station Info */}
          <View style={styles.stationInfoCard}>
            <Text style={styles.cardTitle}>Assigned Station</Text>
            <View style={styles.stationInfo}>
              <Text style={styles.stationLabel}>🚒 {dispatch.selectedStationName}</Text>
              <Text style={styles.stationAddress}>{dispatch.locationText}</Text>
              <Text style={styles.stationDistance}>
                Distance: {dispatch.distanceKm.toFixed(1)} km
              </Text>
            </View>
          </View>

          {/* Update Status Button */}
          <TouchableOpacity
            style={[
              styles.updateBtn,
              {
                opacity: saving ? 0.7 : 1,
                backgroundColor: isFinal ? "#95A5A6" : "#E74C3C",
              },
            ]}
            disabled={saving || isFinal}
            onPress={() => setShowingConfirmation(true)}
            activeOpacity={0.8}
          >
            <ActivityIndicator
              animating={saving}
              color="white"
              style={{ marginRight: saving ? 8 : 0 }}
            />
            <Text style={styles.updateBtnText}>
              {isFinal
                ? "✓ Incident Contained"
                : saving
                ? "Updating..."
                : `Next: ${STATUS_STEPS[currentStepIndex + 1]?.label ?? "Complete"}`}
            </Text>
          </TouchableOpacity>

          {currentStepIndex >= 2 && !isFinal && (
            <View style={styles.enrouteNotice}>
              <Text style={styles.enrouteNoticeText}>
                ✓ Emergency services are en route to your location
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showingConfirmation}
        title="Update Status?"
        message={`Move dispatch status to: ${
          STATUS_STEPS[currentStepIndex + 1]?.label ?? "Complete"
        }?`}
        icon="✓"
        confirmText="Confirm Update"
        cancelText="Cancel"
        onConfirm={advanceIncident}
        onCancel={() => setShowingConfirmation(false)}
        isLoading={saving}
      />
    </ScrollView>
  );
*/
