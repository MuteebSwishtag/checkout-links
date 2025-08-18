import React, { useState } from 'react';
import {
    Page,
    Card,
    Text,
    TextField,
    BlockStack,
    InlineStack,
    Box,
    Button,
    ColorPicker,
    Popover,
} from '@shopify/polaris';

export default function Settings() {
    const [appVersion, setAppVersion] = useState('version 1.0');
    const [brandColor, setBrandColor] = useState({
        hue: 0,
        brightness: 1,
        saturation: 0,
    });
    const [customCSS, setCustomCSS] = useState('');
    const [colorPickerActive, setColorPickerActive] = useState(false);

    const toggleColorPicker = () => setColorPickerActive(!colorPickerActive);

    // Convert HSB to hex color
    const hsbToHex = (hsb) => {
        const h = hsb.hue;
        const s = hsb.saturation;
        const b = hsb.brightness;
        
        const c = b * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = b - c;
        
        let r, g, blue;
        if (h >= 0 && h < 60) {
            r = c; g = x; blue = 0;
        } else if (h >= 60 && h < 120) {
            r = x; g = c; blue = 0;
        } else if (h >= 120 && h < 180) {
            r = 0; g = c; blue = x;
        } else if (h >= 180 && h < 240) {
            r = 0; g = x; blue = c;
        } else if (h >= 240 && h < 300) {
            r = x; g = 0; blue = c;
        } else {
            r = c; g = 0; blue = x;
        }
        
        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        blue = Math.round((blue + m) * 255);
        
        return `#${((1 << 24) + (r << 16) + (g << 8) + blue).toString(16).slice(1)}`;
    };

    const hexColor = hsbToHex(brandColor);

    return (
        <Page>
            <div style={{ 
                maxWidth: '800px', 
                margin: '0 auto',
                padding: '2rem'
            }}>
                <Text variant="headingXl" as="h1" fontWeight="bold">
                    Settings
                </Text>
                
                <div style={{ marginTop: '2rem' }}>
                    <Card>
                        <div style={{ padding: '2rem' }}>
                            <BlockStack gap="600">
                                {/* App version */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '200px 1fr',
                                    gap: '2rem',
                                    alignItems: 'center'
                                }}>
                                    <Text variant="bodyLg" as="h3">
                                        App version
                                    </Text>
                                    <TextField
                                        value={appVersion}
                                        onChange={setAppVersion}
                                        autoComplete="off"
                                        labelHidden
                                        disabled
                                        readOnly
                                    />
                                </div>

                                {/* Brand color */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '200px 1fr',
                                    gap: '2rem',
                                    alignItems: 'center'
                                }}>
                                    <Text variant="bodyLg" as="h3">
                                        Brand color
                                    </Text>
                                    <Popover
                                        active={colorPickerActive}
                                        activator={
                                            <Button
                                                onClick={toggleColorPicker}
                                                variant="secondary"
                                                fullWidth
                                                textAlign="left"
                                            >
                                                <InlineStack gap="300" align="start" blockAlign="center">
                                                    <div
                                                        style={{
                                                            width: '20px',
                                                            height: '20px',
                                                            backgroundColor: hexColor,
                                                            borderRadius: '50%',
                                                            border: '1px solid #e1e5e9',
                                                        }}
                                                    />
                                                    <BlockStack gap="025">
                                                        <Text variant="bodyMd" fontWeight="medium">
                                                            Brand color
                                                        </Text>
                                                        <Text variant="bodySm" tone="subdued">
                                                            Accent color for button backgrounds
                                                        </Text>
                                                    </BlockStack>
                                                </InlineStack>
                                            </Button>
                                        }
                                        onClose={toggleColorPicker}
                                        preferredAlignment="left"
                                    >
                                        <Box padding="400">
                                            <ColorPicker
                                                onChange={setBrandColor}
                                                color={brandColor}
                                            />
                                        </Box>
                                    </Popover>
                                </div>

                                {/* Custom CSS */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '200px 1fr',
                                    gap: '2rem',
                                    alignItems: 'start'
                                }}>
                                    <div>
                                        <Text variant="bodyLg" as="h3">
                                            Custom CSS
                                        </Text>
                                        <Text variant="bodyMd" tone="subdued">
                                            Apply custom styles to further modify
                                        </Text>
                                    </div>
                                    <TextField
                                        value={customCSS}
                                        onChange={setCustomCSS}
                                        multiline={6}
                                        autoComplete="off"
                                        placeholder="Custom CSS"
                                        labelHidden
                                    />
                                </div>
                            </BlockStack>
                        </div>
                    </Card>
                </div>
            </div>
        </Page>
    );
}
