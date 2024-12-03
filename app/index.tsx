import { StyleSheet, TouchableOpacity, Text } from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import { View } from '@/components/Themed';
import { useEffect, useState, useRef } from 'react';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

interface LocationState {
  latitude: number;
  longitude: number;
}

interface Route {
  id: number;
  name: string;
  endLocation: LocationState;
}

interface RouteCoordinates {
  latitude: number;
  longitude: number;
}

const ROUTES: Route[] = [
  {
    id: 1,
    name: "Cathedral Rock Trail",
    endLocation: { latitude: 34.8222, longitude: -111.7901 }
  },
  {
    id: 2,
    name: "Bell Rock Pathway",
    endLocation: { latitude: 34.8032, longitude: -111.7761 }
  },
  {
    id: 3,
    name: "Devil's Bridge Trail",
    endLocation: { latitude: 34.8837, longitude: -111.8158 }
  },
  {
    id: 4,
    name: "Soldier Pass Trail",
    endLocation: { latitude: 34.8743, longitude: -111.7967 }
  }
];

export default function HomeScreen() {
  const mapRef = useRef<MapView>(null);
  const [location, setLocation] = useState<LocationState | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<RouteCoordinates[]>([]);

  const fetchRouteCoordinates = async (start: LocationState, end: LocationState) => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/foot/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`
      );
      const data = await response.json();
      
      if (data.routes && data.routes[0]) {
        const routeCoords = data.routes[0].geometry.coordinates.map(
          (coord: [number, number]) => ({
            latitude: coord[1],
            longitude: coord[0],
          })
        );
        setRouteCoordinates(routeCoords);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      // Fallback to straight line if route fetch fails
      setRouteCoordinates([
        start,
        end,
      ]);
    }
  };

  useEffect(() => {
    if (selectedRoute) {
      let locationSubscription: any;

      (async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Permission to access location was denied');
          return;
        }

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10,
          },
          async (newLocation) => {
            const currentPosition = {
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
            };
            
            setLocation(currentPosition);
            
            // Fetch new route whenever location updates
            await fetchRouteCoordinates(
              currentPosition,
              selectedRoute.endLocation
            );

            const distance = calculateDistance(
              currentPosition,
              selectedRoute.endLocation
            );

            if (distance < 0.05) {
              setRouteCoordinates([]);
            }
          }
        );
      })();

      return () => {
        if (locationSubscription) {
          locationSubscription.remove();
        }
      };
    }
  }, [selectedRoute]);

  // Helper function to calculate distance in kilometers
  const calculateDistance = (point1: LocationState, point2: LocationState) => {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const centerOnLocation = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  if (!selectedRoute) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Select a Bike Route</Text>
        {ROUTES.map((route) => (
          <TouchableOpacity
            key={route.id}
            style={styles.routeButton}
            onPress={() => setSelectedRoute(route)}
          >
            <Text style={styles.routeButtonText}>{route.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: location?.latitude ?? 34.8697,
          longitude: location?.longitude ?? -111.7609,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        <UrlTile 
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
        />
        {location && (
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title="You are here"
            description="Your current location"
          />
        )}
        <Marker
          coordinate={{
            latitude: selectedRoute.endLocation.latitude,
            longitude: selectedRoute.endLocation.longitude,
          }}
          title={selectedRoute.name}
          description="Route destination"
          pinColor="blue"
        />
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#2196F3"
            strokeWidth={3}
          />
        )}
      </MapView>
      <TouchableOpacity
        style={styles.floatingBackButton}
        onPress={() => setSelectedRoute(null)}
      >
        <Ionicons name="arrow-back" size={24} color="white" />
        <Text style={styles.floatingBackText}>Back</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.centerButton}
        onPress={centerOnLocation}
      >
        <Ionicons name="locate" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  floatingBackButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  floatingBackText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  routeButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  routeButtonText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  centerButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
}); 