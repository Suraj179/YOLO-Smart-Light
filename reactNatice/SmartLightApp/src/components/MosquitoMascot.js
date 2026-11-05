import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable } from 'react-native';
import Svg, {
    Circle,
    Defs,
    Ellipse,
    G,
    Line,
    LinearGradient,
    Path,
    RadialGradient,
    Stop,
} from 'react-native-svg';

// Coordinate space of the original design.
const VB_W = 200;
const VB_H = 190;

const BULB_PATH =
    'M 82 100 C 65 108, 55 125, 60 148 C 65 170, 85 185, 100 185 C 115 185, 135 170, 140 148 C 145 125, 135 108, 118 100 Z';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/**
 * Animated mosquito with a glowing lightbulb abdomen.
 *
 * Props
 *  - width:      rendered width in px (height scales automatically)
 *  - shy:        true -> mosquito covers its eyes (use while a password field is focused)
 *  - lookX/lookY: -1..1, where the pupils look (e.g. follow typing progress)
 *  - busy:       true -> bulb pulses faster (use while a request is in flight)
 *  - lightLevel: 0..1, brightness of the bulb (1 = fully lit, 0 = off)
 */
export default function MosquitoMascot({
    width = 220,
    shy = false,
    lookX = 0,
    lookY = 0,
    busy = false,
    lightLevel = 1,
}) {
    const s = width / VB_W;
    const height = VB_H * s;

    const float = useRef(new Animated.Value(0)).current;
    const flap = useRef(new Animated.Value(0)).current;
    const glow = useRef(new Animated.Value(0)).current;
    const shyAnim = useRef(new Animated.Value(0)).current;
    const tap = useRef(new Animated.Value(1)).current;
    const level = useRef(new Animated.Value(clamp(lightLevel, 0, 1))).current;

    // Gentle hovering.
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(float, {
                    toValue: 1,
                    duration: 2250,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(float, {
                    toValue: 0,
                    duration: 2250,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [float]);

    // Wing flapping.
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(flap, {
                    toValue: 1,
                    duration: 70,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(flap, {
                    toValue: 0,
                    duration: 70,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [flap]);

    // Bulb glow pulse (faster while busy).
    useEffect(() => {
        const half = busy ? 280 : 1400;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(glow, {
                    toValue: 1,
                    duration: half,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(glow, {
                    toValue: 0,
                    duration: half,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [glow, busy]);

    // Cover / uncover eyes.
    useEffect(() => {
        Animated.timing(shyAnim, {
            toValue: shy ? 1 : 0,
            duration: 260,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [shy, shyAnim]);

    // Smoothly follow the requested bulb brightness.
    useEffect(() => {
        Animated.timing(level, {
            toValue: clamp(lightLevel, 0, 1),
            duration: 120,
            easing: Easing.linear,
            useNativeDriver: true,
        }).start();
    }, [lightLevel, level]);

    const onTap = () => {
        Animated.sequence([
            Animated.spring(tap, { toValue: 1.1, friction: 4, useNativeDriver: true }),
            Animated.spring(tap, { toValue: 1, friction: 4, useNativeDriver: true }),
        ]).start();
    };

    const floatY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
    const floatRot = float.interpolate({ inputRange: [0, 1], outputRange: ['-1deg', '1.5deg'] });
    const leftFlap = flap.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-22deg'] });
    const rightFlap = flap.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '22deg'] });
    const glowPulse = glow.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] });
    const glowOpacity = Animated.multiply(glowPulse, level);
    const dimOpacity = level.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] });
    const eyesOpacity = shyAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });
    const coverOpacity = shyAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });
    const coverY = shyAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [20 * s, 0],
        extrapolate: 'clamp',
    });

    const px = clamp(lookX, -1, 1) * 3;
    const py = clamp(lookY, -1, 1) * 3;

    // Wing views: rotate around the point where each wing joins the thorax.
    const wingW = 74 * s;
    const wingH = 64 * s;
    const pivotDX = 32 * s;
    const pivotDY = 22 * s;

    const glowSize = width * 1.7;

    const layer = { position: 'absolute', left: 0, top: 0, width, height };

    return (
        <Pressable onPress={onTap} accessibilityRole="image" accessibilityLabel="Mosquito mascot">
            <Animated.View style={{ width, height, transform: [{ scale: tap }] }}>
                <Animated.View
                    style={{
                        width,
                        height,
                        transform: [{ translateY: floatY }, { rotate: floatRot }],
                    }}
                >
                    {/* Ambient bulb glow */}
                    <Animated.View
                        pointerEvents="none"
                        style={{
                            position: 'absolute',
                            width: glowSize,
                            height: glowSize,
                            left: (width - glowSize) / 2,
                            top: 140 * s - glowSize / 2,
                            opacity: glowOpacity,
                        }}
                    >
                        <Svg width={glowSize} height={glowSize} viewBox="0 0 100 100">
                            <Defs>
                                <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
                                    <Stop offset="0" stopColor="#F59E0B" stopOpacity="0.45" />
                                    <Stop offset="1" stopColor="#F59E0B" stopOpacity="0" />
                                </RadialGradient>
                            </Defs>
                            <Circle cx="50" cy="50" r="50" fill="url(#glow)" />
                        </Svg>
                    </Animated.View>

                    {/* Left wing */}
                    <Animated.View
                        pointerEvents="none"
                        style={{
                            position: 'absolute',
                            left: 16 * s,
                            top: 16 * s,
                            width: wingW,
                            height: wingH,
                            transform: [
                                { translateX: pivotDX },
                                { translateY: pivotDY },
                                { rotate: leftFlap },
                                { translateY: -pivotDY },
                                { translateX: -pivotDX },
                            ],
                        }}
                    >
                        <Svg width={wingW} height={wingH} viewBox="16 16 74 64">
                            <Defs>
                                <LinearGradient id="wingL" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.7" />
                                    <Stop offset="1" stopColor="#93C5FD" stopOpacity="0.2" />
                                </LinearGradient>
                            </Defs>
                            <Path
                                d="M 85 70 C 50 30, 20 20, 30 55 C 40 80, 80 75, 85 70 Z"
                                fill="url(#wingL)"
                                stroke="rgba(255,255,255,0.5)"
                                strokeWidth={1.2}
                            />
                        </Svg>
                    </Animated.View>

                    {/* Right wing */}
                    <Animated.View
                        pointerEvents="none"
                        style={{
                            position: 'absolute',
                            left: 110 * s,
                            top: 16 * s,
                            width: wingW,
                            height: wingH,
                            transform: [
                                { translateX: -pivotDX },
                                { translateY: pivotDY },
                                { rotate: rightFlap },
                                { translateY: -pivotDY },
                                { translateX: pivotDX },
                            ],
                        }}
                    >
                        <Svg width={wingW} height={wingH} viewBox="110 16 74 64">
                            <Defs>
                                <LinearGradient id="wingR" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.7" />
                                    <Stop offset="1" stopColor="#93C5FD" stopOpacity="0.2" />
                                </LinearGradient>
                            </Defs>
                            <Path
                                d="M 115 70 C 150 30, 180 20, 170 55 C 160 80, 120 75, 115 70 Z"
                                fill="url(#wingR)"
                                stroke="rgba(255,255,255,0.5)"
                                strokeWidth={1.2}
                            />
                        </Svg>
                    </Animated.View>

                    {/* Back of the body: legs + lightbulb glass */}
                    <Svg style={layer} width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
                        <Defs>
                            <LinearGradient id="bulbGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <Stop offset="0" stopColor="#FFFBEB" />
                                <Stop offset="0.4" stopColor="#FDE047" />
                                <Stop offset="1" stopColor="#D97706" />
                            </LinearGradient>
                        </Defs>

                        {/* Legs */}
                        <G stroke="#374151" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <Path d="M 85 85 L 60 100 L 45 125" />
                            <Path d="M 115 85 L 140 100 L 155 125" />
                            <Path d="M 90 90 L 65 115 L 50 145" />
                            <Path d="M 110 90 L 135 115 L 150 145" />
                            <Path d="M 95 98 L 75 130 L 65 160" />
                            <Path d="M 105 98 L 125 130 L 135 160" />
                        </G>

                        {/* Lightbulb abdomen */}
                        <Path d={BULB_PATH} fill="url(#bulbGradient)" />
                        <Path
                            d="M 92 110 L 96 140 M 108 110 L 104 140 M 94 140 Q 100 148 106 140"
                            stroke="#FFFFFF"
                            strokeWidth={2}
                            fill="none"
                            opacity={0.9}
                        />
                    </Svg>

                    {/* Dark layer over the bulb: fades in as the light level drops */}
                    <Animated.View pointerEvents="none" style={[layer, { opacity: dimOpacity }]}>
                        <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
                            <Path d={BULB_PATH} fill="#1F2937" />
                        </Svg>
                    </Animated.View>

                    {/* Front of the body: cap, thorax, head */}
                    <Svg style={layer} width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
                        <Defs>
                            <LinearGradient id="capGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <Stop offset="0" stopColor="#9CA3AF" />
                                <Stop offset="0.5" stopColor="#4B5563" />
                                <Stop offset="1" stopColor="#1F2937" />
                            </LinearGradient>
                        </Defs>

                        {/* Metal cap */}
                        <Path
                            d="M 85 98 L 115 98 L 111 108 L 89 108 Z"
                            fill="url(#capGrad)"
                            stroke="#111827"
                            strokeWidth={1}
                        />
                        <Line x1="87" y1="102" x2="113" y2="102" stroke="#6B7280" strokeWidth={1.5} />
                        <Line x1="89" y1="105" x2="111" y2="105" stroke="#374151" strokeWidth={1.5} />

                        {/* Thorax */}
                        <Ellipse cx="100" cy="85" rx="16" ry="14" fill="#1F2937" stroke="#374151" strokeWidth={2} />
                        <Path
                            d="M 90 80 Q 100 77 110 80 M 88 85 Q 100 82 112 85 M 92 90 Q 100 87 108 90"
                            stroke="#F59E0B"
                            strokeWidth={2}
                            fill="none"
                            opacity={0.8}
                        />

                        {/* Head */}
                        <Circle cx="100" cy="62" r="14" fill="#111827" stroke="#374151" strokeWidth={2} />

                        {/* Proboscis */}
                        <Path d="M 100 48 L 100 20" stroke="#9CA3AF" strokeWidth={2.5} strokeLinecap="round" />
                        <Path d="M 100 20 L 98 12" stroke="#EF4444" strokeWidth={1.5} strokeLinecap="round" />

                        {/* Antennae */}
                        <Path d="M 95 52 Q 80 40 70 30" stroke="#F59E0B" strokeWidth={1.5} fill="none" strokeLinecap="round" />
                        <Path d="M 105 52 Q 120 40 130 30" stroke="#F59E0B" strokeWidth={1.5} fill="none" strokeLinecap="round" />
                    </Svg>

                    {/* Eyes (fade out when shy) */}
                    <Animated.View pointerEvents="none" style={[layer, { opacity: eyesOpacity }]}>
                        <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
                            <Circle cx={92} cy={60} r={5.5} fill="#FFFFFF" />
                            <Circle cx={108} cy={60} r={5.5} fill="#FFFFFF" />
                            <Circle cx={92 + px} cy={60 + py} r={2.8} fill="#090D16" />
                            <Circle cx={108 + px} cy={60 + py} r={2.8} fill="#090D16" />
                            <Circle cx={90.5 + px} cy={58.5 + py} r={1} fill="#FFFFFF" />
                            <Circle cx={106.5 + px} cy={58.5 + py} r={1} fill="#FFFFFF" />
                        </Svg>
                    </Animated.View>

                    {/* Closed eyes + hands (fade in when shy) */}
                    <Animated.View
                        pointerEvents="none"
                        style={[layer, { opacity: coverOpacity, transform: [{ translateY: coverY }] }]}
                    >
                        <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
                            <Path d="M 86 61 Q 92 67 98 61" stroke="#F59E0B" strokeWidth={2.5} fill="none" strokeLinecap="round" />
                            <Path d="M 102 61 Q 108 67 114 61" stroke="#F59E0B" strokeWidth={2.5} fill="none" strokeLinecap="round" />
                            <Path d="M 82 62 Q 92 50 95 60" stroke="#374151" strokeWidth={4} strokeLinecap="round" fill="none" />
                            <Path d="M 118 62 Q 108 50 105 60" stroke="#374151" strokeWidth={4} strokeLinecap="round" fill="none" />
                            <Circle cx={93} cy={60} r={3} fill="#F59E0B" />
                            <Circle cx={107} cy={60} r={3} fill="#F59E0B" />
                        </Svg>
                    </Animated.View>
                </Animated.View>
            </Animated.View>
        </Pressable>
    );
}