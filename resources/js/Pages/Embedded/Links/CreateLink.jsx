import React, { useState, useCallback, useEffect } from 'react';
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
    Icon,
    Modal,
    ResourceList,
    ResourceItem,
    Thumbnail,
    Checkbox,
    Pagination,
} from '@shopify/polaris';
import {
    ChevronDownIcon,
    ChevronUpIcon,
    SearchIcon,
    XIcon,
    DragHandleIcon,
    ProductAddIcon,
    SettingsIcon,
    StatusActiveIcon,
    ClipboardIcon,
    ProductIcon,
    ProductListIcon,
    DragDropIcon,
    CartIcon,
} from '@shopify/polaris-icons';
import { router, usePage } from '@inertiajs/react';
import { useAppBridge } from '@shopify/app-bridge-react';
import toast from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import Discount from './Discount';
import PopupMessage from './PopupMessage';
import '@/Components/style.css';
import '../../../../css/links.css';

// Utility for debouncing (for better search experience)
function useDebouncedValue(value, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debounced;
}

export default function CreateLink() {
    // Hydrate state from link prop if editing
    const { props } = usePage();
    const query = props.ziggy.query;
    const app = useAppBridge();
    const { link } = props;

    useEffect(() => {
        if (link) {
            setLinkName(link.link_name || '');
            setLinkId(link.link_url || '');
            setDiscountData({
                freeShipping: !!link.free_shipping,
                orderDiscount: !!link.order_discount,
                discountValue: link.discount_value || '',
                discountCode: !!link.discount_code,
                discountCodeValue: link.discount_code_value || ''
            });
            if (link.popup_message) {
                setPopupMessageData(prev => ({
                    ...prev,
                    ...link.popup_message,
                    isActive: !!link.popup_message.is_active,
                    countdownActive: !!link.popup_message.countdown_active,
                    showOrderTotal: !!link.popup_message.show_order_total,
                    showPrice: !!link.popup_message.show_price,
                    allowDeselect: !!link.popup_message.allow_deselect
                }));
            }
            if (Array.isArray(link.linked_variants)) {
                // Map linked_variants to selectedProductItems structure
                const selected = link.linked_variants.map(v => {
                    const product = v.variant && v.variant.product ? v.variant.product : {};
                    const media = product.media && product.media[0] ? product.media[0].src : '';
                    return {
                        id: v.product_id + '_' + v.variant_id,
                        productId: v.product_id,
                        variantId: v.variant_id,
                        title: product.title || '',
                        variant: v.variant ? v.variant.title : '',
                        price: v.price || (v.variant ? v.variant.price : ''),
                        image: media,
                        quantity: 1
                    };
                });
                setSelectedProductItems(selected);
                setSelectedProducts(selected.length);
                setSelectedVariantIds(selected.map(v => v.id));
            }
        }
    }, [link]);

    // -- UI State
    const [linkName, setLinkName] = useState('');
    const [linkId, setLinkId] = useState('');
    const [productsOpen, setProductsOpen] = useState(true);
    const [discountsOpen, setDiscountsOpen] = useState(false);
    const [popupMessageOpen, setPopupMessageOpen] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState(0);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [productSearchValue, setProductSearchValue] = useState('');
    const [mainProductSearch, setMainProductSearch] = useState('');
    const [filterPopoverActive, setFilterPopoverActive] = useState(false);
    const [selectedProductItems, setSelectedProductItems] = useState([]);
    const [tempSelectedProductItems, setTempSelectedProductItems] = useState([]);
    const [popupProductChecked, setPopupProductChecked] = useState({});
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [discountData, setDiscountData] = useState({
        freeShipping: false,
        orderDiscount: false,
        discountValue: '',
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
    const [products, setProducts] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);

    // -- Debounced search values (for performance)
    const debouncedMainProductSearch = useDebouncedValue(mainProductSearch, 300);
    const debouncedProductSearchValue = useDebouncedValue(productSearchValue, 300);

    // --- Fetch products with server-side search and pagination
    const fetchProducts = useCallback(
        async (page = 1, search = '') => {
            try {
                const response = await fetch(
                    route('products.all', { ...query, page, per_page: perPage, search })
                );
                const data = await response.json();
                console.log('Fetched products:', data);
                if (data && Array.isArray(data.data)) {

                    setProducts(data.data);


                    setCurrentPage(data.pagination.current_page);
                    setTotalPages(data.pagination.last_page);
                } else {
                    setProducts([]);
                    setCurrentPage(1);
                    setTotalPages(1);
                }
            } catch (error) {
                setProducts([]);
                setCurrentPage(1);
                setTotalPages(1);
            }
        },
        [perPage, query]
    );


    // -- Product selection handlers
    // Hierarchical selection state: store selected variant ids
    const [selectedVariantIds, setSelectedVariantIds] = useState([]);

    // Collect all relevant data from the page
    const collectAllPageData = () => ({
        linkName,
        linkId,
        selectedProducts,
        selectedProductItems,
        discountData,
        popupMessageData,
        selectedVariantIds,
        // Add more fields if needed
    });

    const saveLinkData = useCallback(async () => {
        const allData = collectAllPageData();
        const isEdit = link && link.id;
        const url = isEdit ? route('links.update', { ...query, id: link.id }) : route('products.save', query);
        const method = isEdit ? 'PUT' : 'POST';
        await toast.promise(
            (async () => {
                const response = await fetch(url, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(allData),
                });
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.error || 'Failed to save link.');
                }
                return data.message || isEdit ? 'Link updated successfully!' : 'Link created successfully!';
            })(),
            {
                loading: isEdit ? 'Updating link...' : 'Saving link...',
                success: (msg) => msg,
                error: (err) => err.message || 'Failed to save the link. Please try again.',
            }
        );
    }, [selectedProductItems, linkName, linkId, selectedProducts, discountData, popupMessageData, selectedVariantIds, link]);

    // -- Fetch on mount and when search/page changes
    useEffect(() => {
        // Use modal search if open, otherwise main search
        const searchTerm = isProductModalOpen ? debouncedProductSearchValue : debouncedMainProductSearch;
        fetchProducts(currentPage, searchTerm);
        // eslint-disable-next-line
    }, [fetchProducts, currentPage, debouncedMainProductSearch, debouncedProductSearchValue, isProductModalOpen]);

    // -- Handlers for search bars
    const handleMainProductSearchChange = (value) => {
        setMainProductSearch(value);
        setCurrentPage(1);
    };
    const handleProductSearchChange = (value) => {
        setProductSearchValue(value);
        setCurrentPage(1);
    };

    const handleNext = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };
    const handlePrevious = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    // Structure product data for hierarchical rendering (product + variants), memoized to avoid infinite loop
    const productData = React.useMemo(() => (
        Array.isArray(products)
            ? products.map(product => ({
                id: `${product.id}`,
                title: product.title,
                image:
                    product.image ||
                    (product.media && product.media[0]?.src) ||
                    (product.productMedias && product.productMedias[0]?.src) ||
                    'https://via.placeholder.com/50',
                available: product.available !== undefined
                    ? product.available
                    : Array.isArray(product.product_varients)
                        ? product.product_varients.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0)
                        : 0,
                price: product.price,
                variants: Array.isArray(product.variants) ? product.variants.map(variant => ({
                    id: `${product.id}_${variant.id}`,
                    productId: product.id,
                    title: product.title,
                    variantTitle: variant.title,
                    price: variant.price,
                    available: variant.inventory_quantity || 0,
                    image:
                        variant.image ||
                        product.image ||
                        (product.media && product.media[0]?.src) ||
                        (product.productMedias && product.productMedias[0]?.src) ||
                        'https://via.placeholder.com/50',
                    variantId: variant.id,
                })) : [],
            }))
            : []
    ), [products]);

    // -- Basic UI Handlers
    const handleLinkNameChange = useCallback((value) => setLinkName(value), []);
    const handleLinkIdChange = useCallback((value) => setLinkId(value), []);
    const handleProductsToggle = useCallback(() => setProductsOpen(!productsOpen), [productsOpen]);
    const handleDiscountsToggle = useCallback(() => setDiscountsOpen(!discountsOpen), [discountsOpen]);
    const handlePopupMessageToggle = useCallback(() => setPopupMessageOpen(!popupMessageOpen), [popupMessageOpen]);
    const handleProductModalOpen = useCallback(() => {
        const obj = {};
        selectedProductItems.forEach(item => { obj[item.id] = item; });
        setTempSelectedProductItems(obj);
        setIsProductModalOpen(true);
        setProductSearchValue('');
    }, [selectedProductItems]);
    const handleProductModalClose = useCallback(() => {
        setTempSelectedProductItems({});
        setIsProductModalOpen(false);
        setProductSearchValue('');
    }, []);

    const handleProductModalDone = useCallback(() => {
        const selectedArray = Object.values(tempSelectedProductItems);
        setSelectedProductItems(selectedArray);
        setSelectedProducts(selectedArray.length);
        const checkedState = {};
        selectedArray.forEach(product => {
            checkedState[product.id] = true;
        });
        setPopupProductChecked(checkedState);
        setIsProductModalOpen(false);
        setTempSelectedProductItems({});
        setProductSearchValue('');
    }, [tempSelectedProductItems]);

    // Helper: get all variant ids for a product
    const getAllVariantIds = (product) => product.variants.length > 0 ? product.variants.map(v => v.id) : [product.id];

    // Handle product or variant checkbox change
    const handleProductOrVariantCheck = (id, checked, isProduct, product) => {
        if (isProduct) {
            // Product-level: select/deselect all its variants (or itself if no variants)
            const variantIds = getAllVariantIds(product);
            setSelectedVariantIds(prev => {
                let newIds;
                if (checked) {
                    newIds = Array.from(new Set([...prev, ...variantIds]));
                } else {
                    newIds = prev.filter(vid => !variantIds.includes(vid));
                }
                // Update selectedProductItems
                updateSelectedProductItems(newIds);
                return newIds;
            });
        } else {
            // Variant-level: toggle only this variant
            setSelectedVariantIds(prev => {
                let newIds;
                if (checked) {
                    newIds = Array.from(new Set([...prev, id]));
                } else {
                    newIds = prev.filter(vid => vid !== id);
                }
                // Update selectedProductItems
                updateSelectedProductItems(newIds);
                return newIds;
            });
        }
    };

    // Helper to update selectedProductItems based on selectedVariantIds
    const updateSelectedProductItems = (variantIds) => {
        // Flatten all variants and products
        const allVariants = productData.flatMap(product => product.variants.length > 0 ? product.variants.map(v => ({
            id: v.id,
            productId: product.id,
            title: product.title,
            variant: v.variantTitle,
            variantId: v.id,
            quantity: 1,
            price: v.price,
            image: product.image
        })) : [{
            id: product.id,
            productId: product.id,
            title: product.title,
            variant: null,
            variantId: null,
            quantity: 1,
            price: product.price,
            image: product.image
        }]);
        const selected = [];
        const seen = new Set();
        allVariants.forEach(v => {
            if (variantIds.includes(v.id) && !seen.has(v.id)) {
                selected.push(v);
                seen.add(v.id);
            }
        });
        setSelectedProductItems(selected);
    };

    // Update tempSelectedProductItems when selectedVariantIds changes
    useEffect(() => {
        setTempSelectedProductItems(prev => {
            const allVariants = productData.flatMap(product => product.variants.length > 0 ? product.variants : [{
                id: product.id,
                productId: product.id,
                title: product.title,
                variantTitle: null,
                price: product.price,
                image: product.image,
                available: product.available,
                variantId: null,
            }]);
            let updated = { ...prev };
            selectedVariantIds.forEach(id => {
                if (!updated[id]) {
                    const item = allVariants.find(v => v.id === id);
                    if (item) {
                        updated[id] = {
                            id: item.id,
                            productId: item.productId,
                            title: item.title,
                            variant: item.variantTitle,
                            variantId: item.variantId,
                            quantity: 1,
                            price: item.price,
                            image: item.image
                        };
                    }
                }
        });
            // Remove items that are no longer selected
            Object.keys(updated).forEach(id => {
                if (!selectedVariantIds.includes(id)) {
                    delete updated[id];
                }
            });
            return updated;
        });
    }, [selectedVariantIds, productData]);

    const handleDragEnd = useCallback((result) => {
        if (!result.destination) return;
        const items = Array.from(selectedProductItems);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setSelectedProductItems(items);
    }, [selectedProductItems]);

    const handleRemoveProduct = useCallback((productId) => {
        const newSelection = selectedProductItems.filter(product => product.id !== productId);
        setSelectedProductItems(newSelection);
        setSelectedProducts(newSelection.length);
        setPopupProductChecked(prev => {
            const newState = { ...prev };
            delete newState[productId];
            return newState;
        });
    }, [selectedProductItems]);

    // -- Discount and Popup handlers (unchanged)
    const handleFreeShippingChange = useCallback((value) => setDiscountData(prev => ({ ...prev, freeShipping: value })), []);
    const handleOrderDiscountChange = useCallback((value) => setDiscountData(prev => ({ ...prev, orderDiscount: value })), []);
    const handleDiscountValueChange = useCallback((value) => setDiscountData(prev => ({ ...prev, discountValue: value })), []);
    const handleDiscountCodeChange = useCallback((value) => setDiscountData(prev => ({ ...prev, discountCode: value })), []);
    const handleDiscountCodeValueChange = useCallback((value) => setDiscountData(prev => ({ ...prev, discountCodeValue: value })), []);
    const handlePopupActiveToggle = useCallback((value) => {
        setPopupMessageData(prev => ({ ...prev, isActive: value }));
        if (value && popupMessageData.countdownActive && popupMessageData.timerText) {
            const timeInSeconds = parseTimeToSeconds(popupMessageData.timerText);
            setTimerSeconds(timeInSeconds);
            setIsTimerActive(true);
        } else {
            setIsTimerActive(false);
        }
    }, [popupMessageData.countdownActive, popupMessageData.timerText]);
    const handlePopupHeadingTextChange = useCallback((value) => setPopupMessageData(prev => ({ ...prev, headingText: value })), []);
    const handlePopupMessageTextChange = useCallback((value) => setPopupMessageData(prev => ({ ...prev, messageText: value })), []);
    const handlePopupCountdownToggle = useCallback((value) => {
        setPopupMessageData(prev => ({ ...prev, countdownActive: value }));
        if (value && popupMessageData.isActive && popupMessageData.timerText) {
            const timeInSeconds = parseTimeToSeconds(popupMessageData.timerText);
            setTimerSeconds(timeInSeconds);
            setIsTimerActive(true);
        } else {
            setIsTimerActive(false);
        }
    }, [popupMessageData.isActive, popupMessageData.timerText]);
    const handlePopupTimerTextChange = useCallback((value) => {
        setPopupMessageData(prev => ({ ...prev, timerText: value }));
        if (popupMessageData.countdownActive && popupMessageData.isActive) {
            const timeInSeconds = parseTimeToSeconds(value);
            setTimerSeconds(timeInSeconds);
            setIsTimerActive(true);
        }
    }, [popupMessageData.countdownActive, popupMessageData.isActive]);
    const handlePopupCopyTextChange = useCallback((value) => setPopupMessageData(prev => ({ ...prev, copyText: value })), []);
    const handlePopupAllowDeselectToggle = useCallback((value) => setPopupMessageData(prev => ({ ...prev, allowDeselect: value })), []);
    const handlePopupShowPriceToggle = useCallback((value) => setPopupMessageData(prev => ({ ...prev, showPrice: value })), []);
    const handlePopupShowOrderTotalToggle = useCallback((value) => setPopupMessageData(prev => ({ ...prev, showOrderTotal: value })), []);
    const handlePopupCheckoutButtonTextChange = useCallback((value) => setPopupMessageData(prev => ({ ...prev, checkoutButtonText: value })), []);
    const handlePopupCloseButtonTextChange = useCallback((value) => setPopupMessageData(prev => ({ ...prev, closeButtonText: value })), []);
    const handlePopupCloseButtonLinkChange = useCallback((value) => setPopupMessageData(prev => ({ ...prev, closeButtonLink: value })), []);

    // -- Timer utilities
    const parseTimeToSeconds = (timeString) => {
        const lowerCase = timeString.toLowerCase();
        const number = parseInt(lowerCase.match(/\d+/)?.[0] || 0);
        if (lowerCase.includes('minute')) return number * 60;
        if (lowerCase.includes('second')) return number;
        if (lowerCase.includes('hour')) return number * 3600;
        return number * 60;
    };
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
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
        return () => { if (interval) clearInterval(interval); };
    }, [isTimerActive, timerSeconds]);

    const handlePopupProductCheck = useCallback((productId, checked) => {
        setPopupProductChecked(prev => ({
            ...prev,
            [productId]: checked
        }));
    }, []);
    const restartTimer = useCallback(() => {
        if (popupMessageData.isActive && popupMessageData.countdownActive && popupMessageData.timerText) {
            const timeInSeconds = parseTimeToSeconds(popupMessageData.timerText);
            setTimerSeconds(timeInSeconds);
            setIsTimerActive(true);
        }
    }, [popupMessageData.isActive, popupMessageData.countdownActive, popupMessageData.timerText]);

    // Copy to clipboard handler
    const handleCopyLink = useCallback(async () => {
        const linkUrl = "https://examplewebsite.com/3n49sjw3...";
        try {
            await navigator.clipboard.writeText(linkUrl);
            if (app && app.toast) {
                app.toast.show('Link copied to clipboard!', {
                    isError: false,
                    duration: 3000
                });
            }
        } catch {
            const textArea = document.createElement('textarea');
            textArea.value = linkUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            if (app && app.toast) {
                app.toast.show('Link copied to clipboard!', {
                    isError: false,
                    duration: 3000
                });
            }
        }
    }, [app]);

    // -- UI Render
    return (
        <Page
            title='Create Link'
            backAction={{
                content: 'Links',
                onAction: () => router.visit(route('links', query))
            }}
            primaryAction={{
                content: 'Save',
                onAction: () => {
                    // Handle save logic here
                    console.log('Link Name:', linkName);
                    console.log('Link ID:', linkId);
                    console.log('Selected Products:', selectedProductItems);
                    console.log('Discount Data:', discountData);
                    console.log('Popup Message Data:', popupMessageData);
                    saveLinkData();
                },
                disabled: !linkName || !linkId || selectedProductItems.length === 0
            }}
        >
            <div className='scroll-wrapper'>
                <div className='custom-scroll'>
                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
                        <BlockStack gap="500">
                            <Card>
                                <BlockStack gap="400" padding="400">
                                    <Text variant="bodyMd">Link Name</Text>
                                    <TextField
                                        label=""
                                        value={linkName}
                                        onChange={handleLinkNameChange}
                                        placeholder="Enter your Link Name"
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


                            {/* Products Card */}
                            <Card>
                                <BlockStack gap="400">
                                    <InlineStack align="space-between" padding="400">
                                        <InlineStack align="center" gap='050'>
                                            <Box>
                                                <Icon source={ProductAddIcon} tone="base" />
                                            </Box>
                                            <Text variant="bodyMd" fontWeight='bold'> Products</Text>
                                        </InlineStack>
                                        <Button
                                            onClick={handleProductsToggle}
                                            ariaExpanded={productsOpen}
                                            ariaControls="products-content"
                                            plain
                                            icon={productsOpen ? ChevronUpIcon : ChevronDownIcon}
                                        />
                                    </InlineStack>
                                    <Collapsible open={productsOpen} id="products-content">
                                        <Box>
                                            <BlockStack gap="400">
                                                <InlineStack align="space-between" gap="400" >
                                                    <div style={{ flexGrow: 1 }}>
                                                        <TextField
                                                            label=""
                                                            value={mainProductSearch}
                                                            onChange={handleMainProductSearchChange}
                                                            placeholder="Search products..."
                                                            clearButton
                                                            onClearButtonClick={() => handleMainProductSearchChange('')}
                                                            autoComplete="off"
                                                        />
                                                    </div>
                                                    <Button onClick={handleProductModalOpen}>Browse</Button>
                                                </InlineStack>

                                                {/* Show filtered products under the search field */}
                                                {mainProductSearch && (
                                                    <div style={{
                                                        maxHeight: '320px',
                                                        overflowY: 'auto',
                                                        margin: '12px 0',
                                                        background: '#fff',
                                                        border: '1px solid #e1e3e5',
                                                        borderRadius: 8,
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                                                        padding: '8px 0',
                                                    }}>
                                                        {productData
                                                            .filter(product =>
                                                                product.title.toLowerCase().includes(mainProductSearch.toLowerCase())
                                                            )
                                                            .map(product => (
                                                                <div
                                                                    key={product.id}
                                                                    style={{
                                                                        borderBottom: '1px solid #f0f0f0',
                                                                        padding: '10px 18px',
                                                                        transition: 'background 0.2s',
                                                                        cursor: 'pointer',
                                                                    }}
                                                                    onMouseOver={e => e.currentTarget.style.background = '#f9fafb'}
                                                                    onMouseOut={e => e.currentTarget.style.background = '#fff'}
                                                                >
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                                        <Checkbox
                                                                            label=""
                                                                            checked={product.variants.length > 0
                                                                                ? product.variants.every(v => selectedVariantIds.includes(v.id))
                                                                                : selectedVariantIds.includes(product.id)
                                                                            }
                                                                            indeterminate={product.variants.length > 0 && product.variants.some(v => selectedVariantIds.includes(v.id)) && !product.variants.every(v => selectedVariantIds.includes(v.id))}
                                                                            onChange={checked => handleProductOrVariantCheck(product.id, checked, true, product)}
                                                                        />
                                                                        <Thumbnail source={product.image} alt={product.title} size="small" />
                                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                                            <Text fontWeight="medium" truncate>{product.title}</Text>
                                                                            {/* <Text variant="bodySm" color="subdued" style={{ marginLeft: 8 }}>Available:</Text> */}
                                                                        </div>
                                                                        {product.variants.length === 0 && (
                                                                            <Text variant="bodySm" color="subdued">Price: ${product.price}</Text>
                                                                        )}
                                                                    </div>
                                                                    {product.variants.length > 0 && (
                                                                        <div style={{ marginLeft: 44, marginTop: 6 }}>
                                                                            {product.variants.map(variant => (
                                                                                <div key={variant.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2, padding: '2px 0' }}>
                                                                                    <Checkbox
                                                                                        label=""
                                                                                        checked={selectedVariantIds.includes(variant.id)}
                                                                                        onChange={checked => handleProductOrVariantCheck(variant.id, checked, false, product)}
                                                                                    />
                                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                                        <Text fontWeight="medium" truncate>{variant.variantTitle}</Text>
                                                                                        <Text variant="bodySm" color="subdued" style={{ marginLeft: 8 }}>Available: {variant.available}</Text>
                                                                                    </div>
                                                                                    <Text variant="bodySm" color="subdued">Price: ${variant.price}</Text>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}

                                                        <Box paddingBlockStart="200" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: '8px' }}>
                                                            <Pagination
                                                                hasPrevious={currentPage > 1}
                                                                onPrevious={handlePrevious}
                                                                hasNext={currentPage < totalPages}
                                                                onNext={handleNext}
                                                            />
                                                        </Box>

                                                        {productData.filter(product => product.title.toLowerCase().includes(mainProductSearch.toLowerCase())).length === 0 && (
                                                            <Text variant="bodySm" color="subdued" alignment="center" style={{ display: 'block', padding: 16 }}>No products found</Text>
                                                        )}
                                                    </div>
                                                )}
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
                                                                        // Use a unique key by combining id and index
                                                                        return (
                                                                            <Draggable key={`${product.id}_${index}`} draggableId={`${product.id}_${index}`} index={index}>
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
                                                                                        <InlineStack gap="400">
                                                                                            <div {...provided.dragHandleProps} style={{ color: '#6d7175', display: 'flex', alignItems: 'center' }}>
                                                                                                <Icon source={DragHandleIcon} tone='base' />
                                                                                            </div>
                                                                                            <Thumbnail
                                                                                                source={product.image}
                                                                                                alt={product.title}
                                                                                                size="small"
                                                                                            />
                                                                                            <Box maxWidth="180px">
                                                                                                <div style={{ display: 'inline-block', width: '100%' }} title={product.title + (product.variant ? ` (${product.variant})` : '')}>
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
                            {/* Discounts Card */}
                            <Card>
                                <BlockStack gap="400">
                                    <InlineStack align="space-between" padding="400">
                                        <InlineStack align="center" gap='050'>
                                            <Box>
                                                <Icon source={SettingsIcon} tone="base" />
                                            </Box>
                                            <Text variant="bodyMd" fontWeight='bold'> Discounts</Text>
                                        </InlineStack>
                                        <Button
                                            onClick={handleDiscountsToggle}
                                            ariaExpanded={discountsOpen}
                                            ariaControls="discounts-content"
                                            plain
                                            icon={discountsOpen ? ChevronUpIcon : ChevronDownIcon}
                                        />
                                    </InlineStack>
                                    <Collapsible open={discountsOpen} id="discounts-content">
                                        <Box>
                                            <Discount
                                                discountData={discountData}
                                                onFreeShippingChange={handleFreeShippingChange}
                                                onOrderDiscountChange={handleOrderDiscountChange}
                                                onDiscountValueChange={handleDiscountValueChange}
                                                onDiscountCodeChange={handleDiscountCodeChange}
                                                onDiscountCodeValueChange={handleDiscountCodeValueChange}
                                            />
                                        </Box>
                                    </Collapsible>
                                </BlockStack>
                            </Card>
                            {/* Popup Message Card */}
                            <Card>
                                <BlockStack gap="400">
                                    <InlineStack align="space-between" padding="400">
                                        <InlineStack align="center" gap='050'>
                                            <Box>
                                                <Icon source={StatusActiveIcon} tone="base" />
                                            </Box>
                                            <Text variant="bodyMd" fontWeight='bold'> Popup Message</Text>
                                        </InlineStack>
                                        <Button
                                            onClick={handlePopupMessageToggle}
                                            ariaExpanded={popupMessageOpen}
                                            ariaControls="popup-message-content"
                                            plain
                                            icon={popupMessageOpen ? ChevronUpIcon : ChevronDownIcon}
                                        />
                                    </InlineStack>
                                    <Collapsible open={popupMessageOpen} id="popup-message-content">
                                        <Box>
                                            <PopupMessage
                                                popupMessageData={popupMessageData}
                                                onActiveToggle={handlePopupActiveToggle}
                                                onHeadingTextChange={handlePopupHeadingTextChange}
                                                onMessageTextChange={handlePopupMessageTextChange}
                                                onCountdownToggle={handlePopupCountdownToggle}
                                                onTimerTextChange={handlePopupTimerTextChange}
                                                onCopyTextChange={handlePopupCopyTextChange}
                                                onAllowDeselectToggle={handlePopupAllowDeselectToggle}
                                                onShowPriceToggle={handlePopupShowPriceToggle}
                                                onShowOrderTotalToggle={handlePopupShowOrderTotalToggle}
                                                onCheckoutButtonTextChange={handlePopupCheckoutButtonTextChange}
                                                onCloseButtonTextChange={handlePopupCloseButtonTextChange}
                                                onCloseButtonLinkChange={handlePopupCloseButtonLinkChange}
                                            />
                                        </Box>
                                    </Collapsible>
                                </BlockStack>
                            </Card>
                        </BlockStack>
                    </div>
                </div>
                <div style={{ flex: 1, position: 'sticky', top: '1rem', height: 'fit-content', paddingLeft: '0.5rem', overflow: 'auto' }}>
                    <BlockStack gap="300">

                        <Card>
                            <BlockStack gap="400" padding="400">
                                <InlineStack align="space-between">
                                    <Text variant="bodyMd">Summary</Text>
                                    {/* <Button variant='plain'>Test</Button> */}
                                </InlineStack>

                                <Box background="bg-surface-secondary" padding="400" borderRadius="2" border="base">
                                    <BlockStack gap="300">
                                        {selectedProducts > 0 &&
                                            <InlineStack gap="200" align="start">
                                                <div style={{ marginTop: "2px" }}>
                                                    <Icon source={StatusActiveIcon} tone='subdued' />
                                                </div>
                                                <Text as="span" color="subdued">Pre-filled cart: {selectedProducts} products selected</Text>
                                            </InlineStack>


                                        }


                                        {discountData.freeShipping &&
                                            <InlineStack gap="200" align="start">
                                                <div style={{ marginTop: "2px" }}>
                                                    <Icon source={StatusActiveIcon} tone='subdued' />
                                                </div>
                                                <Text as="span" color="subdued">Free shipping applied</Text>
                                            </InlineStack>
                                        }

                                        {discountData.orderDiscount && discountData.discountValue != '' &&
                                            <InlineStack gap="200" align="start">
                                                <div style={{ marginTop: "2px" }}>
                                                    <Icon source={StatusActiveIcon} tone='subdued' />
                                                </div>
                                                <Text as="span" color="subdued" > Order Discount: {discountData.discountValue}% Off</Text>
                                            </InlineStack>
                                        }

                                        {discountData.discountCode &&
                                            <InlineStack gap="200" align="start">
                                                <div style={{ marginTop: "2px" }}>
                                                    <Icon source={StatusActiveIcon} tone='subdued' />
                                                </div>
                                                <Text as="span" color="subdued">Discount code: {discountData.discountCodeValue}</Text>
                                            </InlineStack>
                                        }
                                        {popupMessageData.isActive &&

                                            <InlineStack gap="200" align="start">
                                                <div style={{ marginTop: "2px", }}>
                                                    <Icon source={StatusActiveIcon} tone='subdued' />
                                                </div>
                                                <Box maxWidth='260px'>
                                                    <Text as="span" color="subdued"> User is prompted with popup message before checkout </Text>

                                                </Box>
                                            </InlineStack>
                                        }
                                        <InlineStack gap="400">
                                            <Box width='70%'>
                                                <TextField
                                                    value="https://examplewebsite.com/3n49sjw3..."
                                                    readOnly
                                                    autoComplete="off"
                                                />

                                            </Box>
                                            <Button icon={ClipboardIcon} onClick={handleCopyLink}>Copy</Button>
                                        </InlineStack>
                                    </BlockStack>
                                </Box>
                            </BlockStack>
                        </Card>


                        <Card>
                            <BlockStack gap="400" >
                                <InlineStack align="space-between">
                                    <Text variant="bodyMd">Preview </Text>
                                    {/* <Button variant='plain'>Test</Button> */}
                                </InlineStack>

                                <Box background="" borderRadius="2" border="base">
                                    <BlockStack gap="300" align="center">
                                        <InlineStack blockAlign='center' align='space-between'>

                                            <InlineStack gap='050'>
                                                <Icon source={DragDropIcon} tone={popupMessageData.isActive ? 'base' : 'subdued'} />
                                                <div onClick={() => { setPopupMessageData(prev => ({ ...prev, isActive: true })) }} style={{ cursor: 'pointer' }}>
                                                    <Text tone={popupMessageData.isActive ? 'base' : 'disabled'}
                                                        variant={popupMessageData.isActive ? 'bodyMd' : 'bodySm'}
                                                        fontWeight={popupMessageData.isActive ? 'semibold' : 'regular'}>
                                                        Preview popup message
                                                    </Text>

                                                </div>
                                            </InlineStack>
                                            <InlineStack gap='050'>
                                                <Icon source={CartIcon} tone={popupMessageData.isActive ? 'subdued' : 'base'} />
                                                <div onClick={() => { setPopupMessageData(prev => ({ ...prev, isActive: false })) }} style={{ cursor: 'pointer' }}>
                                                    <Text tone={popupMessageData.isActive ? 'disabled' : 'base'} fontWeight={popupMessageData.isActive ? 'regular' : 'semibold'}>Preview  checkout</Text>

                                                </div>

                                            </InlineStack>
                                        </InlineStack>
                                        {!popupMessageData.isActive && (
                                            <Box background='bg-fill-disabled' borderRadius='200' padding={'300'}>
                                                {selectedProductItems.length === 0 ? (
                                                    <Text variant="headingSm" as="h3" alignment='center' color="subdued">No products selected</Text>
                                                ) : (

                                                    <Box background='' padding={'400'} borderRadius='200' border="base">
                                                        <BlockStack gap="400">

                                                            <div style={{
                                                                maxHeight: selectedProductItems.length > 4 ? '100px' : 'auto',
                                                                overflowY: selectedProductItems.length > 4 ? 'auto' : 'visible',
                                                                paddingRight: selectedProductItems.length > 4 ? '8px' : '0'
                                                            }}>
                                                                <BlockStack gap="400">
                                                                    {selectedProductItems.map((product, index) => (
                                                                        <InlineStack key={`${product.id}_${index}`} align="space-between" gap="400" blockAlign='center' padding="200" borderRadius="2" border="base">
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
                                                                                    <Box maxWidth='150px'>
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
                                                                </BlockStack>
                                                            </div>


                                                            <InlineStack align="space-between" gap="">
                                                                <Box minWidth='220px'>
                                                                    <TextField
                                                                        placeholder="Gift card"
                                                                        autoComplete="off"
                                                                            value={discountData.discountValue}
                                                                    // connectedRight={
                                                                    //     <Button variant="secondary">Apply</Button>
                                                                    // }
                                                                    />

                                                                </Box>
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


                                                            {/* Discount Section */}
                                                            {discountData.freeShipping && (
                                                                <InlineStack align="space-between">
                                                                    <Text color="subdued" variant="headingXs" as="p">Free shipping</Text>
                                                                    <Text color="subdued">Free</Text>
                                                                </InlineStack>
                                                            )}

                                                            {discountData.orderDiscount && discountData.discountValue != '' && (
                                                                <InlineStack align="space-between">
                                                                    <BlockStack gap='100'>
                                                                        <Text color="subdued" variant="headingXs" as="p">Order discount</Text>

                                                                        <InlineStack>
                                                                            <Box>
                                                                                <Icon
                                                                                    source={ProductIcon}
                                                                                    tone="subdued"
                                                                                />
                                                                            </Box>
                                                                            <Text tone='subdued'>{discountData.discountValue}% OFF ORDER</Text>
                                                                        </InlineStack>
                                                                    </BlockStack>
                                                                    <Text color="critical">
                                                                        {(() => {
                                                                            const subtotal = selectedProductItems.reduce((total, product) => {
                                                                                const price = parseFloat(product.price || 0);
                                                                                const quantity = parseInt(product.quantity || 1);
                                                                                return total + (price * quantity);
                                                                            }, 0);
                                                                            const discount = subtotal * (parseFloat(discountData.discountValue) / 100);
                                                                            return `- $${discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                                                        })()}
                                                                    </Text>
                                                                </InlineStack>
                                                            )}

                                                            {discountData.discountCode && (
                                                                <InlineStack align="space-between">
                                                                    <Text color="subdued" variant="headingXs" as="p">Discount code</Text>
                                                                    <Text color="subdued">{discountData.discountCodeValue}</Text>
                                                                </InlineStack>
                                                            )}


                                                            <InlineStack align="space-between">
                                                                <Text color="subdued" variant="headingXs" as="p">Shipping</Text>
                                                                <Text color="subdued" variant="headingXs" as="p">
                                                                    {discountData.freeShipping ? 'Free' : 'Enter shipping address'}
                                                                </Text>
                                                            </InlineStack>


                                                            <Box borderBlockStart="base" />

                                                            <InlineStack align="space-between">
                                                                <Text variant="headingLg" fontWeight="bold">Total</Text>
                                                                <InlineStack align="end" gap="200" blockAlign='center'>
                                                                    <Text variant="headingXs" tone="subdued">AUD</Text>
                                                                    <Text variant="headingLg" fontWeight="bold">
                                                                        {(() => {
                                                                            const subtotal = selectedProductItems.reduce((total, product) => {
                                                                                const price = parseFloat(product.price || 0);
                                                                                const quantity = parseInt(product.quantity || 1);
                                                                                return total + (price * quantity);
                                                                            }, 0);
                                                                            let discount = 0;
                                                                            if (discountData.orderDiscount && discountData.discountValue && !isNaN(parseFloat(discountData.discountValue))) {
                                                                                discount = subtotal * (parseFloat(discountData.discountValue) / 100);
                                                                            } else if (discountData.discountCode && discountData.discountCodeValue && !isNaN(parseFloat(discountData.discountCodeValue))) {
                                                                                // Assuming discount code value represents a percentage
                                                                                const codeValue = parseFloat(discountData.discountCodeValue) || 0;
                                                                                discount = subtotal * (codeValue / 100);
                                                                            }
                                                                            // Free shipping doesn't affect the product total, only shipping cost
                                                                            return `$${(subtotal - discount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                                                        })()}
                                                                    </Text>
                                                                </InlineStack>
                                                            </InlineStack>
                                                            {/* Total Savings Row */}
                                                            {discountData.orderDiscount && discountData.discountValue != '' && (
                                                                <InlineStack align="start" gap="050" >
                                                                    <Box>
                                                                            <Icon source={ProductListIcon} tone="base" />

                                                                    </Box>
                                                                    <Text fontWeight="bold" tone="050" variant="bodyMd">
                                                                        TOTAL SAVINGS {(() => {
                                                                            const subtotal = selectedProductItems.reduce((total, product) => {
                                                                                const price = parseFloat(product.price || 0);
                                                                                const quantity = parseInt(product.quantity || 1);
                                                                                return total + (price * quantity);
                                                                            }, 0);
                                                                            const discount = subtotal * (parseFloat(discountData.discountValue) / 100);
                                                                            return `$${discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                                                        })()}
                                                                    </Text>
                                                                </InlineStack>
                                                            )}
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

                                                        {/* Products List with Scrollable Container */}
                                                        <div style={{
                                                            maxHeight: selectedProductItems.filter(product => popupProductChecked[product.id] !== false).length > 4 ? '100px' : 'auto',
                                                            overflowY: selectedProductItems.filter(product => popupProductChecked[product.id] !== false).length > 4 ? 'auto' : 'visible',
                                                            paddingRight: selectedProductItems.filter(product => popupProductChecked[product.id] !== false).length > 4 ? '8px' : '0'
                                                        }}>
                                                            <BlockStack gap="400">
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
                                                            </BlockStack>
                                                        </div>

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

                                                                                let discount = 0;
                                                                                if (discountData.orderDiscount) {
                                                                                    discount = subtotal * (parseFloat(discountData.discountValue) / 100);
                                                                                } else if (discountData.discountCode) {
                                                                                    // Assuming discount code value represents a percentage
                                                                                    const codeValue = parseFloat(discountData.discountCodeValue) || 0;
                                                                                    discount = subtotal * (codeValue / 100);
                                                                                }
                                                                                // Free shipping doesn't affect the product total, only shipping cost

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
                    </BlockStack>
                </div>
            </div>
            {/* --- MODAL WITH SEARCH & PAGINATION --- */}
            <Modal
                open={isProductModalOpen}
                onClose={handleProductModalClose}
                title="Select products"
                primaryAction={{
                    content: 'Done',
                    onAction: handleProductModalDone,
                }}
                secondaryActions={[
                    {
                        content: 'Cancel',
                        onAction: handleProductModalClose,
                    },
                ]}
                footer={
                    <div style={{ padding: '12px 16px', textAlign: 'left' }}>
                        <Text>{Object.keys(tempSelectedProductItems).length} products selected</Text>
                    </div>
                }
            >
                <Modal.Section>
                    <BlockStack gap="400">
                        <InlineStack gap="400" align="start">
                            <div style={{ flexGrow: 1 }} className="product-search-container">
                                <TextField
                                    label=""
                                    value={productSearchValue}
                                    onChange={handleProductSearchChange}
                                    placeholder="Search product"
                                    clearButton
                                    onClearButtonClick={() => setProductSearchValue('')}
                                    autoComplete="off"
                                />
                            </div>
                        </InlineStack>

                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {productData.map(product => (
                                <div key={product.id} style={{ borderBottom: '1px solid #eee', padding: '8px 0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Checkbox
                                            label=""
                                            checked={product.variants.length > 0
                                                ? product.variants.every(v => selectedVariantIds.includes(v.id))
                                                : selectedVariantIds.includes(product.id)
                                            }
                                            indeterminate={product.variants.length > 0 && product.variants.some(v => selectedVariantIds.includes(v.id)) && !product.variants.every(v => selectedVariantIds.includes(v.id))}
                                            onChange={checked => handleProductOrVariantCheck(product.id, checked, true, product)}
                                        />
                                        <Thumbnail source={product.image} alt={product.title} size="small" />
                                        <div style={{ flex: 1 }}>
                                            <Text fontWeight="medium">{product.title}</Text>
                                        </div>
                                        {product.variants.length === 0 && (
                                            <Text variant="bodySm" color="subdued">Price: ${product.price}</Text>
                                        )}
                                    </div>
                                    {product.variants.length > 0 && (
                                        <div style={{ marginLeft: 36, marginTop: 4 }}>
                                            {product.variants.map(variant => (
                                                <div key={variant.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                                    <Checkbox
                                                        label=""
                                                        checked={selectedVariantIds.includes(variant.id)}
                                                        onChange={checked => handleProductOrVariantCheck(variant.id, checked, false, product)}
                                                    />
                                                    {/* <Thumbnail source={variant.image} alt={variant.title} size="small" /> */}
                                                    <div style={{ flex: 1 }}>
                                                        <Text fontWeight="medium">{variant.variantTitle}</Text>
                                                        <Text variant="bodySm" color="subdued" style={{ marginLeft: 8 }}>Available: {variant.available}</Text>
                                                    </div>
                                                    <Text variant="bodySm" color="subdued">Price: ${variant.price}</Text>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <Box paddingBlockStart="200" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <Pagination
                                hasPrevious={currentPage > 1}
                                onPrevious={handlePrevious}
                                hasNext={currentPage < totalPages}
                                onNext={handleNext}
                            />
                        </Box>
                    </BlockStack>
                </Modal.Section>
            </Modal>
        </Page>
    );
}