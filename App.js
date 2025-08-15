import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, Text, View, Pressable, Image, ActivityIndicator, Alert, Platform, Dimensions, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import Slider from '@react-native-community/slider';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { StatusBar } from 'expo-status-bar';

const CANVAS_WIDTH = 2790; // Instagram Story target (9:16)
const CANVAS_HEIGHT = 4960;
const DEFAULT_CANVAS_COLOR = '#FFFFFF';

export default function App() {
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [hasMediaRead, setHasMediaRead] = useState(null);
  const [hasMediaWrite, setHasMediaWrite] = useState(null);
  const canvasColor = DEFAULT_CANVAS_COLOR;
  const [scale, setScale] = useState(1.0); // additional scale applied on top of contain-fit
  const [saving, setSaving] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [windowDimensions, setWindowDimensions] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });

  const viewShotRef = useRef(null);
  const canvasRef = useRef(null);

  // Listen for orientation changes and window resizing
  useEffect(() => {
    const updateDimensions = ({ window }) => {
      setWindowDimensions({ width: window.width, height: window.height });
    };

    const subscription = Dimensions.addEventListener('change', updateDimensions);
    return () => subscription?.remove();
  }, []);

  const requestPermissionsIfNeeded = useCallback(async () => {
    // Image picking (read)
    const pickerPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    setHasMediaRead(pickerPerm.status === 'granted');

    // MediaLibrary (save)
    const mlPerm = await MediaLibrary.requestPermissionsAsync();
    setHasMediaWrite(mlPerm.status === 'granted');
  }, []);

  const onPickImage = useCallback(async () => {
    try {
      if (hasMediaRead === null || hasMediaWrite === null) {
        await requestPermissionsIfNeeded();
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        quality: 1,
        allowsEditing: false,
        exif: false,

      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset) return;

      setSelectedAsset({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
      });
      setImageLoaded(false);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to pick image.');
    }
  }, [hasMediaRead, hasMediaWrite, requestPermissionsIfNeeded]);

  const onSave = useCallback(async () => {
    if (!selectedAsset || !imageLoaded) return;
    
    setSaving(true);
    
    try {
      // Web platform: Use Canvas API directly
      if (Platform.OS === 'web') {
        // Create an offscreen canvas
        const canvas = document.createElement('canvas');
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        const ctx = canvas.getContext('2d');
        
        // Fill with white background
        ctx.fillStyle = canvasColor;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        // Load and draw the image
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          img.onload = () => {
            // Calculate scaled dimensions
            const imgAspect = selectedAsset.width / selectedAsset.height;
            const canvasAspect = CANVAS_WIDTH / CANVAS_HEIGHT;
            
            let drawWidth, drawHeight;
            if (imgAspect > canvasAspect) {
              drawWidth = CANVAS_WIDTH * scale;
              drawHeight = (CANVAS_WIDTH / imgAspect) * scale;
            } else {
              drawHeight = CANVAS_HEIGHT * scale;
              drawWidth = (CANVAS_HEIGHT * imgAspect) * scale;
            }
            
            // Center the image
            const x = (CANVAS_WIDTH - drawWidth) / 2;
            const y = (CANVAS_HEIGHT - drawHeight) / 2;
            
            // Draw the image
            ctx.drawImage(img, x, y, drawWidth, drawHeight);
            resolve();
          };
          img.onerror = reject;
          img.src = selectedAsset.uri;
        });
        
        // Convert to blob and download
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
          link.download = `story-canvas-${timestamp}.jpg`;
          link.href = url;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          setSaving(false);
          Alert.alert('Success', 'Image downloaded! On iPhone: Open Files app → Downloads to save to Photos.');
        }, 'image/jpeg', 0.95);
        
      } else {
        // Native platforms: Use ViewShot
        await new Promise(resolve => setTimeout(resolve, 300));
        
        let uri;
        try {
          uri = await captureRef(canvasRef, {
            format: 'jpg',
            quality: 0.95,
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            result: 'tmpfile',
          });
        } catch (err) {
          console.log('Full resolution capture failed, trying lower resolution...');
          uri = await captureRef(canvasRef, {
            format: 'jpg',
            quality: 0.95,
            width: CANVAS_WIDTH / 2,
            height: CANVAS_HEIGHT / 2,
            result: 'tmpfile',
          });
        }
        
        if (hasMediaWrite === false) {
          const mlPerm = await MediaLibrary.requestPermissionsAsync();
          setHasMediaWrite(mlPerm.status === 'granted');
          if (mlPerm.status !== 'granted') {
            Alert.alert('Permission needed', 'Enable Photo Library access to save images.');
            setSaving(false);
            return;
          }
        }
        
        await MediaLibrary.saveToLibraryAsync(uri);
        setSaving(false);
        Alert.alert('Saved', 'Image saved to your Photos.');
      }
    } catch (err) {
      console.error('Save error:', err);
      setSaving(false);
      Alert.alert('Error', 'Failed to save image. Please try again.');
    }
  }, [selectedAsset, hasMediaWrite, imageLoaded, scale, canvasColor]);

  const imageAspectRatio = useMemo(() => {
    if (!selectedAsset) return 1;
    return selectedAsset.width / selectedAsset.height;
  }, [selectedAsset]);

  const imagePercentStyle = useMemo(() => {
    if (!selectedAsset) return { width: '0%', height: '0%' };
    const storyAspect = CANVAS_WIDTH / CANVAS_HEIGHT; // 9:16 constant
    const imgAspect = imageAspectRatio;

    let widthPercent = 100;
    let heightPercent = 100;
    if (imgAspect > storyAspect) {
      widthPercent = 100;
      heightPercent = (1 / imgAspect) * storyAspect * 100;
    } else {
      heightPercent = 100;
      widthPercent = (imgAspect / storyAspect) * 100;
    }

    return {
      width: `${widthPercent * scale}%`,
      height: `${heightPercent * scale}%`,
      alignSelf: 'center',
    };
  }, [selectedAsset, imageAspectRatio, scale]);

  // Calculate responsive canvas dimensions
  const responsiveCanvasStyle = useMemo(() => {
    const { width: screenWidth, height: screenHeight } = windowDimensions;
    const canvasAspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
    
    // Reserve space for controls and padding
    const controlsHeight = 280; // Approximate height for header + controls
    const paddingVertical = 32; // Total vertical padding
    const paddingHorizontal = 40; // Total horizontal padding
    
    const availableHeight = screenHeight - controlsHeight - paddingVertical;
    const availableWidth = screenWidth - paddingHorizontal;
    
    let canvasWidth, canvasHeight;
    
    // Calculate maximum dimensions that fit within available space
    if (availableWidth / availableHeight > canvasAspectRatio) {
      // Height is the limiting factor
      canvasHeight = Math.min(availableHeight, 600); // Max height of 600 for better UX
      canvasWidth = canvasHeight * canvasAspectRatio;
    } else {
      // Width is the limiting factor
      canvasWidth = Math.min(availableWidth, screenWidth * 0.9);
      canvasHeight = canvasWidth / canvasAspectRatio;
      
      // If calculated height exceeds available height, recalculate based on height
      if (canvasHeight > availableHeight) {
        canvasHeight = availableHeight;
        canvasWidth = canvasHeight * canvasAspectRatio;
      }
    }
    
    return {
      width: canvasWidth,
      height: canvasHeight,
      maxWidth: '100%',
      aspectRatio: canvasAspectRatio,
    };
  }, [windowDimensions]);

  // Determine if we need scrolling based on screen height
  const needsScrolling = windowDimensions.height < 700;

  const content = (
    <>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.title}>Story Canvas</Text>
      </View>

      <View style={styles.controls}>
        <Pressable style={styles.button} onPress={onPickImage}>
          <Text style={styles.buttonText}>{selectedAsset ? 'Change Photo' : 'Pick Photo'}</Text>
        </Pressable>

        <Pressable style={[styles.button, (!selectedAsset || !imageLoaded) && styles.buttonDisabled]} onPress={onSave} disabled={!selectedAsset || !imageLoaded || saving}>
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Save to Photos (2790×4960 JPG)</Text>}
        </Pressable>

        {/* Color swatches removed per request; default canvas color is white */}

        <View style={styles.sliderRow}>
          <Text style={styles.label}>Image scale: {scale.toFixed(2)}×</Text>
          <View style={styles.scaleButtonsRow}>
            {[0.85, 0.96, 1.0, 1.15].map((preset) => (
              <Pressable key={preset} onPress={() => setScale(preset)} style={[styles.presetButton, preset === 0.96 && styles.favoriteButton]}>
                <Text style={[styles.presetButtonText, preset === 0.96 && styles.favoriteButtonText]}>
                  {preset === 0.96 ? '96% ⭐' : `${(preset * 100).toFixed(0)}%`}
                </Text>
              </Pressable>
            ))}
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={2.0}
            value={scale}
            step={0.01}
            minimumTrackTintColor="#111827"
            maximumTrackTintColor="#9CA3AF"
            thumbTintColor="#111827"
            onValueChange={setScale}
          />
        </View>
      </View>

      <View style={styles.previewWrapper}>
        <ViewShot
          ref={canvasRef}
          style={[styles.viewShot, responsiveCanvasStyle]}
          collapsable={false}
        >
          <View
            style={[
              styles.canvas,
              { backgroundColor: canvasColor },
            ]}
          >
            {selectedAsset ? (
              <Image
                source={{ uri: selectedAsset.uri }}
                style={[styles.image, imagePercentStyle]}
                onLoad={() => setImageLoaded(true)}
                resizeMode="contain"
                accessible
                accessibilityLabel="Selected image on story canvas"
              />
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>Pick a photo to start</Text>
              </View>
            )}
          </View>
        </ViewShot>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {needsScrolling ? (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={styles.container}>
          {content}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  controls: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  button: {
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  label: {
    color: '#374151',
    fontWeight: '600',
  },
  sliderRow: {
    gap: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  scaleButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  favoriteButton: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  presetButtonText: {
    color: '#111827',
    fontWeight: '600',
  },
  favoriteButtonText: {
    color: '#92400E',
  },
  previewWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200, // Ensure minimum height for canvas
  },
  viewShot: {
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  canvas: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    alignSelf: 'center',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#6B7280',
  },
});
