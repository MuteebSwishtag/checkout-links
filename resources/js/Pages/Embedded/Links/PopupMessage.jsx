import Toggle from '@/Components/Toggle'
import { Box, Card, InlineStack, Text, TextField, BlockStack, Banner, Select } from '@shopify/polaris'
import React, { useState, useEffect } from 'react'

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

    // Parse timerText into number and unit
    const parseTimerText = (timerText) => {
        if (!timerText) return { number: '1', unit: 'minute' };
        const match = timerText.match(/(\d+)\s*(second|minute|hour)s?/);
        if (match) {
            return { number: match[1], unit: match[2] };
        }
        return { number: '1', unit: 'minute' };
    };

    const [timerNumber, setTimerNumber] = useState(() => parseTimerText(popupMessageData.timerText).number);
    const [timerUnit, setTimerUnit] = useState(() => parseTimerText(popupMessageData.timerText).unit);

    // Update local state when popupMessageData.timerText changes from parent
    useEffect(() => {
        const parsed = parseTimerText(popupMessageData.timerText);
        setTimerNumber(parsed.number);
        setTimerUnit(parsed.unit);
    }, [popupMessageData.timerText]);

    const handleTimerNumberChange = (value) => {
        // Only allow digits, no decimals
        const cleanValue = value.replace(/[^0-9]/g, '');
        
        if (cleanValue === '') {
            setTimerNumber('');
            return;
        }

        // Remove leading zeros
        const numValue = cleanValue.replace(/^0+/, '');
        
        if (numValue === '') {
            setTimerNumber('');
            return;
        }

        const number = parseInt(numValue);
        
        // Limit to reasonable range (1-999)
        if (number < 1 || number > 999) return;

        setTimerNumber(numValue);
        // Format as "number unit" for backend
        const formattedValue = `${numValue} ${timerUnit}`;
        onTimerTextChange(formattedValue);
    };

    const handleTimerUnitChange = (value) => {
        setTimerUnit(value);
        // Format as "number unit" for backend, using current number or default to 1
        const number = timerNumber || '1';
        const formattedValue = `${number} ${value}`;
        onTimerTextChange(formattedValue);
    };

    const timerUnitOptions = [
        { label: 'Seconds', value: 'second' },
        { label: 'Minutes', value: 'minute' },
        { label: 'Hours', value: 'hour' },
    ];

    return (
        <div>
            {/* Display any general popup message errors */}
            {errors && errors.general && (
                <Banner status="critical">{errors.general}</Banner>
            )}

            <Card>
                <Box paddingBlockEnd='300'>
                    <InlineStack align="space-between" blockAlign="start">
                        <Box>
                            <Text variant="bodyMd" fontWeight="medium">
                                <p className='text-black font-bold'>Activate popup message</p>
                            </Text>
                            <Box paddingBlockStart="100">
                                <Text variant="bodySm" tone="subdued">
                                    <p className='text-black font-normal'>Summarise your pre-filled cart before users reach checkout</p>
                                </Text>
                            </Box>
                        </Box>
                        <Toggle
                            toggled={popupMessageData.isActive}
                            onClick={handleActiveToggle}
                        />
                    </InlineStack>
                </Box>

                {/* Only show all fields below if popupMessageData.isActive is true */}
                {popupMessageData.isActive && (
                    <>
                        {/* Content Section */}
                        <Box paddingBlockStart='400'>
                            <Card>
                                <BlockStack gap="400">
                                    <Box>
                                        <Text variant="headingMd" as="h3" fontWeight="medium">
                                            <p className='text-black font-bold'>Content</p>
                                        </Text>
                                    </Box>
                                    <Box>
                                        <Text variant="bodyMd" fontWeight="medium">
                                            <p className='text-black font-normal'>Heading text</p>
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
                                            <p className='text-black font-normal'>Message (optional)</p>
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
                                                    <p className='text-black font-bold'>Countdown timer</p>
                                                </Text>
                                                <Box paddingBlockStart="100">
                                                    <Text variant="bodySm" tone="subdued">
                                                        <p className='text-black font-normal'>Automatically apply a discount to order</p>
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
                                                    <InlineStack gap="300" blockAlign="start">
                                                        <Box minWidth="225px">
                                                            <TextField
                                                                label="Duration"
                                                                value={timerNumber}
                                                                onChange={handleTimerNumberChange}
                                                                type="text"
                                                                autoComplete="off"
                                                                placeholder="1"
                                                                error={errors && errors.timerText}
                                                                helpText="Enter 1-999"
                                                            />
                                                        </Box>
                                                        <Box minWidth="225px">
                                                            <Select
                                                                label="Unit"
                                                                options={timerUnitOptions}
                                                                value={timerUnit}
                                                                onChange={handleTimerUnitChange}
                                                            />
                                                        </Box>
                                                    </InlineStack>
                                                </Box>
                                                <Box>
                                                    <Text variant="bodyMd" fontWeight="medium">
                                                        <p className='text-black font-normal'>Copy before the timer</p>
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
                                                <p className='text-black font-bold'>Product settings</p>
                                            </Text>
                                        </Box> 
                                                
                                                    <InlineStack align="space-between" blockAlign="start">
                                                        <Box>
                                                        <Text variant="bodyMd" fontWeight="medium">
                                                            <p className='text-black font-normal'>Allow users to deselect products</p>
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
                                                    <p className='text-black font-normal'>Show product price</p>
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
                                                    <p className='text-black font-normal'>Show order total</p>
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
                                                <p className='text-black font-bold'>Buttons</p>
                                            </Text>
                                        </Box>
                                        <Box>
                                            <Text variant="bodyMd" fontWeight="medium">
                                                <p className='text-black font-normal'>Checkout button text</p>
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
                                                <p className='text-black font-normal'>Close button text</p>
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
                                                <p className='text-black font-normal'>Close button link</p>
                                            </Text>
                                            <Box paddingBlockStart="200">
                                                <TextField
                                                    value={popupMessageData.closeButtonLink}
                                                    type="url"
                                                    onChange={onCloseButtonLinkChange}
                                                    autoComplete="off"
                                                    error={errors && errors.closeButtonLink}
                                                    placeholder='i.e. https://www.example.com'
                                                />
                                            </Box>
                                        </Box>
                                    </BlockStack>
                                </Box>
                            </Card>
                        </Box>
                    </>
                )}
            </Card>
        </div>
    )
}
