import React, { useState, useCallback } from 'react';
import {
    Page,
    Card,
    TextField,
    Button,
    Text,
    Collapsible,
    BlockStack,
    InlineStack,
    Box,
    Banner,
    Icon,
    Divider,
    Link as PolarisLink,
    Grid
} from '@shopify/polaris';
import { ChevronDownIcon, ChevronUpIcon } from '@shopify/polaris-icons';
import { Link, router, usePage } from '@inertiajs/react';
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'

export default function CreateLink() {
    const { props } = usePage();
    const query = props.query || {};
    
    const [linkName, setLinkName] = useState('');
    const [linkId, setLinkId] = useState('');
    const [productsOpen, setProductsOpen] = useState(true);
    const [discountsOpen, setDiscountsOpen] = useState(false);
    const [popupMessageOpen, setPopupMessageOpen] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState(0);

    const handleLinkNameChange = useCallback((value) => setLinkName(value), []);
    const handleLinkIdChange = useCallback((value) => setLinkId(value), []);
    
    const handleProductsToggle = useCallback(() => setProductsOpen(!productsOpen), [productsOpen]);
    const handleDiscountsToggle = useCallback(() => setDiscountsOpen(!discountsOpen), [discountsOpen]);
    const handlePopupMessageToggle = useCallback(() => setPopupMessageOpen(!popupMessageOpen), [popupMessageOpen]);

    return (
        <Page
        title='Create Link'
            backAction={{ 
                content: 'Links', 
                onAction: () => router.visit(route('links', query)) 
            }}
        >

            <Grid >
            <Grid.Cell columnSpan={{xs: 12, sm: 6, md: 6, lg:6, xl: 6}}> 
            <BlockStack gap="500">
                {/* Link details section */}
                <Card>
                    <BlockStack gap="400" padding="400">
                        <Text variant="bodyMd">Link Name</Text>
                        <TextField
                            label=""
                            value={linkName}
                            onChange={handleLinkNameChange}
                            placeholder="Test Link"
                            autoComplete="off"
                        />
                        
                        <Text variant="bodyMd">Link ID</Text>
                        <TextField
                            label=""
                            value={linkId}
                            onChange={handleLinkIdChange}
                            placeholder="https://www.example.com/ 3n49sjw3"
                            autoComplete="off"
                        />
                    </BlockStack>
                </Card>

                {/* Products Section - Accordion with just search */}
                <Card>
                    <BlockStack gap="400">
                        <InlineStack align="space-between" padding="400">
                            <Text variant="bodyMd">Products</Text>
                            <Button
                                onClick={handleProductsToggle}
                                ariaExpanded={productsOpen}
                                ariaControls="products-content"
                                plain
                                icon={productsOpen ? ChevronUpIcon : ChevronDownIcon}
                            />
                        </InlineStack>
                        
                        <Collapsible
                            open={productsOpen}
                            id="products-content"
                        >
                            <Box padding="400">
                                <InlineStack align="space-between" gap="400">
                                    <div style={{ flexGrow: 1 }}>
                                        <TextField
                                            prefix={<Icon source={() => <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm9.707 4.293-4.82-4.82A5.968 5.968 0 0 0 14 8 6 6 0 0 0 2 8a6 6 0 0 0 6 6 5.968 5.968 0 0 0 3.473-1.113l4.82 4.82a.997.997 0 0 0 1.414 0 .999.999 0 0 0 0-1.414z" fill="currentColor"/></svg>} />}
                                            placeholder="Search products"
                                            fullWidth
                                        />
                                    </div>
                                    <Button>Browse</Button>
                                </InlineStack>
                            </Box>
                        </Collapsible>
                    </BlockStack>
                </Card>
                
               

                {/* Discounts Section */}
                <Card>
                    <BlockStack gap="400">
                        <InlineStack align="space-between" padding="400">
                            <Text variant="bodyMd">Discounts</Text>
                            <Button
                                onClick={handleDiscountsToggle}
                                ariaExpanded={discountsOpen}
                                ariaControls="discounts-content"
                                plain
                                icon={discountsOpen ? ChevronUpIcon : ChevronDownIcon}
                            />
                        </InlineStack>
                        
                        <Collapsible
                            open={discountsOpen}
                            id="discounts-content"
                        >
                            <Box padding="400">
                                <Text as="p" color="subdued">Discount options will be configured here</Text>
                            </Box>
                        </Collapsible>
                    </BlockStack>
                </Card>

                {/* Popup Message Section */}
                <Card>
                    <BlockStack gap="400">
                        <InlineStack align="space-between" padding="400">
                            <Text variant="bodyMd">Popup Message</Text>
                            <Button
                                onClick={handlePopupMessageToggle}
                                ariaExpanded={popupMessageOpen}
                                ariaControls="popup-message-content"
                                plain
                                icon={popupMessageOpen ? ChevronUpIcon : ChevronDownIcon}
                            />
                        </InlineStack>
                        
                        <Collapsible
                            open={popupMessageOpen}
                            id="popup-message-content"
                        >
                            <Box padding="400">
                                <Text as="p" color="subdued">Popup message configuration will appear here</Text>
                            </Box>
                        </Collapsible>
                    </BlockStack>
                </Card>
            </BlockStack>

            </Grid.Cell>
            <Grid.Cell columnSpan={{xs: 12, sm: 6, md: 6, lg:6, xl: 6}}>
                 {/* Summary Card - Separate from accordion */}
                <Card>
                    <BlockStack gap="400" padding="400">
                        <InlineStack align="space-between">
                            <Text variant="bodyMd">Summary</Text>
                            <Button variant='plain'>Test</Button>
                        </InlineStack>
                        
                        <Box background="bg-surface-secondary" padding="400" borderRadius="2" border="base">
                            <BlockStack gap="300">
                                <InlineStack gap="200" align="start">
                                    <div style={{ marginTop: "2px" }}>
                                        <Icon source={() => <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" fill="none" /></svg>} color="subdued" />
                                    </div>
                                    <Text as="span" color="subdued">Pre-filled cart: {selectedProducts} products selected</Text>
                                </InlineStack>
                                
                                <InlineStack gap="400">
                                    <Box width='80%'>
                                    <TextField
                                        value="https://examplewebsite.com/3n49sjw3..."
                                        readOnly
                                        autoComplete="off"
                                    />

                                    </Box>
                                    <Button>Copy</Button>
                                </InlineStack>
                            </BlockStack>
                        </Box>
                    </BlockStack>
                </Card>
                
                {/* Preview Card - Separate from accordion */}
                <Card>
                    <BlockStack gap="400" padding="400">
                        <InlineStack align="space-between">
                            <Text variant="bodyMd">Preview</Text>
                            <Button variant='plain'>Test</Button>
                        </InlineStack>
                        
                        <Box background="" padding="400" borderRadius="2" border="base">
                            <BlockStack gap="300" align="center">
                                <InlineStack blockAlign='center' align='space-between'>
                                    <Text tone='disabled' icon={() => <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="8" width="10" height="8" stroke="currentColor" strokeWidth="1.25" fill="none" /></svg>} disabled>Preview popup message</Text>
                                <Text>Preview summary checkout</Text>
                                </InlineStack>
                                
                                <Box background='bg-fill-disabled' padding={'400'} borderRadius='200' >

                                <Text as="p" color="subdued">Select products to see preview</Text>
                                </Box>
                            </BlockStack>
                        </Box>
                    </BlockStack>
                </Card>
                </Grid.Cell>
            </Grid>
        </Page>
    );
}
