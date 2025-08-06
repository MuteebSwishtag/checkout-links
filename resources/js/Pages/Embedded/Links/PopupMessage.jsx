import Toggle from '@/Components/Toggle'
import { Box, Card, InlineStack, Text, TextField, BlockStack, Banner } from '@shopify/polaris'
import React from 'react'

export default function PopupMessage({ 
    popupMessageData,
    errors = {},
    onActiveToggle,
    onHeadingTextChange,
    onMessageTextChange,
    onCountdownToggle,
    onTimerTextChange,
    onCopyTextChange,
    onAllowDeselectToggle,
    onShowPriceToggle,
    onShowOrderTotalToggle,
    onCheckoutButtonTextChange,
    onCloseButtonTextChange,
    onCloseButtonLinkChange
}) {

    const handleActiveToggle = () => onActiveToggle(!popupMessageData.isActive);
    const handleCountdownToggle = () => onCountdownToggle(!popupMessageData.countdownActive);
    const handleAllowDeselectToggle = () => onAllowDeselectToggle(!popupMessageData.allowDeselect);
    const handleShowPriceToggle = () => onShowPriceToggle(!popupMessageData.showPrice);
    const handleShowOrderTotalToggle = () => onShowOrderTotalToggle(!popupMessageData.showOrderTotal);

    return (
        <div>
            {/* Display any general popup message errors */}
            {errors && errors.general && (
                <Banner status="critical">{errors.general}</Banner>
            )}
           
            <Box  paddingBlockEnd='300'>
                    <InlineStack align="space-between" blockAlign="start">
                        <Box>
                            <Text variant="bodyMd" fontWeight="medium">
                                Activate popup message
                            </Text>
                            <Box paddingBlockStart="100">
                                <Text variant="bodySm" tone="subdued">
                                    Summarise your pre-filled cart before users reach checkout
                                </Text>
                            </Box>
                        </Box>

                        <Toggle
                            toggled={popupMessageData.isActive}
                            onClick={handleActiveToggle}
                        />
                    </InlineStack>
                </Box>

            {/* Content Section */}
            <Box paddingBlockStart=''>
                <Card>
                    <BlockStack gap="400">
                        <Box>
                            <Text variant="headingMd" as="h3" fontWeight="medium">
                                Content
                            </Text>
                        </Box>

                       
                        <Box>
                            <Text variant="bodyMd" fontWeight="medium">
                                Heading text
                            </Text>
                            <Box paddingBlockStart="200">
                                <TextField
                                    value={popupMessageData.headingText}
                                    onChange={onHeadingTextChange}
                                    autoComplete="off"
                                    error={errors && errors.headingText}
                                />
                            </Box>
                        </Box>

                       
                        <Box>
                            <Text variant="bodyMd" fontWeight="medium">
                                Message (optional)
                            </Text>
                            <Box paddingBlockStart="200">
                                <TextField
                                    value={popupMessageData.messageText}
                                    onChange={onMessageTextChange}
                                    multiline={4}
                                    autoComplete="off"
                                    error={errors && errors.messageText}
                                />
                            </Box>
                        </Box>
                    </BlockStack>
                </Card>
            </Box>
            
            <Box paddingBlockStart="400">
                <Card>
                    <Box padding="">
                        <BlockStack gap="400">
                            <InlineStack align="space-between" blockAlign="start">
                                <Box>
                                    <Text variant="bodyMd" fontWeight="medium">
                                        Countdown timer
                                    </Text>
                                    <Box paddingBlockStart="100">
                                        <Text variant="bodySm" tone="subdued">
                                            Automatically apply a discount to order
                                        </Text>
                                    </Box>
                                </Box>

                                <Toggle
                                    toggled={popupMessageData.countdownActive}
                                    onClick={handleCountdownToggle}
                                />
                            </InlineStack>
                            {popupMessageData.countdownActive && (
                                <BlockStack gap="400">

                                    <Box>
                                        <TextField
                                            value={popupMessageData.timerText}
                                            onChange={onTimerTextChange}
                                            autoComplete="off"
                                            error={errors && errors.timerText}
                                        />
                                    </Box>


                                    <Box>
                                        <Text variant="bodyMd" fontWeight="medium">
                                            Copy before the timer
                                        </Text>
                                        <Box paddingBlockStart="200">
                                            <TextField
                                                value={popupMessageData.copyText}
                                                onChange={onCopyTextChange}
                                                autoComplete="off"
                                                error={errors && errors.copyText}
                                            />
                                        </Box>
                                    </Box>
                                </BlockStack>
                            )}
                        </BlockStack>
                    </Box>
                </Card>
            </Box>
            <Box paddingBlockStart="400">
                <Card>
                    <Box padding="">
                        <BlockStack gap="400">
                            <Box>
                                <Text variant="headingMd" as="h3" fontWeight="medium">
                                    Product settings
                                </Text>
                            </Box>

                            <InlineStack align="space-between" blockAlign="start">
                                <Box>
                                    <Text variant="bodyMd" fontWeight="medium">
                                        Allow users to deselect products
                                    </Text>
                                </Box>
                                <Toggle
                                    toggled={popupMessageData.allowDeselect}
                                    onClick={handleAllowDeselectToggle}
                                />
                            </InlineStack>

                            <InlineStack align="space-between" blockAlign="start">
                                <Box>
                                    <Text variant="bodyMd" fontWeight="medium">
                                        Show product price
                                    </Text>
                                </Box>
                                <Toggle
                                    toggled={popupMessageData.showPrice}
                                    onClick={handleShowPriceToggle}
                                />
                            </InlineStack>

                            <InlineStack align="space-between" blockAlign="start">
                                <Box>
                                    <Text variant="bodyMd" fontWeight="medium">
                                        Show order total
                                    </Text>
                                </Box>
                                <Toggle
                                    toggled={popupMessageData.showOrderTotal}
                                    onClick={handleShowOrderTotalToggle}
                                />
                            </InlineStack>
                        </BlockStack>
                    </Box>
                </Card>
            </Box>

        
            <Box paddingBlockStart="400">
                <Card>
                    <Box padding="">
                        <BlockStack gap="400">
                            <Box>
                                <Text variant="headingMd" as="h3" fontWeight="medium">
                                    Buttons
                                </Text>
                            </Box>

                            
                            <Box>
                                <Text variant="bodyMd" fontWeight="medium">
                                    Checkout button text
                                </Text>
                                <Box paddingBlockStart="200">
                                    <TextField
                                        value={popupMessageData.checkoutButtonText}
                                        onChange={onCheckoutButtonTextChange}
                                        autoComplete="off"
                                        error={errors && errors.checkoutButtonText}
                                    />
                                </Box>
                            </Box>

                          
                            <Box>
                                <Text variant="bodyMd" fontWeight="medium">
                                    Close button text
                                </Text>
                                <Box paddingBlockStart="200">
                                    <TextField
                                        value={popupMessageData.closeButtonText}
                                        onChange={onCloseButtonTextChange}
                                        autoComplete="off"
                                        error={errors && errors.closeButtonText}
                                    />
                                </Box>
                            </Box>

                          
                            <Box>
                                <Text variant="bodyMd" fontWeight="medium">
                                    Close button link
                                </Text>
                                <Box paddingBlockStart="200">
                                    <TextField
                                        value={popupMessageData.closeButtonLink}
                                        onChange={onCloseButtonLinkChange}
                                        autoComplete="off"
                                        error={errors && errors.closeButtonLink}
                                    />
                                </Box>
                            </Box>
                        </BlockStack>
                    </Box>
                </Card>
            </Box>
           

        </div>
    )
}
