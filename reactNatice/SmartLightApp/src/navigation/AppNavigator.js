import React, { useEffect, useState } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';

import { getCurrentUser } from '../services/auth';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// --------------------------------
// CUSTOM THEMED TAB ICONS (SVG)
// --------------------------------
function DashboardIcon({ focused }) {
  const color = focused ? '#6366f1' : '#64748b';
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="7" height="7" rx="2" fill={color} />
      <Rect x="14" y="3" width="7" height="7" rx="2" fill={color} opacity={focused ? 1 : 0.6} />
      <Rect x="14" y="14" width="7" height="7" rx="2" fill={color} />
      <Rect x="3" y="14" width="7" height="7" rx="2" fill={color} opacity={focused ? 1 : 0.6} />
    </Svg>
  );
}

function HistoryIcon({ focused }) {
  const color = focused ? '#6366f1' : '#64748b';
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <Path d="M12 7v5l3 3" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

function ProfileIcon({ focused }) {
  const color = focused ? '#6366f1' : '#64748b';
  const bulbColor = focused ? '#facc15' : '#475569';
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      {/* Mini Mosquitto Profile Silhouette */}
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2" fill={focused ? 'rgba(99, 102, 241, 0.2)' : 'transparent'} />
      <Path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Tiny Glowing Tail Indicator */}
      <Circle cx="18" cy="6" r="3" fill={bulbColor} />
    </Svg>
  );
}

// --------------------------------
// MAIN TAB NAVIGATOR
// --------------------------------
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ focused }) => <DashboardIcon focused={focused} />,
        }}
      />

      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'History',
          tabBarIcon: ({ focused }) => <HistoryIcon focused={focused} />,
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <ProfileIcon focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// Custom Navigation Dark Theme Configuration
const CustomNavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0f172a',
    card: '#1e293b',
    text: '#f8fafc',
    border: 'rgba(255, 255, 255, 0.08)',
    primary: '#6366f1',
  },
};

export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    async function checkAuthentication() {
      const user = await getCurrentUser();
      setInitialRoute(user ? 'MainTabs' : 'Login');
    }

    checkAuthentication();
  }, []);

  // Wait until the saved token has been checked.
  if (initialRoute === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={CustomNavigationTheme}>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// --------------------------------
// DARK GLASSMORPHISM STYLESHEET
// --------------------------------
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },

  /* FLOATING BOTTOM BAR */
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 16,
    right: 16,
    height: 64,
    backgroundColor: 'rgba(30, 41, 59, 0.92)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  tabBarItem: {
    borderRadius: 16,
    marginHorizontal: 4,
    paddingVertical: 2,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});