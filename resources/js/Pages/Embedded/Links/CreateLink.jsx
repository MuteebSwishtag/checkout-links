import React, { useState, useCallback, useRef, useEffect } from 'react';
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
    Checkbox,
    Tooltip,
} from '@shopify/polaris';
import { ChevronDownIcon, ChevronUpIcon, SearchIcon, FilterIcon, XIcon, DragHandleIcon, DragDropIcon, CartIcon } from '@shopify/polaris-icons';
import { Link, router, usePage } from '@inertiajs/react';
import FormControlLabel from '@mui/material/FormControlLabel'
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
    const [popupProductChecked, setPopupProductChecked] = useState({});
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [discountData, setDiscountData] = useState({
        freeShipping: false,
        orderDiscount: false,
        discountValue: '20',
        discountCode: false,
        discountCodeValue: ''
    });
    const [popupMessageData, setPopupMessageData] = useState({
        isActive: false,
        headingText: 'Order summary',
        messageText: 'I hope you enjoy your 20% discount this order that I built for you, I look forward to sending them out to you!',
        countdownActive: false,
        timerText: '1 minute',
        copyText: 'This offer will expire in',
        allowDeselect: true,
        showPrice: false,
        showOrderTotal: true,
        checkoutButtonText: 'Confirm',
        closeButtonText: 'No thanks',
        closeButtonLink: '#'
    });

    // Sample product data to match the image
    const productData = [
        { id: 'gift-card', title: 'Gift Card', type: 'gift-card', price: 10.00, available: 10, image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI4IiB5PSIxMCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjIwIiByeD0iMiIgc3Ryb2tlPSIjODA4NTg5IiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=' },
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


    const handleProductSelection = useCallback((newSelectedItems) => {

        const selectedProducts = newSelectedItems.map(id => {
            const product = productData.find(item => item.id === id);
            let title = '';
            let variantName = '';


            if (product && product.type === 'gift-card' && product.id !== 'gift-card') {
                title = 'Gift Card';
                variantName = product.title;
            } else if (product) {
                title = product.title;
                variantName = product.variant || '';
            }

            return {
                id: id,
                title: title,
                variant: variantName,
                quantity: 1,
                price: product ? product.price : 0,
                image: product ? product.image : ''
            };
        });

        setSelectedProductItems(selectedProducts);
        // Update the selected products count
        setSelectedProducts(selectedProducts.length);

        // Initialize all products as checked in popup
        const checkedState = {};
        selectedProducts.forEach(product => {
            checkedState[product.id] = true;
        });
        setPopupProductChecked(checkedState);
    }, [productData]);

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
        const newSelection = selectedProductItems.filter(product => product.id !== productId);
        setSelectedProductItems(newSelection);
        setSelectedProducts(newSelection.length);

        // Remove from checkbox state
        setPopupProductChecked(prev => {
            const newState = { ...prev };
            delete newState[productId];
            return newState;
        });
    }, [selectedProductItems]);

    // Handle discount data changes from Discount component
    const handleDiscountChange = useCallback((discountInfo) => {
        setDiscountData(discountInfo);
    }, []);

    // Handle popup message data changes from PopupMessage component
    const handlePopupMessageChange = useCallback((popupInfo) => {
        setPopupMessageData(popupInfo);

        // Parse timer and start countdown when popup is active and countdown is enabled
        if (popupInfo.isActive && popupInfo.countdownActive && popupInfo.timerText) {
            const timeInSeconds = parseTimeToSeconds(popupInfo.timerText);
            setTimerSeconds(timeInSeconds);
            setIsTimerActive(true);
        } else {
            setIsTimerActive(false);
        }
    }, []);

    // Parse time string to seconds (e.g., "2 minutes" -> 120, "1 minute" -> 60, "30 seconds" -> 30)
    const parseTimeToSeconds = (timeString) => {
        const lowerCase = timeString.toLowerCase();
        const number = parseInt(lowerCase.match(/\d+/)?.[0] || 0);

        if (lowerCase.includes('minute')) {
            return number * 60;
        } else if (lowerCase.includes('second')) {
            return number;
        } else if (lowerCase.includes('hour')) {
            return number * 3600;
        }

        // Default to minutes if no unit specified
        return number * 60;
    };

    // Format seconds to MM:SS format
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Timer effect
    useEffect(() => {
        let interval = null;

        if (isTimerActive && timerSeconds > 0) {
            interval = setInterval(() => {
                setTimerSeconds(seconds => {
                    if (seconds <= 1) {
                        setIsTimerActive(false);
                        return 0;
                    }
                    return seconds - 1;
                });
            }, 1000);
        } else if (timerSeconds === 0) {
            setIsTimerActive(false);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isTimerActive, timerSeconds]);

    // Handle checkbox changes in popup message preview
    const handlePopupProductCheck = useCallback((productId, checked) => {
        setPopupProductChecked(prev => ({
            ...prev,
            [productId]: checked
        }));
    }, []);

    // Restart timer function
    const restartTimer = useCallback(() => {
        if (popupMessageData.isActive && popupMessageData.countdownActive && popupMessageData.timerText) {
            const timeInSeconds = parseTimeToSeconds(popupMessageData.timerText);
            setTimerSeconds(timeInSeconds);
            setIsTimerActive(true);
        }
    }, [popupMessageData.isActive, popupMessageData.countdownActive, popupMessageData.timerText]);

    return (
        <Page
            title='Create Link'
            backAction={{
                content: 'Links',
                onAction: () => router.visit(route('links', query))
            }}
        >

            <Grid >
                <Grid.Cell columnSpan={{ xs: 12, sm: 6, md: 6, lg: 6, xl: 6 }}>
                    <BlockStack gap="500">

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
                                                        prefix={<Icon source={() => <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm9.707 4.293-4.82-4.82A5.968 5.968 0 0 0 14 8 6 6 0 0 0 2 8a6 6 0 0 0 6 6 5.968 5.968 0 0 0 3.473-1.113l4.82 4.82a.997.997 0 0 0 1.414 0 .999.999 0 0 0 0-1.414z" fill="currentColor" /></svg>} />}
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
                                                                {selectedProductItems.map((product, index) => {
                                                                    if (!product) return null;

                                                                    return (
                                                                        <Draggable key={product.id} draggableId={product.id} index={index}>
                                                                            {(provided) => (
                                                                                <div
                                                                                    ref={provided.innerRef}
                                                                                    {...provided.draggableProps}
                                                                                    style={{
                                                                                        ...provided.draggableProps.style,
                                                                                        marginBottom: '8px',
                                                                                        padding: '10px',
                                                                                        borderBottom: '1px solid #e1e3e5',
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        justifyContent: 'space-between',
                                                                                    }}
                                                                                >
                                                                                    <InlineStack gap="400" >
                                                                                        <div {...provided.dragHandleProps} style={{ color: '#6d7175', display: 'flex', alignItems: 'center' }}>
                                                                                            <Icon source={DragHandleIcon} tone='base' />
                                                                                        </div>
                                                                                        <Thumbnail
                                                                                            source={product.image}
                                                                                            alt={product.name}
                                                                                            size="small"
                                                                                        />
                                                                                        <Box maxWidth="180px">
                                                                                            <div
                                                                                                style={{ display: 'inline-block', width: '100%' }}
                                                                                                title={product.title + (product.variant ? ` (${product.variant})` : '')}
                                                                                            >
                                                                                                <Text fontWeight="medium" truncate as="span">
                                                                                                    {product.title}

                                                                                                    {product.variant && ` (${product.variant})`}
                                                                                                </Text>
                                                                                            </div>
                                                                                            <Text variant="bodySm" tone="subdued">Quantity: {product.quantity} </Text>
                                                                                        </Box>
                                                                                    </InlineStack>
                                                                                    <InlineStack gap="200">
                                                                                        <Button variant="plain" onClick={() => handleRemoveProduct(product.id)}>
                                                                                            <Icon source={XIcon} tone='base' />
                                                                                        </Button>
                                                                                        {/* <Button variant="plain" size="slim">Edit</Button> */}
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
                                        <Discount onDiscountChange={handleDiscountChange} />
                                    </Box>
                                </Collapsible>
                            </BlockStack>
                        </Card>


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
                                        <PopupMessage onPopupMessageChange={handlePopupMessageChange} />
                                    </Box>
                                </Collapsible>
                            </BlockStack>
                        </Card>
                    </BlockStack>

                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 12, sm: 6, md: 6, lg: 6, xl: 6 }}>

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
                                <Text variant="bodyMd">Preview </Text>
                                <Button variant='plain'>Test</Button>
                            </InlineStack>

                            <Box background="" padding="400" borderRadius="2" border="base">
                                <BlockStack gap="300" align="center">
                                    <InlineStack blockAlign='center' align='space-between'>

                                        <InlineStack gap='050'>
                                            <Icon source={DragDropIcon} tone="base" />
                                            <Text tone={popupMessageData.isActive ? 'base' : 'disabled'}
                                                variant={popupMessageData.isActive ? 'bodyMd' : 'bodySm'}
                                                fontWeight={popupMessageData.isActive ? 'semibold' : 'regular'}>
                                                Preview popup message
                                            </Text>
                                        </InlineStack>
                                        <InlineStack gap='050'>
                                            <Icon source={CartIcon} tone={popupMessageData.isActive ? 'disabled' : 'base'} />
                                            <Text tone={popupMessageData.isActive ? 'disabled' : 'base'} fontWeight={popupMessageData.isActive ? 'regular' : 'semibold'}>Preview  checkout</Text>

                                        </InlineStack>
                                    </InlineStack>
                                    {!popupMessageData.isActive && (
                                        <Box background='bg-fill-disabled' padding={'400'} borderRadius='200' >
                                            {selectedProductItems.length === 0 ? (
                                                <Text variant="headingSm" as="h3" color="subdued">No products selected</Text>
                                            ) : (

                                                <Box background='' padding={'400'} borderRadius='200' border="base">
                                                    <BlockStack gap="400">

                                                        {selectedProductItems.map((product, index) => (
                                                            <InlineStack key={product.id} align="space-between" gap="400" blockAlign='center' padding="200" borderRadius="2" border="base">
                                                                <InlineStack gap="300" blockAlign='center' align='start'>
                                                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                                                        <Box
                                                                            background="bg-surface"
                                                                            padding="200"
                                                                            borderRadius="100"
                                                                            minWidth="40px"
                                                                            minHeight="40px"
                                                                        >
                                                                            <Thumbnail
                                                                                source={product.image || ""}
                                                                                alt={product.title}
                                                                                size="small"
                                                                            />
                                                                        </Box>
                                                                        <div
                                                                            style={{
                                                                                position: "absolute",
                                                                                top: '-3px',
                                                                                right: '-8px',
                                                                                zIndex: 1,
                                                                                backgroundColor: '#666666',
                                                                                color: 'white',
                                                                                borderRadius: '50%',
                                                                                minWidth: '22px',
                                                                                minHeight: '20px',

                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                border: '2px solid white'
                                                                            }}
                                                                        >
                                                                            <Text variant="captionMd" color="text-inverse" fontWeight="medium">
                                                                                {product.quantity || 1}
                                                                            </Text>
                                                                        </div>
                                                                    </div>
                                                                        <InlineStack align='center' blockAlign='center' >
                                                                    <Box maxWidth='180px'>
                                                                            <div title={product.title}>
                                                                                <Text
                                                                                    fontWeight="medium"
                                                                                    alignment="center"
                                                                                    truncate
                                                                                >
                                                                                    {product.title}
                                                                                </Text>
                                                                            </div>

                                                                    </Box>
                                                                        </InlineStack>
                                                                </InlineStack>
                                                                <Text fontWeight="medium" alignment="center">${product.price || '0.00'}</Text>
                                                            </InlineStack>
                                                        ))}


                                                        <InlineStack align="space-between" gap="">
                                                            <TextField
                                                                placeholder="Gift card"
                                                                autoComplete="off"
                                                            // connectedRight={
                                                            //     <Button variant="secondary">Apply</Button>
                                                            // }
                                                            />
                                                            <Button variant="secondary" >Apply</Button>
                                                        </InlineStack>


                                                        <InlineStack align="space-between">
                                                            <Text variant="headingXs" as="p">Subtotal • {selectedProductItems.length} item{selectedProductItems.length !== 1 ? 's' : ''}</Text>
                                                            <Text fontWeight="medium">
                                                                ${selectedProductItems.reduce((total, product) => {
                                                                    const price = parseFloat(product.price || 0);
                                                                    const quantity = parseInt(product.quantity || 1);
                                                                    return total + (price * quantity);
                                                                }, 0).toFixed(2)}
                                                            </Text>
                                                        </InlineStack>


                                                        <InlineStack align="space-between">
                                                            <Text color="subdued" variant="headingXs" as="p">Order discount</Text>
                                                            <Text color="subdued">
                                                                {discountData.orderDiscount ?
                                                                    `-${discountData.discountValue}%`
                                                                    : '-'
                                                                }
                                                            </Text>
                                                        </InlineStack>


                                                        <InlineStack align="space-between">
                                                            <Text color="subdued" variant="headingXs" as="p">Shipping</Text>
                                                            <Text color="subdued" variant="headingXs" as="p">Enter shipping address</Text>
                                                        </InlineStack>


                                                        <Box borderBlockStart="base" />

                                                        <InlineStack align="space-between">
                                                            <Text variant="headingLg" fontWeight="bold">Total</Text>
                                                            <InlineStack align="end" gap="200" blockAlign='center'>
                                                                <Text variant="headingXs" tone="subdued">AUD</Text>
                                                                <Text variant="headingLg" fontWeight="bold">
                                                                    ${(() => {
                                                                        const subtotal = selectedProductItems.reduce((total, product) => {
                                                                            const price = parseFloat(product.price || 0);
                                                                            const quantity = parseInt(product.quantity || 1);
                                                                            return total + (price * quantity);
                                                                        }, 0);

                                                                        const discount = discountData.orderDiscount ?
                                                                            subtotal * (parseFloat(discountData.discountValue) / 100) : 0;

                                                                        return (subtotal - discount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                                                                    })()}
                                                                </Text>
                                                            </InlineStack>
                                                        </InlineStack>
                                                    </BlockStack>
                                                </Box>

                                            )}

                                        </Box>
                                    )}

                                    {/* Popup Message Preview */}
                                    {popupMessageData.isActive && (
                                        <Box background='bg-fill-disabled' padding={'400'} borderRadius='200' >
                                            <Box background='' padding={'400'} borderRadius='200' border="base">
                                                <BlockStack gap="400">
                                                    {/* Popup Header */}
                                                    <InlineStack align="center">
                                                        <Text variant="headingLg" fontWeight="bold">{popupMessageData.headingText}</Text>
                                                    </InlineStack>

                                                    {/* Message Text */}
                                                    {popupMessageData.messageText && (
                                                        <Text variant="bodySm" alignment="center" tone="subdued">
                                                            {popupMessageData.messageText}
                                                        </Text>
                                                    )}

                                                    {/* Countdown Timer */}
                                                    {popupMessageData.countdownActive && (
                                                        <InlineStack align="center" gap="200">
                                                            <Text variant="bodyMd" tone="subdued">{popupMessageData.copyText}</Text>
                                                            <Text variant="bodyMd" fontWeight="bold" tone="critical">
                                                                {formatTime(timerSeconds)}
                                                            </Text>
                                                            {timerSeconds === 0 && (
                                                                <Button variant="plain" size="slim" onClick={restartTimer}>
                                                                    Restart
                                                                </Button>
                                                            )}
                                                        </InlineStack>
                                                    )}

                                                    {/* Products List */}
                                                    {selectedProductItems
                                                        .filter(product => popupProductChecked[product.id] !== false)
                                                        .map((product, index) => (
                                                            <InlineStack key={product.id} align="space-between" gap="400" blockAlign='center' padding="200" borderRadius="2" border="base">
                                                                <InlineStack gap="300" blockAlign='center' align='start'>
                                                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                                                        <Box
                                                                            background="bg-surface"
                                                                            padding="200"
                                                                            borderRadius="100"
                                                                            minWidth="40px"
                                                                            minHeight="40px"
                                                                        >
                                                                            <Thumbnail
                                                                                source={product.image || ""}
                                                                                alt={product.title}
                                                                                size="small"
                                                                            />
                                                                        </Box>
                                                                        <div
                                                                            style={{
                                                                                position: "absolute",
                                                                                top: '-3px',
                                                                                right: '-8px',
                                                                                zIndex: 1,
                                                                                backgroundColor: '#666666',
                                                                                color: 'white',
                                                                                borderRadius: '50%',
                                                                                minWidth: '22px',
                                                                                minHeight: '20px',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                border: '2px solid white'
                                                                            }}
                                                                        >
                                                                            <Text variant="captionMd" color="text-inverse" fontWeight="medium">
                                                                                {product.quantity || 1}
                                                                            </Text>
                                                                        </div>
                                                                    </div>
                                                                    <Box title={product.title}>
                                                                        <InlineStack align='space-between' blockAlign='center' >
                                                                            <InlineStack align='center' blockAlign='center' >
                                                                                <Box maxWidth='120px'>
                                                                                    <div title={product.title}>
                                                                                <Text fontWeight="medium" alignment='center' truncate>{product.title}</Text>

                                                                                    </div>

                                                                                </Box>
                                                                            </InlineStack>

                                                                        </InlineStack>
                                                                    </Box>
                                                                </InlineStack>
                                                                <InlineStack gap='300'>
                                                                    {popupMessageData.showPrice && (
                                                                        <Text fontWeight="medium" alignment="center">${product.price || '0.00'}</Text>
                                                                    )}

                                                                    {popupMessageData.allowDeselect && (
                                                                        <Box paddingBlockStart="100">

                                                                            <Checkbox
                                                                                label=""
                                                                                checked={popupProductChecked[product.id] !== false}
                                                                                onChange={(checked) => handlePopupProductCheck(product.id, checked)}

                                                                            />

                                                                        </Box>
                                                                    )}
                                                                </InlineStack>
                                                            </InlineStack>
                                                        ))}

                                                    {/* Order Total */}
                                                    {popupMessageData.showOrderTotal && (
                                                        <>
                                                            <Box borderBlockStart="base" />
                                                            <InlineStack align="space-between">
                                                                <Text variant="headingLg" fontWeight="bold">Total </Text>
                                                                <InlineStack align="end" gap="200" blockAlign='center'>
                                                                    <Text variant="headingXs" tone="subdued">AUD</Text>
                                                                    <Text variant="headingLg" fontWeight="bold">
                                                                        ${(() => {
                                                                            const subtotal = selectedProductItems
                                                                                .filter(product => popupProductChecked[product.id] !== false)
                                                                                .reduce((total, product) => {
                                                                                    const price = parseFloat(product.price || 0);
                                                                                    const quantity = parseInt(product.quantity || 1);
                                                                                    return total + (price * quantity);
                                                                                }, 0);

                                                                            const discount = discountData.orderDiscount ?
                                                                                subtotal * (parseFloat(discountData.discountValue) / 100) : 0;

                                                                            return (subtotal - discount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                                                                        })()}
                                                                    </Text>
                                                                </InlineStack>
                                                            </InlineStack>
                                                        </>
                                                    )}

                                                    {/* Action Buttons */}
                                                    <BlockStack gap="300">
                                                        <Button variant="primary" size="large" fullWidth>
                                                            {popupMessageData.checkoutButtonText}
                                                        </Button>
                                                        <InlineStack align="center">
                                                            <Button variant="plain">
                                                                {popupMessageData.closeButtonText}
                                                            </Button>
                                                        </InlineStack>
                                                    </BlockStack>
                                                </BlockStack>
                                            </Box>
                                        </Box>
                                    )}



                                </BlockStack>
                            </Box>
                        </BlockStack>
                    </Card>
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
                                selectedItems={selectedProductItems.map(item => item.id)}
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


                                    if (item.isGiftCardItem) {
                                        return (
                                            <ResourceItem
                                                id={item.id}
                                                verticalAlignment="center"
                                                accessibilityLabel={`Select ${item.name}`}
                                                name={item.name}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                    <div>
                                                        <Text fontWeight="medium">{item.name}</Text>
                                                        <Text variant="bodySm" color="subdued">Gift Card</Text>
                                                    </div>
                                                    {/* <Button variant="plain" size="slim">Edit</Button> */}
                                                    <Text fontWeight="semibold">${item.price}</Text>
                                                </div>
                                            </ResourceItem>
                                        );
                                    }


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
                                                    <Text variant="bodySm" color="subdued">Available: {item.available}</Text>
                                                </div>
                                                <Text fontWeight="semibold">${item.price}</Text>
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
