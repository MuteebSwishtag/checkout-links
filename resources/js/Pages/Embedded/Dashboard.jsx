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
import { router, usePage } from '@inertiajs/react';
import { CartIcon, LogoMetaIcon, SandboxIcon, ChevronRightIcon, ChartFunnelIcon, EmailIcon, EmailFollowUpIcon, QuestionCircleIcon, StatusActiveIcon } from '@shopify/polaris-icons';
import bundle from '@/Pages/Images/Bundlo.png';
import progressify from '@/Pages/Images/Progressify.png'
import '@/Components/style.css';

export default function Dashboard() {
    const [reload, setReload] = useState(true);
    const [onFiancialStatusChange, setonFiancialStatusChange] = useState('');
    const [onFulfillStatusChange, setonFulfillStatusChange] = useState('');
    const [queryValue, setQueryValue] = useState('');
    const [links, setLinks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [themeStatus, setThemeStatus] = useState(null);
    const page = usePage().props;
    const query = page.ziggy.query;

    const featuresData = [
        {
            icon: CartIcon,
            title: 'Pre-built carts for shoppers',
            description: 'Make the decision for them'
        },
        {
            icon: LogoMetaIcon,
            title: 'Turn ad clicks into instant sales',
            description: 'Create instant sales funnels with no code'
        },
        {
            icon: ChartFunnelIcon,
            title: 'Plug & play funnel links',
            description: 'Use checkout links across quizzes and pages'
        }
    ];

    const fetchLinks = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(route('links.get'));
            const data = await response.json();
            setLinks(data);
        } catch (error) {
            console.error("Error fetching links:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Check theme status
    const checkThemeStatus = async () => {
        try {
            const response = await fetch(`/api/theme-status-check?shop=${query.shop}`);
            const data = await response.json();
            setThemeStatus(data.theme_status);
        } catch (error) {
            console.error("Error checking theme status:", error);
            setThemeStatus(0); // Default to not configured
        }
    };

    useEffect(() => {
        fetchLinks();
        checkThemeStatus();
    }, []);

    // Function to redirect to theme editor
    const redirectToThemeEditor = async () => {
        try {
            setIsRedirecting(true);
            const response = await fetch(route('theme.status', { shop: query.shop }));

            if (response.status === 201) {
                const editorUrl = await response.json();
                // Open the theme editor URL in a new tab
                window.open(editorUrl, '_blank');
            } else {
                const errorData = await response.json();
                console.error("Theme editor redirection failed:", errorData);
                alert("Unable to access theme editor. Theme may already be configured.");
            }
        } catch (error) {
            console.error("Theme editor redirection error:", error);
            alert("There was an error accessing the theme editor.");
        } finally {
            setIsRedirecting(false);
        }
    };

    const appsData = [
        {
            name: 'Checkout Links',
            description: 'One-click checkout links for every campaign or ticket',
            icon: '',
            backgroundColor: '#E0E0E0',
            buttonVariant: 'secondary',
            buttonText: 'Installed ',
            isDisabled: true,
            minHeight: '1200px',
            price: '', // Empty price to maintain structure
            trial: '', // Empty trial to maintain structure
        },
        {
            name: 'Bundilo',
            description: 'Create full-page, guided bundle experiences that convert',
            // icon: '📦',
            // backgroundColor: '',
            img: bundle,
            price: '$8.99/mo',
            trial: '7-day free trial',
            buttonVariant: 'primary',
            buttonText: 'Install app',
            isDisabled: false,
            minHeight: '280px',
            link: 'https://apps.shopify.com/bundilo?st_source=autocomplete&surface_detail=autocomplete_apps'
        },
        {
            name: 'Progressify',
            description: 'Increase AOV with a free shipping progress bar & GWP Upsell',
            // icon: '📊',
            // backgroundColor: '#50C878',
            img: progressify,
            price: '$5.00/mo',
            trial: '7-day free trial',
            buttonVariant: 'primary',
            buttonText: 'Install app',
            isDisabled: false,
            minHeight: '280px',
            link: 'https://apps.shopify.com/progressify?st_source=autocomplete&surface_detail=autocomplete_apps'
        }
    ];

    // const fetchData = async () => {
    //     try {
    //         const response = await fetch(route('search', { query: queryValue, ...query, financial_status: onFiancialStatusChange, fulfillment_status: onFulfillStatusChange, sync_orders: syncOrders }));
    //         const result = await response.json();
    //         handleData(result)
    //     } catch (err) {
    //         console.error("API Failed =>", err);
    //     }
    // };

    // useEffect(() => {
    //     if (reload) {
    //         fetchData();
    //     }
    // }, [reload]);

    // useEffect(() => {
    //     setReload(true)
    // }, [queryValue]);

    // useEffect(() => {
    //     setReload(true)
    // }, [onFiancialStatusChange]);

    // useEffect(() => {
    //     setReload(true)
    // }, [onFulfillStatusChange])




    return (
        <Box paddingInline={'800'}>
            <Page title=''
                primaryAction={{
                    content: 'Create checkout link',
                    onAction: () => router.get(route('links.create', query)),
                }}
                secondaryActions={[
                    {
                        content: isRedirecting ? 'Opening Theme Editor...' : themeStatus === 0 ? 'Setup Theme Editor' : 'Open Theme Editor',
                        loading: isRedirecting,
                        disabled: isRedirecting,
                        onAction: redirectToThemeEditor,
                    },
                ]}
            >
                {/* Show features card if no links, otherwise show recent order links card */}
                {/* Show skeleton loading state while data is being fetched */}
                {isLoading ? (
                    <Card>
                        <Box>
                            {/* Skeleton for title */}
                            <div
                                style={{
                                    height: '32px',
                                    width: '200px',
                                    backgroundColor: '#f0f0f0',
                                    borderRadius: '4px',
                                    marginBottom: '16px',
                                    animation: 'pulse 1.5s infinite ease-in-out'
                                }}
                            />

                            {/* Skeleton for subtitle text */}
                            <div
                                style={{
                                    height: '20px',
                                    width: '80%',
                                    backgroundColor: '#f0f0f0',
                                    borderRadius: '4px',
                                    marginTop: '8px',
                                    animation: 'pulse 1.5s infinite ease-in-out'
                                }}
                            />
                        </Box>

                        <Box paddingBlockStart="500">
                            <Grid>
                                {/* Skeleton for feature cards */}
                                {[1, 2, 3].map((item) => (
                                    <Grid.Cell key={item} columnSpan={{ xs: 12, sm: 6, md: 6, lg: 4, xl: 4 }}>
                                        <Box background='bg-surface-secondary' borderRadius='200' padding="400" height="100%">
                                            <InlineStack gap="100" blockAlign="start">
                                                {/* Skeleton for icon */}
                                                <div
                                                    style={{
                                                        height: '24px',
                                                        width: '24px',
                                                        backgroundColor: '#e0e0e0',
                                                        borderRadius: '4px',
                                                        animation: 'pulse 1.5s infinite ease-in-out'
                                                    }}
                                                />

                                                {/* Skeleton for title */}
                                                <div
                                                    style={{
                                                        height: '20px',
                                                        width: '150px',
                                                        backgroundColor: '#e0e0e0',
                                                        borderRadius: '4px',
                                                        animation: 'pulse 1.5s infinite ease-in-out'
                                                    }}
                                                />
                                            </InlineStack>

                                            {/* Skeleton for description */}
                                            <Box paddingBlockStart={"200"}>
                                                <div
                                                    style={{
                                                        height: '16px',
                                                        width: '90%',
                                                        backgroundColor: '#e0e0e0',
                                                        borderRadius: '4px',
                                                        animation: 'pulse 1.5s infinite ease-in-out'
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                    </Grid.Cell>
                                ))}
                            </Grid>

                            {/* Skeleton for button */}
                            <Box paddingBlockStart="600">
                                <div
                                    style={{
                                        height: '44px',
                                        width: '100%',
                                        backgroundColor: '#e0e0e0',
                                        borderRadius: '4px',
                                        animation: 'pulse 1.5s infinite ease-in-out'
                                    }}
                                />
                            </Box>
                        </Box>

                        <style>
                            {`
                            @keyframes pulse {
                                0% { opacity: 0.6; }
                                50% { opacity: 1; }
                                100% { opacity: 0.6; }
                            }
                            `}
                        </style>
                    </Card>
                ) : (!links || links.length === 0) ? (
                    <Card >
                        <Box>
                            <Text variant="headingLg" as="h2" >
                                <p className='text-black font-bold'>Welcome James 👋
                                </p>                             </Text>
                            <Box paddingBlockStart="200">
                                <Text variant="bodyMd" >
                                    <p className='text-black'>Create your first checkout link in seconds. Here are 3 ways you can use your link.</p>
                                </Text>
                            </Box>
                        </Box>
                        <Box paddingBlockStart="500">
                            <Grid>
                                {featuresData.map((feature, index) => (
                                    <Grid.Cell key={index} columnSpan={{ xs: 12, sm: 6, md: 6, lg: 4, xl: 4 }}>
                                        <div className='main-icon-cstm'>
                                            <Box background='bg-surface-secondary' borderRadius='200' padding="400" height="100%">
                                                <InlineStack gap="100" blockAlign="start">
                                                    <Box >
                                                        <div className='text-black'><Icon source={feature.icon} tone="base" /></div>
                                                    </Box>
                                                    <Box maxWidth='200px'>
                                                        <BlockStack gap="200">
                                                            <Text variant="headingSm" as="h3">
                                                                <p className='text-black font-bold'>{feature.title}</p>
                                                            </Text>
                                                        </BlockStack>
                                                    </Box>
                                                </InlineStack>
                                                <Box paddingBlockStart={"200"}>
                                                    <Text variant="bodySm" tone="subdued">
                                                        <p className='text-black'>{feature.description}</p>
                                                    </Text>
                                                </Box>
                                            </Box>
                                        </div>
                                    </Grid.Cell>
                                ))}
                            </Grid>
                            <Box paddingBlockStart="600">
                                <Button variant="primary" size="large" fullWidth onClick={() => { console.log(router.get(route('links.create', query))) }}>
                                    🔗 Build your first link
                                </Button>
                            </Box>
                        </Box>
                    </Card>
                ) : (
                    <Card>
                        <InlineStack align="space-between" blockAlign="center">
                            <Text variant="headingLg" as="h2" fontWeight="bold">
                                Recent order links
                            </Text>
                            <Button variant="plain" onClick={() => router.get(route('links', query))} as='h2'>
                                View all links
                            </Button>
                        </InlineStack>

                        <Box paddingBlockStart="0" padding="0">
                            <div style={{ borderTop: '1px solid #F1F1F1', marginTop: 10 }} />
                            <Box padding="0">
                                <BlockStack gap="0">
                                    {links.map((link) => (
                                        <div
                                            key={link.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '12px 0',
                                                borderBottom: '1px solid #F1F1F1',
                                            }}
                                        >
                                            <Text variant="bodyLg" >{link.link_name || `Link #${link.id}`}</Text>
                                            <Box>
                                                <Button
                                                    onClick={() => router.get(route('links.edit', { ...query, id: link.id }))}
                                                    icon={ChevronRightIcon}
                                                    tone="base"
                                                    variant='plain'
                                                />
                                            </Box>
                                        </div>
                                    ))}
                                </BlockStack>
                            </Box>
                        </Box>
                    </Card>
                )}

                <Box paddingBlockStart="400">
                    <Grid>
                        <Grid.Cell columnSpan={{ xs: 12, sm: 6, md: 6, lg: 4, xl: 6 }}>
                            <Card sectioned>
                                <Box minHeight='107px'>
                                    <Text variant="headingMd" as="h3">
                                        <p className='text-black font-bold'>How it works</p>
                                    </Text>
                                    <Box paddingBlockStart="100" maxWidth='100'>
                                        <Text variant="bodyMd" tone="base">
                                            <p className='text-black'>Get the most out of checkout links by following these simple steps.</p>
                                        </Text>
                                    </Box>
                                    <Box paddingBlockStart="400">
                                        <Button variant="secondary" onClick={() => router.get(route('how-it-works', query))}>
                                            Learn more
                                        </Button>
                                    </Box>
                                </Box>
                            </Card>
                        </Grid.Cell>
                        {/* <Grid.Cell columnSpan={{ xs: 12, sm: 6, md: 6, lg: 4, xl: 6 }}>
                            <Card sectioned>
                                <Box width='100%' minWidth='500px'>
                                    <Text variant="headingMd" as="h3">
                                        <p className='text-black font-bold'></p>  Need a hand? We're here to help
                                    </Text>
                                    <Box paddingBlockStart="300">
                                        <Box paddingBlockEnd="">
                                            <Button variant="plain" textAlign="left" icon={<Icon source={EmailFollowUpIcon} tone="base" />} fullWidth>
                                                Start a live chat
                                            </Button>
                                        </Box>
                                        <Box paddingBlockEnd="">
                                            <Button variant="plain" textAlign="left" icon={<Icon source={EmailIcon} tone="base" />} fullWidth>
                                                Send us an email
                                            </Button>
                                        </Box>
                                        <Box paddingBlockEnd="">
                                            <Button variant="plain" textAlign="left" icon={<Icon source={QuestionCircleIcon} tone="base" />} fullWidth>
                                                See our FAQs
                                            </Button>
                                        </Box>
                                    </Box>
                                </Box>
                            </Card>
                       </Grid.Cell> */}
                    </Grid>
                </Box>
                <Box paddingBlockStart="400">
                    {/* <Card sectioned> */}
                        {/* <Box>
                            <InlineStack align="space-between" blockAlign="start">
                                <Text variant="headingMd" as="h4">
                                    <p className='text-black font-semibold'>Level up your store in 3 simple steps</p>
                                </Text>
                                <Button variant="plain" icon="X" accessibilityLabel="Close">
                                </Button>
                            </InlineStack> */}

                            {/* <Box paddingBlockStart="600">
                                <Grid>
                                    {appsData.map((app, index) => (
                                        <Grid.Cell key={index} columnSpan={{ xs: 12, sm: 6, md: 4, lg: 4, xl: 4 }}>
                                            <Card padding={index === 0 ? "" : "400"}>
                                                <Box padding="400" minHeight={'800px'} style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <Box textAlign="center" paddingBlockEnd="400" paddingBlockStart={index===0?'400':'0'}>
                                                        <div style={{
                                                            width: '64px',
                                                            height: '64px',
                                                            backgroundColor: app.img ? 'transparent' : app.backgroundColor,
                                                            borderRadius: '12px',
                                                            margin: index === 0 ? '0px auto' : '0 auto',
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

                                                    <Box paddingBlockStart={index === 0 ? '1000' : '0'} style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                                        <BlockStack gap="200" align="center">
                                                            <Box >

                                                                <Text variant="headingMd" as="h3" alignment="center">
                                                                    <p className='text-black font-bold'>{app.name}</p>
                                                                </Text>
                                                            </Box>
                                                            <Box paddingInline={index === 0 ? '1200' : '0'}>
                                                                <Text variant="bodyMd" tone="subdued" alignment="center">
                                                                    {app.description}
                                                                </Text>

                                                            </Box>
                                                            <BlockStack gap="100" align="center">
                                                                {app.price ? (
                                                                    <Text variant="headingMd" as="h4" alignment="center">
                                                                        <p className='text-black font-semibold'>{app.price}</p>
                                                                    </Text>
                                                                ) : (
                                                                    <Box minHeight="03px" /> // Placeholder space
                                                                )}
                                                                {app.trial ? (

                                                                    <Text variant="bodyMd" tone="subdued" alignment="center">
                                                                        {app.trial}
                                                                    </Text>
                                                                ) : (
                                                                    <Box minHeight="20px" /> // Placeholder space
                                                                )}
                                                            </BlockStack>
                                                        </BlockStack>

                                                        <Box width="100%" paddingBlockStart="400">
                                                            <Button
                                                                variant={app.buttonVariant}
                                                                fullWidth
                                                                disabled={app.isDisabled}
                                                                url={app.link}

                                                                target='_blank'
                                                            >
                                                                <Box padding={index === 0 ? '300' : ''} >
                                                                    <InlineStack gap='100'  blockAlign='center'>
                                                                        {index === 0 &&
  
                                                                            <Icon source={StatusActiveIcon} tone='base' />
                                                                        }
                                                                        <Text tone={index === 0 ? 'base' : 'default'}><p className={index === 0 ? 'text-black' : ' '}>{app.buttonText}</p></Text>

                                                                    </InlineStack>

                                                                </Box>
                                                            </Button>
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            </Card>
                                        </Grid.Cell>
                                    ))}
                                </Grid>
                            </Box> */}
                        {/* </Box>
                    </Card> */}
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

                {/* Theme Setup Card - Always show */}
                <Box paddingBlockStart="600">
                    <Card>
                        <BlockStack gap="400">
                            <InlineStack align="space-between" blockAlign="center">
                                <Text variant="headingMd" as="h2">{themeStatus === 0 ? 'Theme Setup Required' : 'Theme Editor'}</Text>
                                <Button
                                    onClick={redirectToThemeEditor}
                                    primary
                                    loading={isRedirecting}
                                    disabled={isRedirecting}
                                >
                                    {isRedirecting ? 'Opening...' : themeStatus === 0 ? 'Setup Theme Editor' : 'Open Theme Editor'}
                                </Button>
                            </InlineStack>
                            <Text variant="bodyMd">
                                {themeStatus === 0
                                    ? 'To complete your app installation, you need to set up your theme. Click the button above to open the theme editor and enable checkout link features on your store.'
                                    : 'Need to make changes to your theme? Click the button above to open the theme editor.'}
                            </Text>
                        </BlockStack>
                    </Card>
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

