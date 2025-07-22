import Toggle from '@/Components/Toggle'
import { Box, Card, InlineStack, Text, TextField, BlockStack } from '@shopify/polaris'
import React, { useState, useEffect } from 'react'

export default function PopupMessage({ onPopupMessageChange, active1 }) {
    const [isActive, setIsActive] = useState(true);
    const [headingText, setHeadingText] = useState('Order summary');
    const [messageText, setMessageText] = useState('I hope you enjoy your 20% discount this order that I built for you, I look forward to sending them out to you!');
    const [countdownActive, setCountdownActive] = useState(false);
    const [timerText, setTimerText] = useState('1 minute');
    const [copyText, setCopyText] = useState('This offer will expire in');
    const [allowDeselect, setAllowDeselect] = useState(true);
    const [showPrice, setShowPrice] = useState(false);
    const [showOrderTotal, setShowOrderTotal] = useState(true);
    const [checkoutButtonText, setCheckoutButtonText] = useState('Confirm');
    const [closeButtonText, setCloseButtonText] = useState('No thanks');
    const [closeButtonLink, setCloseButtonLink] = useState('#');

    const handleCountdownToggle = () => setCountdownActive(!countdownActive);
    const handleAllowDeselectToggle = () => setAllowDeselect(!allowDeselect);
    const handleShowPriceToggle = () => setShowPrice(!showPrice);
    const handleShowOrderTotalToggle = () => setShowOrderTotal(!showOrderTotal);
    const handleActiveToggle = () => setIsActive(!isActive);

    // Update parent component whenever any data changes
    React.useEffect(() => {
        if (onPopupMessageChange) {
            onPopupMessageChange({
                isActive,
                headingText,
                messageText,
                countdownActive,
                timerText,
                copyText,
                allowDeselect,
                showPrice,
                showOrderTotal,
                checkoutButtonText,
                closeButtonText,
                closeButtonLink
            });
        }
       
    }, [isActive, headingText, messageText, countdownActive, timerText, copyText, 
        allowDeselect, showPrice, showOrderTotal, checkoutButtonText, closeButtonText, 
        closeButtonLink, onPopupMessageChange]);

    return (
        <div>

           
            {/* <Box  paddingBlockEnd='300'>
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
                            toggled={isActive}
                            onClick={handleActiveToggle}
                        />
                    </InlineStack>
                </Box> */}

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
                                    value={headingText}
                                    onChange={setHeadingText}
                                    autoComplete="off"
                                />
                            </Box>
                        </Box>

                       
                        <Box>
                            <Text variant="bodyMd" fontWeight="medium">
                                Message (optional)
                            </Text>
                            <Box paddingBlockStart="200">
                                <TextField
                                    value={messageText}
                                    onChange={setMessageText}
                                    multiline={4}
                                    autoComplete="off"
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
                                    toggled={countdownActive}
                                    onClick={handleCountdownToggle}
                                />
                            </InlineStack>
                            {countdownActive && (
                                <BlockStack gap="400">

                                    <Box>
                                        <TextField
                                            value={timerText}
                                            onChange={setTimerText}
                                            autoComplete="off"
                                        />
                                    </Box>


                                    <Box>
                                        <Text variant="bodyMd" fontWeight="medium">
                                            Copy before the timer
                                        </Text>
                                        <Box paddingBlockStart="200">
                                            <TextField
                                                value={copyText}
                                                onChange={setCopyText}
                                                autoComplete="off"
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
                                    toggled={allowDeselect}
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
                                    toggled={showPrice}
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
                                    toggled={showOrderTotal}
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
                                        value={checkoutButtonText}
                                        onChange={setCheckoutButtonText}
                                        autoComplete="off"
                                    />
                                </Box>
                            </Box>

                          
                            <Box>
                                <Text variant="bodyMd" fontWeight="medium">
                                    Close button text
                                </Text>
                                <Box paddingBlockStart="200">
                                    <TextField
                                        value={closeButtonText}
                                        onChange={setCloseButtonText}
                                        autoComplete="off"
                                    />
                                </Box>
                            </Box>

                          
                            <Box>
                                <Text variant="bodyMd" fontWeight="medium">
                                    Close button link
                                </Text>
                                <Box paddingBlockStart="200">
                                    <TextField
                                        value={closeButtonLink}
                                        onChange={setCloseButtonLink}
                                        autoComplete="off"
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
