import React, { useState, useCallback, useRef } from 'react';
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
    Grid,
    Modal,
    Listbox,
    Popover,
    EmptySearchResult,
    DataTable,
    ResourceList,
    ResourceItem,
    Avatar,
    Thumbnail,
} from '@shopify/polaris';
import { ChevronDownIcon, ChevronUpIcon, SearchIcon, FilterIcon, DeleteIcon, DragHandleIcon } from '@shopify/polaris-icons';
import { Link, router, usePage } from '@inertiajs/react';
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import Discount from './Discount';
import PopupMessage from './PopupMessage';

export default function CreateLink() {
    const { props } = usePage();
    const query = props.query || {};
    
    const [linkName, setLinkName] = useState('');
    const [linkId, setLinkId] = useState('');
    const [productsOpen, setProductsOpen] = useState(true);
    const [discountsOpen, setDiscountsOpen] = useState(false);
    const [popupMessageOpen, setPopupMessageOpen] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState(0);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [productSearchValue, setProductSearchValue] = useState('');
    const [filterPopoverActive, setFilterPopoverActive] = useState(false);
    const [selectedProductItems, setSelectedProductItems] = useState([]);

    // Sample product data to match the image
    const productData = [
        { id: 'gift-card', title: 'Gift Card', type: 'gift-card', price: 10.00, image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI4IiB5PSIxMCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjIwIiByeD0iMiIgc3Ryb2tlPSIjODA4NTg5IiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=' },
        { id: 'gift-card-10', title: '$10', type: 'gift-card', price: 10.00 },
        { id: 'gift-card-25', title: '$25', type: 'gift-card', price: 25.00 },
        { id: 'gift-card-50', title: '$50', type: 'gift-card', price: 50.00 },
        { id: 'gift-card-100', title: '$100', type: 'gift-card', price: 100.00 },
        { 
            id: 'selling-plans-ski-wax', 
            title: 'Selling Plans Ski Wax', 
            type: 'product', 
            price: 24.95, 
            available: 10,
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSIyIiBmaWxsPSIjRjRCQzUxIi8+PC9zdmc+',
            variant: 'Default'
        },
        { 
            id: 'plans-ski-wax', 
            title: 'Plans Ski Wax', 
            type: 'product', 
            price: 24.95, 
            available: 10,
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSIyIiBmaWxsPSIjRjRCQzUxIi8+PC9zdmc+',
            variant: 'Default'
        },
        { 
            id: 'special-selling-plans-ski-wax', 
            title: 'Special Selling Plans Ski Wax', 
            type: 'product', 
            price: 49.95, 
            available: 10,
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSIyIiBmaWxsPSIjRjRCQzUxIi8+PC9zdmc+',
            variant: 'Default'
        },
        { 
            id: 'sample-selling-plans-ski-wax', 
            title: 'Sample Selling Plans Ski Wax', 
            type: 'product', 
            price: 9.95, 
            available: 10,
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSIyIiBmaWxsPSIjRjRCQzUxIi8+PC9zdmc+',
            variant: 'Default'
        },
        { 
            id: 'fulfilled-snowboard', 
            title: 'The 3p Fulfilled Snowboard', 
            type: 'product', 
            price: 2629.95, 
            available: 20,
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSIyIiBmaWxsPSIjNjVCREE4Ii8+PC9zdmc+',
            variant: 'Default'
        },
        { 
            id: 'hydrogen-snowboard', 
            title: 'The Collection Snowboard: Hydrogen', 
            type: 'product', 
            price: 600.00, 
            available: 50,
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSIyIiBmaWxsPSIjNjI0REM2Ii8+PC9zdmc+',
            variant: 'Default' 
        },
        { 
            id: 'liquid-snowboard', 
            title: 'The Collection Snowboard: Liquid', 
            type: 'product', 
            price: 749.95, 
            available: 50,
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSIyIiBmaWxsPSIjMkU3MkQyIi8+PC9zdmc+',
            variant: 'Default'
        },
        { 
            id: 'oxygen-snowboard', 
            title: 'The Collection Snowboard: Oxygen', 
            type: 'product', 
            price: 1025.00, 
            available: 50,
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSIyIiBmaWxsPSIjNzQ0RkM2Ii8+PC9zdmc+',
            variant: 'Default'
        },
        { 
            id: 'compare-at-price-snowboard', 
            title: 'The Compare at Price Snowboard', 
            type: 'product', 
            price: 785.95, 
            available: 10,
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSIyIiBmaWxsPSIjNjI0REM2Ii8+PC9zdmc+',
            variant: 'Default'
        },
        { 
            id: 'complete-snowboard', 
            title: 'The Complete Snowboard', 
            type: 'product', 
            price: 699.95, 
            available: 10,
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSIyIiBmaWxsPSIjNjI0REM2Ii8+PC9zdmc+',
            variant: 'Default'
        },
        { 
            id: 'ice', 
            title: 'Ice', 
            type: 'product', 
            price: 699.95, 
            available: 10,
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSIyIiBmaWxsPSIjMkU3MkQyIi8+PC9zdmc+',
            variant: 'Blue'
        },
        { 
            id: 'dawn', 
            title: 'Dawn', 
            type: 'product', 
            price: 699.95, 
            available: 10,
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSIyIiBmaWxsPSIjQzA1NzE3Ii8+PC9zdmc+',
            variant: 'Orange'
        },
        { 
            id: 'powder', 
            title: 'Powder', 
            type: 'product', 
            price: 699.95, 
            available: 10,
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSIyIiBmaWxsPSIjRkZGRkZGIiBzdHJva2U9IiNFMUUzRTUiLz48L3N2Zz4=',
            variant: 'White'
        },
        { 
            id: 'electric', 
            title: 'Electric', 
            type: 'product', 
            price: 699.95, 
            available: 10,
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSIyIiBmaWxsPSIjNUI4MkVFIi8+PC9zdmc+',
            variant: 'Light Blue'
        },
        { 
            id: 'sunset', 
            title: 'Sunset', 
            type: 'product', 
            price: 699.95, 
            available: 10,
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSIyIiBmaWxsPSIjRUI3NTQxIi8+PC9zdmc+',
            variant: 'Orange'
        }
    ];

    const handleLinkNameChange = useCallback((value) => setLinkName(value), []);
    const handleLinkIdChange = useCallback((value) => setLinkId(value), []);
    
    const handleProductsToggle = useCallback(() => setProductsOpen(!productsOpen), [productsOpen]);
    const handleDiscountsToggle = useCallback(() => setDiscountsOpen(!discountsOpen), [discountsOpen]);
    const handlePopupMessageToggle = useCallback(() => setPopupMessageOpen(!popupMessageOpen), [popupMessageOpen]);
    
    const handleProductModalOpen = useCallback(() => setIsProductModalOpen(true), []);
    const handleProductModalClose = useCallback(() => setIsProductModalOpen(false), []);
    const handleProductSearchChange = useCallback((value) => setProductSearchValue(value), []);
    const toggleFilterPopover = useCallback(() => setFilterPopoverActive(!filterPopoverActive), [filterPopoverActive]);
    
    // Handle product selection - this gets called by ResourceList's onSelectionChange
    const handleProductSelection = useCallback((newSelectedItems) => {
        setSelectedProductItems(newSelectedItems);
        // Update the selected products count
        setSelectedProducts(newSelectedItems.length);
    }, []);
    
    // Handle drag and drop reordering of selected products
    const handleDragEnd = useCallback((result) => {
        if (!result.destination) return;
        
        const items = Array.from(selectedProductItems);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        
        setSelectedProductItems(items);
    }, [selectedProductItems]);
    
    // Remove a product from the selection
    const handleRemoveProduct = useCallback((productId) => {
        const newSelection = selectedProductItems.filter(id => id !== productId);
        setSelectedProductItems(newSelection);
        setSelectedProducts(newSelection.length);
    }, [selectedProductItems]);

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
                                <BlockStack gap="400">
                                    <InlineStack align="space-between" gap="400">
                                        <div style={{ flexGrow: 1 }}>
                                            <TextField
                                                prefix={<Icon source={() => <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm9.707 4.293-4.82-4.82A5.968 5.968 0 0 0 14 8 6 6 0 0 0 2 8a6 6 0 0 0 6 6 5.968 5.968 0 0 0 3.473-1.113l4.82 4.82a.997.997 0 0 0 1.414 0 .999.999 0 0 0 0-1.414z" fill="currentColor"/></svg>} />}
                                                placeholder="Search products"
                                                fullWidth
                                            />
                                        </div>
                                        <Button onClick={handleProductModalOpen}>Browse</Button>
                                    </InlineStack>

                                    {selectedProductItems.length > 0 && (
                                        <DragDropContext onDragEnd={handleDragEnd}>
                                            <Droppable droppableId="selected-products">
                                                {(provided) => (
                                                    <div
                                                        {...provided.droppableProps}
                                                        ref={provided.innerRef}
                                                    >
                                                        {selectedProductItems.map((productId, index) => {
                                                            const product = productData.find(item => item.id === productId);
                                                            if (!product) return null;
                                                            
                                                            return (
                                                                <Draggable key={productId} draggableId={productId} index={index}>
                                                                    {(provided) => (
                                                                        <div
                                                                            ref={provided.innerRef}
                                                                            {...provided.draggableProps}
                                                                            style={{
                                                                                ...provided.draggableProps.style,
                                                                                marginBottom: '8px',
                                                                                padding: '8px',
                                                                                backgroundColor: '#f9fafb',
                                                                                borderRadius: '4px',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'space-between'
                                                                            }}
                                                                        >
                                                                            <InlineStack gap="400" align="center">
                                                                                <div {...provided.dragHandleProps}>
                                                                                    <Icon source={DragHandleIcon} color="base" />
                                                                                </div>
                                                                                {product.image && (
                                                                                    <Thumbnail
                                                                                        source={product.image}
                                                                                        alt={product.title}
                                                                                        size="small"
                                                                                    />
                                                                                )}
                                                                                <div>
                                                                                    <Text fontWeight="medium">{product.title}</Text>
                                                                                    {product.variant && (
                                                                                        <Text color="subdued" variant="bodySm">
                                                                                            {product.variant}
                                                                                        </Text>
                                                                                    )}
                                                                                </div>
                                                                            </InlineStack>
                                                                            <InlineStack gap="200">
                                                                                <Button variant="plain" onClick={() => handleRemoveProduct(productId)}>
                                                                                    <Icon source={DeleteIcon} color="base" />
                                                                                </Button>
                                                                                <Button variant="plain" size="slim">Edit</Button>
                                                                            </InlineStack>
                                                                        </div>
                                                                    )}
                                                                </Draggable>
                                                            );
                                                        })}
                                                        {provided.placeholder}
                                                    </div>
                                                )}
                                            </Droppable>
                                        </DragDropContext>
                                    )}
                                </BlockStack>
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
                            <Box padding="">
                                <Discount/>
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
                            <Box padding="">
                                <PopupMessage/>
                            </Box>
                        </Collapsible>
                    </BlockStack>
                </Card>
            </BlockStack>

            </Grid.Cell>
            <Grid.Cell columnSpan={{xs: 12, sm: 6, md: 6, lg:6, xl: 6}}>
              <BlockStack gap='400'>
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
                </BlockStack>
                </Grid.Cell>
            </Grid>
            
            {/* Product Selection Modal */}
            <Modal
                open={isProductModalOpen}
                onClose={handleProductModalClose}
                title="Select products"
                primaryAction={{
                    content: 'Done',
                    onAction: handleProductModalClose,
                }}
                secondaryActions={[
                    {
                        content: 'Cancel',
                        onAction: handleProductModalClose,
                    },
                ]}
                footer={
                    <div style={{ padding: '12px 16px', textAlign: 'left' }}>
                        <Text>{selectedProductItems.length} products selected</Text>
                    </div>
                }
            >
                <Modal.Section>
                    <BlockStack gap="400">
                        {/* Search and Filter Section */}
                        <InlineStack gap="400" align="start">
                            <div style={{ flexGrow: 1 }}>
                                <TextField
                                    label=""
                                    value={productSearchValue}
                                    onChange={handleProductSearchChange}
                                    prefix={<Icon source={SearchIcon} />}
                                    placeholder="Search products"
                                    clearButton
                                    onClearButtonClick={() => setProductSearchValue('')}
                                    autoComplete="off"
                                />
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                <Popover
                                    active={filterPopoverActive}
                                    activator={
                                        <Button onClick={toggleFilterPopover} icon={FilterIcon}>
                                            Add filter
                                        </Button>
                                    }
                                    onClose={toggleFilterPopover}
                                >
                                    <Box padding="400">
                                        <Text variant="headingSm" as="h3">Filter options</Text>
                                    </Box>
                                </Popover>
                            </div>
                        </InlineStack>
                        
                        {/* Product List using ResourceList */}
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <ResourceList
                                resourceName={{ singular: 'product', plural: 'products' }}
                                items={[
                                    // Gift Card Category Header
                                    {
                                        id: 'gift-card',
                                        name: 'Gift Card',
                                        isCategory: true,
                                        image: productData.find(item => item.id === 'gift-card')?.image,
                                    },
                                    // Gift Card Items
                                    ...productData.filter(item => item.type === 'gift-card' && item.id !== 'gift-card').map(item => ({
                                        id: item.id,
                                        name: item.title,
                                        isGiftCardItem: true,
                                        price: item.price,
                                    })),
                                    // Regular Products
                                    ...productData.filter(item => item.type === 'product').map(item => ({
                                        id: item.id,
                                        name: item.title,
                                        variant: item.variant,
                                        available: item.available,
                                        price: item.price,
                                        image: item.image,
                                    }))
                                ]}
                                selectedItems={selectedProductItems}
                                onSelectionChange={handleProductSelection}
                                selectable
                                renderItem={(item) => {
                                    const isSelected = selectedProductItems.includes(item.id);
                                    
                                    // Category Header (Gift Card)
                                    if (item.isCategory) {
                                        return (
                                            <ResourceItem
                                                id={item.id}
                                                media={
                                                    <Thumbnail
                                                        source={item.image}
                                                        alt={item.name}
                                                        size="small"
                                                    />
                                                }
                                                verticalAlignment="center"
                                                accessibilityLabel={`Select ${item.name}`}
                                                name={item.name}
                                                style={{
                                                    backgroundColor: '#F6F6F7',
                                                    padding: '12px 16px',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                <Text fontWeight="semibold">{item.name}</Text>
                                            </ResourceItem>
                                        );
                                    }
                                    
                                    // Gift Card Items
                                    if (item.isGiftCardItem) {
                                        return (
                                            <ResourceItem
                                                id={item.id}
                                                verticalAlignment="center"
                                                accessibilityLabel={`Select ${item.name}`}
                                                name={item.name}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Text>{item.name}</Text>
                                                    <Text>${item.price.toFixed(2)}</Text>
                                                </div>
                                            </ResourceItem>
                                        );
                                    }
                                    
                                    // Regular Products
                                    return (
                                        <ResourceItem
                                            id={item.id}
                                            media={
                                                <Thumbnail
                                                    source={item.image}
                                                    alt={item.name}
                                                    size="small"
                                                />
                                            }
                                            verticalAlignment="center"
                                            accessibilityLabel={`Select ${item.name}`}
                                            name={item.name}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                <div>
                                                    <Text fontWeight="medium">{item.name}</Text>
                                                    {item.variant && (
                                                        <Text color="subdued" variant="bodySm">
                                                            {item.variant}
                                                        </Text>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                    <Text>{item.available} available</Text>
                                                    <Text>${item.price.toFixed(2)}</Text>
                                                </div>
                                            </div>
                                        </ResourceItem>
                                    );
                                }}
                            />
                        </div>
                    </BlockStack>
                </Modal.Section>
            </Modal>
        </Page>
    );
}
