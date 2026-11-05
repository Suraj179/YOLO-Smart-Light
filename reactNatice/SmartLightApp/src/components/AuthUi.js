import React, { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export const COLORS = {
    bg: '#0B0F19',
    card: 'rgba(17, 24, 39, 0.85)',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    amber: '#F59E0B',
    amberSoft: '#FBBF24',
    text: '#F3F4F6',
    muted: '#9CA3AF',
    inputBg: 'rgba(31, 41, 55, 0.6)',
    inputBorder: 'rgba(75, 85, 99, 0.5)',
    placeholder: '#6B7280',
    errorBg: 'rgba(239, 68, 68, 0.15)',
    errorBorder: 'rgba(239, 68, 68, 0.4)',
    errorText: '#FCA5A5',
    successBg: 'rgba(16, 185, 129, 0.15)',
    successBorder: 'rgba(16, 185, 129, 0.4)',
    successText: '#6EE7B7',
    onAmber: '#030712',
};

/** Login / Register segmented switch shown above the mascot. */
export function AuthTabs({ active, onLogin, onRegister, disabled }) {
    return (
        <View style={styles.tabs}>
            <Pressable
                style={[styles.tab, active === 'login' && styles.tabActive]}
                onPress={onLogin}
                disabled={disabled}
            >
                <Text style={[styles.tabText, active === 'login' && styles.tabTextActive]}>
                    Login
                </Text>
            </Pressable>
            <Pressable
                style={[styles.tab, active === 'register' && styles.tabActive]}
                onPress={onRegister}
                disabled={disabled}
            >
                <Text style={[styles.tabText, active === 'register' && styles.tabTextActive]}>
                    Register
                </Text>
            </Pressable>
        </View>
    );
}

/** Labelled dark input. Pass `password` for a built-in show/hide toggle. */
export const AuthField = forwardRef(function AuthField(
    { label, password = false, onFocus, onBlur, style, ...rest },
    ref
) {
    const [focused, setFocused] = useState(false);
    const [revealed, setRevealed] = useState(false);

    return (
        <View style={styles.fieldWrap}>
            <Text style={styles.label}>{label}</Text>
            <View style={[styles.inputRow, focused && styles.inputRowFocused]}>
                <TextInput
                    ref={ref}
                    style={[styles.input, style]}
                    placeholderTextColor={COLORS.placeholder}
                    secureTextEntry={password && !revealed}
                    onFocus={(e) => {
                        setFocused(true);
                        onFocus && onFocus(e);
                    }}
                    onBlur={(e) => {
                        setFocused(false);
                        onBlur && onBlur(e);
                    }}
                    {...rest}
                />
                {password && (
                    <Pressable
                        onPress={() => setRevealed((v) => !v)}
                        hitSlop={10}
                        style={styles.toggle}
                    >
                        <Text style={styles.toggleText}>{revealed ? 'HIDE' : 'SHOW'}</Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
});

/** Primary amber action button. */
export function AuthButton({ title, onPress, loading, children }) {
    return (
        <Pressable
            onPress={onPress}
            disabled={loading}
            style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
            ]}
        >
            {children || <Text style={styles.buttonText}>{title}</Text>}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    tabs: {
        flexDirection: 'row',
        backgroundColor: 'rgba(17, 24, 39, 0.85)',
        borderWidth: 1,
        borderColor: '#1F2937',
        borderRadius: 16,
        padding: 6,
        marginBottom: 16,
        width: '100%',
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
    },
    tabActive: {
        backgroundColor: COLORS.amber,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.muted,
    },
    tabTextActive: {
        color: COLORS.onAmber,
    },
    fieldWrap: {
        marginBottom: 14,
    },
    label: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: '#D1D5DB',
        marginBottom: 6,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.inputBg,
        borderWidth: 1,
        borderColor: COLORS.inputBorder,
        borderRadius: 12,
    },
    inputRowFocused: {
        borderColor: COLORS.amber,
        backgroundColor: 'rgba(31, 41, 55, 0.9)',
    },
    input: {
        flex: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#FFFFFF',
    },
    toggle: {
        paddingHorizontal: 14,
    },
    toggleText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        color: COLORS.amberSoft,
    },
    button: {
        marginTop: 6,
        backgroundColor: COLORS.amber,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.amber,
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    buttonPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.99 }],
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: COLORS.onAmber,
        fontSize: 15,
        fontWeight: '700',
    },
});