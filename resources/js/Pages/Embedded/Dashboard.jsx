import {
    Box, Button, Card, ChoiceList,
    IndexFilters,
    IndexTable,
    InlineStack,
    Page, RangeSlider, Text, TextField, Popover, ActionList,
    useBreakpoints, useIndexResourceState, useSetIndexFiltersMode, Grid,
    BlockStack,
    Icon
} from '@shopify/polaris';
import { useCallback, useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import {CartIcon , LogoMetaIcon, SandboxIcon } from '@shopify/polaris-icons';
import bundle from  '@/Pages/Images/Bundlo.png';
import progressify from '@/Pages/Images/Progressify.png'



export default function Dashboard() {
    const [reload, setReload] = useState(true);

    const [onFiancialStatusChange, setonFiancialStatusChange] = useState('');
    const [onFulfillStatusChange, setonFulfillStatusChange] = useState('');
    const [queryValue, setQueryValue] = useState('');


    const featuresData = [
        {
            icon: CartIcon,
            title: 'Pre-built carts for shoppers',
            description: 'Make the decision for them.'
        },
        {
            icon:  LogoMetaIcon,
            title: 'Turn ad clicks into instant sales',
            description: 'Create instant sales funnels with no code'
        },
        {
            icon:  SandboxIcon,
            title: 'Plug & play funnel links',
            description: 'Use checkout links across quizzes and pages.'
        }
    ];


    const appsData = [
        {
            name: 'Checkout Links',
            description: 'One-click checkout links for every campaign or ticket',
            icon: '',
            backgroundColor: '#E0E0E0',
            buttonVariant: 'secondary',
            buttonText: '✓ Installed',
            isDisabled: true,
            minHeight: '270px'
        },
        {
            name: 'Bundlo',
            description: 'Create full-page, guided bundle experiences that convert',
            // icon: '📦',
            // backgroundColor: '',
            img:bundle,
            price: '$8.99/mo',
            trial: '7-day free trial',
            buttonVariant: 'primary',
            buttonText: 'Install app',
            isDisabled: false,
            minHeight: '200px'
        },
        {
            name: 'Progressify',
            description: 'Increase AOV With A Free Shipping Progress Bar & GWP Upsell',
            // icon: '📊',
            // backgroundColor: '#50C878',
            img: progressify,
            price: '$5.00/mo',
            trial: '7-day free trial',
            buttonVariant: 'primary',
            buttonText: 'Install app',
            isDisabled: false,
            minHeight: '200px'
        }
    ];

    const { query } = usePage().props.ziggy;

    const fetchData = async () => {
        try {
            const response = await fetch(route('search', { query: queryValue, ...query, financial_status: onFiancialStatusChange, fulfillment_status: onFulfillStatusChange, sync_orders: syncOrders }));
            const result = await response.json();
            handleData(result)
        } catch (err) {
            console.error("API Failed =>", err);
        }
    };

    useEffect(() => {
        if (reload) {
            fetchData();
        }
    }, [reload]);

    useEffect(() => {
        setReload(true)
    }, [queryValue]);

    useEffect(() => {
        setReload(true)
    }, [onFiancialStatusChange]);

    useEffect(() => {
        setReload(true)
    }, [onFulfillStatusChange])



    return (
        <Box paddingInline={'800'}>
            <Page title='Dashboard' >

                <Card sectioned>
                    <Box>
                        <Text variant="headingLg" as="h2">
                            Welcome James 👋
                        </Text>
                        <Box paddingBlockStart="200">
                            <Text variant="bodyMd" tone="subdued">
                                Create your first checkout link in seconds. Here are 3 ways you can use your link.
                            </Text>
                        </Box>
                    </Box>

                    <Box paddingBlockStart="400">
                        <Box padding="300">

                            <InlineStack gap="400" align="start" wrap={false}>
                                {featuresData.map((feature, index) => (
                                    <Box key={index} minWidth="0" maxWidth="none" padding="200">
                                        <InlineStack gap="200" blockAlign="start">
                                            {/* <Box>
                                                <div style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '4px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <Text variant="bodySm" tone="text-inverse">{feature.icon}</Text>
                                                </div>
                                            </Box> */}
                                            <InlineStack>
                                            <Icon source={feature.icon} tone="base" />

                                            </InlineStack>
                                            <Box>
                                                <Text variant="headingSm" as="h3">
                                                    {feature.title}
                                                </Text>
                                                <Box paddingBlockStart="100">
                                                    <Text variant="bodyMd" tone="subdued">
                                                        {feature.description}
                                                    </Text>
                                                </Box>
                                            </Box>
                                        </InlineStack>
                                    </Box>
                                ))}
                            </InlineStack>


                            <Box paddingBlockStart="600">
                                <Button variant="primary" size="large" fullWidth>
                                    🔗 Build your first link
                                </Button>
                            </Box>
                        </Box>
                    </Box>
                </Card>


                <Box paddingBlockStart="400">
                    <InlineStack gap="400" align="stretch">

                        <Card sectioned>
                            <Box>
                                <Text variant="headingMd" as="h3">
                                    How it works
                                </Text>
                                <Box paddingBlockStart="300">
                                    <Text variant="bodyMd" tone="subdued">
                                        Get the most out of checkout links by following these simple steps.
                                    </Text>
                                </Box>
                                <Box paddingBlockStart="400">
                                    <Button variant="secondary">
                                        Learn more
                                    </Button>
                                </Box>
                            </Box>
                        </Card>


                        <Card sectioned>
                            <Box width='100%' minWidth='450px'>
                                <Text variant="headingMd" as="h3">
                                    Need a hand? We're here to help
                                </Text>
                                <Box paddingBlockStart="300">
                                    <Box paddingBlockEnd="200">
                                        <Button variant="plain" textAlign="left" fullWidth>
                                            💬 Start a live chat
                                        </Button>
                                    </Box>
                                    <Box paddingBlockEnd="200">
                                        <Button variant="plain" textAlign="left" fullWidth>
                                            ✉️ Send us an email
                                        </Button>
                                    </Box>
                                    <Box>
                                        <Button variant="plain" textAlign="left" fullWidth>
                                            ❓ See our FAQs
                                        </Button>
                                    </Box>
                                </Box>
                            </Box>
                        </Card>
                    </InlineStack>
                </Box>


                <Box paddingBlockStart="400">
                    <Card sectioned>
                        <Box>
                            <InlineStack align="space-between" blockAlign="start">
                                <Text variant="headingLg" as="h2">
                                    Level up your store in 3 simple steps
                                </Text>
                                <Button variant="plain" icon="X" accessibilityLabel="Close">
                                </Button>
                            </InlineStack>

                            <Box paddingBlockStart="600">
                                <Grid>
                                    {appsData.map((app, index) => (
                                        <Grid.Cell key={index} columnSpan={{ xs: 12, sm: 6, md: 4, lg: 4, xl: 4 }}>
                                            <Card>
                                                <Box padding="400" minHeight={app.minHeight}>
                                                    <BlockStack gap="400" align="center">
                                                        <Box textAlign="center">
                                                            <div style={{
                                                                width: '64px',
                                                                height: '64px',
                                                                backgroundColor: app.img ? 'transparent' : app.backgroundColor,
                                                                borderRadius: '12px',
                                                                margin: '0 auto',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}>
                                                                {app.img ? (
                                                                    <img 
                                                                        src={app.img} 
                                                                        alt={app.name} 
                                                                        style={{
                                                                            width: '64px',
                                                                            height: '64px',
                                                                            borderRadius: '12px',
                                                                            objectFit: 'cover'
                                                                        }}
                                                                    />
                                                                ) : app.icon ? (
                                                                    <Text variant="headingMd" tone="text-inverse">
                                                                        {app.icon}
                                                                    </Text>
                                                                ) : null}
                                                            </div>
                                                        </Box>

                                                        <BlockStack gap="200" align="center">
                                                            <Text variant="headingMd" as="h3" alignment="center">
                                                                {app.name}
                                                            </Text>
                                                            <Text variant="bodyMd" tone="subdued" alignment="center">
                                                                {app.description}
                                                            </Text>
                                                            {app.price && (
                                                                <BlockStack gap="100" align="center">
                                                                    <Text variant="headingMd" as="h4" alignment="center">
                                                                        {app.price}
                                                                    </Text>
                                                                    <Text variant="bodyMd" tone="subdued" alignment="center">
                                                                        {app.trial}
                                                                    </Text>
                                                                </BlockStack>
                                                            )}
                                                        </BlockStack>

                                                        <Box width="100%">
                                                            <Button
                                                                variant={app.buttonVariant}
                                                                fullWidth
                                                                disabled={app.isDisabled}
                                                            >
                                                                {app.buttonText}
                                                            </Button>
                                                        </Box>
                                                    </BlockStack>
                                                </Box>
                                            </Card>
                                        </Grid.Cell>
                                    ))}
                                </Grid>
                            </Box>


                        </Box>
                    </Card>
                    <Box paddingBlockStart="600">

                        <Text variant="bodyMd" tone="subdued" alignment='center'>
                            Need any help or best practices? Just{' '}
                            <Button variant="plain" textDecorationLine="underline">
                                reach out
                            </Button>
                            {' '}and we're happy to help.
                        </Text>

                    </Box>
                </Box>
            </Page>
        </Box>
    )
}



function isEmpty(value) {
    if (Array.isArray(value)) {
        return value.length === 0;
    } else {
        return value === '' || value == null;
    }
}

