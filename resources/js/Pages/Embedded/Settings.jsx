import React, { useState, useEffect } from 'react';
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
import { useAppBridge } from '@shopify/app-bridge-react';
import { SaveBar } from '@shopify/app-bridge-react';

export default function Settings() {

    const shopify = useAppBridge();


    const [appVersion, setAppVersion] = useState('version 1.0');
    const [brandColor, setBrandColor] = useState({ hue: 120, brightness: 1, saturation: 1 });
    const [initialBrandColor, setInitialBrandColor] = useState({ hue: 120, brightness: 1, saturation: 1 });
    const [customCSS, setCustomCSS] = useState('');
    const [initialCustomCSS, setInitialCustomCSS] = useState('');
    const [colorPickerActive, setColorPickerActive] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

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

    // Check if any changes were made and show/hide save bar
    useEffect(() => {
        const hasColorChanged = JSON.stringify(brandColor) !== JSON.stringify(initialBrandColor);
        const hasCssChanged = customCSS !== initialCustomCSS;
        setIsDirty(hasColorChanged || hasCssChanged);

        if (hasColorChanged || hasCssChanged) {
            shopify.saveBar.show("my-save-bar");
        } else {
            shopify.saveBar.hide("my-save-bar");
        }
    }, [brandColor, customCSS, initialBrandColor, initialCustomCSS, shopify.saveBar]);

    const handleSave = () => {
        setInitialBrandColor({ ...brandColor });
        setInitialCustomCSS(customCSS);
        // setIsDirty(false);
        shopify.saveBar.hide("my-save-bar");
    };

    const handleDiscard = () => {
      
        setBrandColor({ ...initialBrandColor });
        setCustomCSS(initialCustomCSS);
        // setIsDirty(false);
        shopify.saveBar.hide("my-save-bar");

    };


    return (
        <Page title="Settings">
            <div style={{ marginTop: '2rem' }}>

                <div style={{ padding: '2rem' }}>
                    <BlockStack gap="600">

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '200px 1fr',
                            gap: '2rem',
                            alignItems: 'center'
                        }}>
                            <Text variant="headingMd" as="h4">
                                App version
                            </Text>

                            <Card>
                                <Text variant='headingMd' as='h5'>{appVersion}</Text>
                            </Card>
                        </div>

                        {/* Brand color */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '200px 1fr',
                            gap: '2rem',
                            alignItems: 'center',

                        }}>

                            <Text variant="headingMd" as="h4">
                                Brand color
                            </Text>



                            <Card>
                                <InlineStack gap='300'>
                                    <Popover
                                        active={colorPickerActive}
                                        activator={
                                            <Button
                                                onClick={toggleColorPicker}
                                                variant="plain"

                                                textAlign="left"

                                            >
                                                <InlineStack gap="300" align="start" blockAlign="center">
                                                    <div
                                                        style={{
                                                            width: '30px',
                                                            height: '30px',
                                                            backgroundColor: hexColor,
                                                            border: '1px dotted #000000',
                                                            borderRadius: '50%',

                                                        }}
                                                    />

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


                                    <Box>
                                        <BlockStack gap="025">
                                            <Text variant="bodyMd" fontWeight="medium">
                                                Brand color
                                            </Text>
                                            <Text variant="bodySm" tone="subdued">
                                                Accent color for button backgrounds
                                            </Text>
                                        </BlockStack>
                                    </Box>

                                </InlineStack>
                            </Card>

                        </div>

                        {/* Custom CSS */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '200px 1fr',
                            gap: '2rem',
                            alignItems: 'start'
                        }}>
                            <div>
                                <Text variant="headingMd" as="h4">
                                    Custom CSS
                                </Text>
                                <Text variant="bodyMd" tone="subdued">
                                    Apply custom styles to further modify
                                </Text>
                            </div>

                            <Card>

                                <Box paddingBlockEnd='200'>
                                    <Text>Custom Css</Text>
                                </Box>
                                <TextField
                                    value={customCSS}
                                    onChange={setCustomCSS}
                                    multiline={6}
                                    autoComplete="off"

                                    labelHidden
                                />
                            </Card>

                        </div>
                    </BlockStack>
                </div>

            </div>



            <SaveBar id="my-save-bar">
                <button variant="primary" onClick={handleSave}></button>
                <button onClick={handleDiscard}></button>
            </SaveBar>

        </Page>
    );
}
