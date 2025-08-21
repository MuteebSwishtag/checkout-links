import React from 'react';
import {
    Page,
    Card,
    Text,
    Button,
    BlockStack,
    InlineStack,
    Box,
    Icon,
} from '@shopify/polaris';
import { PlusIcon } from '@shopify/polaris-icons';
import { router } from '@inertiajs/react';
import Image1 from '@/Pages/Images/image1.jpeg';
import Image2 from '@/Pages/Images/image2.jpeg'

export default function HowItWorks() {
    const handleCreateNewLink = () => {
        router.visit(route('create-link'));
    };

    return (
        <Page title="How it works" primaryAction={{ content: 'Create a new link', onAction: handleCreateNewLink }}>

            {/* Header */}
            {/* <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.4rem'
                }}>
                    <Text variant="heading2xl" as="h1" fontWeight="bold">
                        How it works
                    </Text>
                    <Button
                        variant="primary"
                        onClick={handleCreateNewLink}
                        icon={PlusIcon}
                    >
                        Create a new link
                    </Button>
                </div> */}

            {/* Video Section */}
            <BlockStack gap="400">
                <Card>
                    <div style={{
                        position: 'relative',
                        paddingBottom: '56.25%',
                        overflow: 'hidden',
                        borderRadius: '12px',
                        backgroundColor: '#f6f6f7'
                    }}>
                        <iframe
                            src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                border: 'none',
                                borderRadius: '12px'
                            }}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                    <Box paddingBlockEnd='300' paddingBlockStart='300'>

                        <Text variant='headingMd' as='h4'>Creating a checkout link</Text>
                    </Box>


                </Card>


                <Card padding={'0'}>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',

                        alignItems: 'center',

                    }}>
                        <div className='flex justify-center p-12 flex-col '>
                            <Text variant="headingLg" as="h4" fontWeight="bold">
                                Turn your ads into instant checkout experiences
                            </Text>
                            <div style={{ marginTop: '0.6rem' }}>
                                <Text variant="bodyLg" as='p' tone="base">
                                    Cut the distractions. Your ads, emails, social
                                    posts and other marketing campaigns become.
                                    instant checkout links.
                                </Text>
                            </div>
                            <div style={{ marginTop: '10px' }}>
                                <Button variant="secondary" onClick={handleCreateNewLink}>
                                    Create a link
                                </Button>
                            </div>
                        </div>
                        <div>


                            <img src={Image1} className='object-cover' alt="" />

                        </div>
                    </div>

                </Card>

                {/* Second Feature */}
                <Card padding={'0'}>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '3rem',
                        alignItems: 'center'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}>
                            <img src={Image2} alt="" />
                        </div>
                        <div className='p-8'>
                            <Text variant="headingLg" as="h4" fontWeight="bold">
                                The better way to send draft orders
                            </Text>
                            <div style={{ marginTop: '0.6rem' }}>
                                <Text variant="bodyLg" tone="base">
                                    Activate a popup message that allows customer
                                    to view a summary of their order. Allow them to
                                    make any edits to the items before proceeding,
                                </Text>
                            </div>
                            <div style={{ marginTop: '10px' }}>
                                <Button variant="secondary" onClick={handleCreateNewLink}>
                                    Create a link
                                </Button>
                            </div>
                        </div>
                    </div>

                </Card>

                <Box>
                    <Text variant="bodyMd" tone="subdued" alignment='center'>
                        Need any help or best practices? Just{' '}
                        <Button variant="plain" textDecorationLine="underline">
                            reach out
                        </Button>
                        {' '}and we're happy to help.
                    </Text>

                </Box>
            </BlockStack>




        </Page>
    );
}
