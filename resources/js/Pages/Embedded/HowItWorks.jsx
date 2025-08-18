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
        <Page>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '2rem',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '3rem'
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
                </div>

                {/* Video Section */}
                <Card>


                    <div style={{
                        position: 'relative',
                        paddingBottom: '56.25%', // 16:9 aspect ratio
                        height: 0,
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

                </Card>

                {/* Feature Sections */}
                <div style={{ marginTop: '3rem' }}>
                    <BlockStack gap="600">
                        {/* First Feature */}
                        <Card padding={'0'}>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',

                                alignItems: 'center',

                            }}>
                                <div className='flex justify-center p-12 flex-col '>
                                    <Text variant="headingXl" as="h3" fontWeight="bold">
                                        Turn your ads into instant checkout experiences
                                    </Text>
                                    <div style={{ marginTop: '1rem' }}>
                                        <Text variant="bodyLg" color="subdued">
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
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}>

                                    {/* Mobile mockup */}
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
                                    <Text variant="headingXl" as="h3" fontWeight="bold">
                                        The better way to send draft orders
                                    </Text>
                                    <div style={{ marginTop: '1rem' }}>
                                        <Text variant="bodyLg" color="subdued">
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
                    </BlockStack>
                </div>

                {/* Footer Section */}
                <div style={{ marginTop: '4rem' }}>
               
                       
                            <Text variant="bodyMd" tone="subdued" alignment='center'>
                                Need any help or best practices? Just{' '}
                                <Button variant="plain" textDecorationLine="underline">
                                    reach out
                                </Button>
                                {' '}and we're happy to help.
                            </Text>
                 
                
                </div>
            </div>
        </Page>
    );
}
