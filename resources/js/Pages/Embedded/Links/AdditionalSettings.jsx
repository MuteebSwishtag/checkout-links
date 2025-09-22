import Toggle from '@/Components/Toggle'
import { Box, Card, InlineStack, Text, BlockStack } from '@shopify/polaris'
import React from 'react'

export default function AdditionalSettings({ 
    additionalSettingsData,
    onSettingToggle
}) {

    const handleAllowOnlyOneOrderToggle = () => {
        onSettingToggle('allowOnlyOneOrder', !additionalSettingsData.allowOnlyOneOrder);
    };

    return (
        <div>
            <Card>
                <Box padding="">
                    <BlockStack gap="400">
                        <InlineStack align="space-between" blockAlign="start">
                            <Box>
                                <Text variant="bodyMd" fontWeight="medium">
                                    <p className='text-black font-normal'>Allow only 1 order to be placed from this link</p>
                                </Text>
                            </Box>
                            <Toggle
                                toggled={additionalSettingsData.allowOnlyOneOrder}
                                onClick={handleAllowOnlyOneOrderToggle}
                            />
                        </InlineStack>
                    </BlockStack>
                </Box>
            </Card>
        </div>
    )
}