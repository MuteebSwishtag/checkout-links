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
    Banner,
    Spinner,
    LegacyCard,
    EmptyState,
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
    LinkIcon,
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
    const [shop, setShop] = useState('');

    // Function to fetch a unique ID from the backend
    const fetchUniqueId = async () => {
        try {
            const response = await fetch(route('links.generateUniqueId', query));
            const data = await response.json();
            // console.log("Fetched unique ID:", data);
            if (data.success) {
                setLinkId(data.uniqueId);
                // Store the full URL with shop in local state if needed
                if (data.fullUrl) {
                    setFullUrl(data.fullUrl);
                }
            }
        } catch (error) {
            console.error('Error fetching unique ID:', error);
        }
    };

    useEffect(() => {
        if (link) {
            console.log("Link data:", link);
            // Editing existing link - use stored values
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
                console.log("Popup message data:", link.popup_message);
                setPopupMessageData({
                    isActive: !!link.popup_message.is_active,
                    headingText: link.popup_message.heading_text || 'Order summary',
                    messageText: link.popup_message.message_text || 'I hope you enjoy your discount!',
                    countdownActive: !!link.popup_message.countdown_active,
                    timerText: link.popup_message.timer_text || '1 minute',
                    copyText: link.popup_message.copy_text || 'This offer will expire in',
                    allowDeselect: !!link.popup_message.allow_deselect,
                    showPrice: !!link.popup_message.show_price,
                    showOrderTotal: !!link.popup_message.show_order_total,
                    checkoutButtonText: link.popup_message.checkout_button_text || 'Confirm',
                    closeButtonText: link.popup_message.close_button_text || 'No thanks',
                    closeButtonLink: link.popup_message.close_button_link || '#'
                });

                // Start timer if popup is active with countdown
                if (link.popup_message.is_active && link.popup_message.countdown_active && link.popup_message.timer_text) {
                    const timeInSeconds = parseTimeToSeconds(link.popup_message.timer_text);
                    setTimerSeconds(timeInSeconds);
                    setIsTimerActive(true);
                }
            }

            if (Array.isArray(link.linked_variants)) {
                const selected = link.linked_variants.map(v => {
                    const product = v.variant?.product || {};
                    const media = product.media?.[0]?.src || product.image || '';
                    const itemId = `${v.product_id}_${v.variant_id}`;
                    const shopifyVariantId = v.variant?.shopify_product_varient_id || null;

                    return {
                        id: itemId,
                        productId: v.product_id,
                        variantId: v.variant_id,
                        shopifyVariantId: shopifyVariantId,
                        title: product.title || '',
                        variant: v.variant?.title || '',
                        price: v.price || (v.variant?.price || ''),
                        image: media,
                        quantity: 1
                    };
                });

                setSelectedProductItems(selected);
                setSelectedProducts(selected.length);

                // When editing a link, store the original variant data for later matching with productData
                if (Array.isArray(link.linked_variants)) {
                    // Extract the variant IDs that should be selected
                    const variantIdsToSelect = [];
                    link.linked_variants.forEach(v => {
                        if (v.variant_id) {
                            variantIdsToSelect.push(`${v.product_id}_${v.variant_id}`);
                        } else {
                            variantIdsToSelect.push(`${v.product_id}`);
                        }
                    });

                    console.log("Setting variant IDs from link data:", variantIdsToSelect);
                    setSelectedVariantIds(variantIdsToSelect);
                }
            }
        } else {
            // Creating new link - generate unique ID
            fetchUniqueId();
        }
    }, [link]);

    // -- UI State
    const [linkName, setLinkName] = useState('');
    const [linkId, setLinkId] = useState('');
    const [fullUrl, setFullUrl] = useState(''); // Store the full URL with shop name
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

    // Validation state
    const [errors, setErrors] = useState({
        linkName: '',
        linkId: '',
        selectedProducts: '',
        discountValue: '',
        discountCodeValue: '',
        popupMessage: {
            headingText: '',
            messageText: '',
            timerText: '',
            copyText: '',
            checkoutButtonText: '',
            closeButtonText: '',
            closeButtonLink: '',
            general: ''
        }
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
    const [isLoading, setIsLoading] = useState(false);

    // -- Debounced search values (for performance)
    const debouncedMainProductSearch = useDebouncedValue(mainProductSearch, 300);
    const debouncedProductSearchValue = useDebouncedValue(productSearchValue, 300);

    // --- Fetch products with server-side search and pagination (with AbortController)
    const fetchProducts = useCallback(
        async (page = 1, search = '', controller = null) => {
            setIsLoading(true);
            try {
                const response = await fetch(
                    route('products.all', { ...query, page, per_page: perPage, search }),
                    controller ? { signal: controller.signal } : undefined
                );
                const data = await response.json();
                if (data && Array.isArray(data.data)) {
                    setProducts(data.data);
                    setCurrentPage(data.pagination.current_page);
                    setTotalPages(data.pagination.last_page);
                    setShop(data.pagination.shop || '');
                } else {
                    setProducts([]);
                    setCurrentPage(1);
                    setTotalPages(1);
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    setProducts([]);
                    setCurrentPage(1);
                    setTotalPages(1);
                    setShop('');
                }
            } finally {
                setIsLoading(false);
            }
        },
        [perPage, query]
    );
    // -- Product selection handlers
    // Hierarchical selection state: store selected variant ids
    const [selectedVariantIds, setSelectedVariantIds] = useState([]);

    // Collect all relevant data from the page
    const collectAllPageData = () => {
        // Map selected product items to include shopify variant IDs clearly
        const mappedSelectedProductItems = selectedProductItems.map(item => ({
            ...item,
            shopify_variant_id: item.shopifyVariantId || item.variantId, // Ensure we use the correct Shopify variant ID
        }));

        // Extract the actual Shopify variant IDs from the selected products
        const actualVariantIds = selectedProductItems.map(item => item.shopifyVariantId || item.variantId);
        // console.log("Sending Shopify variant IDs:", actualVariantIds);

        return {
            linkName,
            linkId,
            selectedProducts,
            selectedProductItems: mappedSelectedProductItems,
            discountData,
            popupMessageData,
            // Send the actual Shopify variant IDs instead of the UI IDs
            selectedVariantIds: actualVariantIds,
        };
    };

    const saveLinkData = useCallback(async () => {
        // Reset all errors first
        setErrors({
            linkName: '',
            linkId: '',
            selectedProducts: '',
            discountValue: '',
            discountCodeValue: '',
            popupMessage: {
                headingText: '',
                messageText: '',
                timerText: '',
                copyText: '',
                checkoutButtonText: '',
                closeButtonText: '',
                closeButtonLink: '',
                general: ''
            }
        });

        // Perform frontend validation
        let hasErrors = false;

        // Validate link name
        if (!linkName.trim()) {
            setErrors(prev => ({ ...prev, linkName: 'Link name is required' }));
            hasErrors = true;
        }

        // Validate link ID
        if (!linkId) {
            setErrors(prev => ({ ...prev, linkId: 'Link ID is required' }));
            hasErrors = true;
        }

        // Validate selected products
        if (selectedProductItems.length === 0) {
            setErrors(prev => ({ ...prev, selectedProducts: 'At least one product must be selected' }));
            hasErrors = true;
            // Show the products section if there's an error
            setProductsOpen(true);
        }

        // Validate discount values if enabled
        if (discountData.orderDiscount && !discountData.discountValue) {
            setErrors(prev => ({ ...prev, discountValue: 'Discount value is required' }));
            hasErrors = true;
            setDiscountsOpen(true);
        }

        if (discountData.discountCode && !discountData.discountCodeValue) {
            setErrors(prev => ({ ...prev, discountCodeValue: 'Discount code is required' }));
            hasErrors = true;
            setDiscountsOpen(true);
        }

        // Validate popup message fields if active
        if (popupMessageData.isActive) {
            if (!popupMessageData.headingText.trim()) {
                setErrors(prev => ({
                    ...prev,
                    popupMessage: { ...prev.popupMessage, headingText: 'Heading text is required' }
                }));
                hasErrors = true;
                setPopupMessageOpen(true);
            }

            if (!popupMessageData.messageText.trim()) {
                setErrors(prev => ({
                    ...prev,
                    popupMessage: { ...prev.popupMessage, messageText: 'Message text is required' }
                }));
                hasErrors = true;
                setPopupMessageOpen(true);
            }

            if (popupMessageData.countdownActive && !popupMessageData.timerText.trim()) {
                setErrors(prev => ({
                    ...prev,
                    popupMessage: { ...prev.popupMessage, timerText: 'Timer text is required' }
                }));
                hasErrors = true;
                setPopupMessageOpen(true);
            }
        }

        // If there are errors, stop submission (inline errors will be shown)
        if (hasErrors) {
            return;
        }

        try {
            const allData = collectAllPageData();
            // console.log('Saving link data:', allData);
            // console.log('SHOPIFY VARIANT IDs BEING SENT:', allData.selectedProductItems.map(item => ({
            //     id: item.id,
            //     shopify_variant_id: item.shopify_variant_id
            // })));

            const isEdit = link && link.id;
            const url = isEdit ? route('links.update', { ...query, id: link.id }) : route('products.save', query);
            const method = isEdit ? 'PUT' : 'POST';

            await toast.promise(
                (async () => {
                    try {
                        const response = await fetch(url, {
                            method,
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(allData),
                        });

                        const data = await response.json();

                        if (!response.ok || !data.success) {
                            console.error('Error saving link:', data);

                            // Handle backend validation errors
                            if (data.errors) {
                                // Map backend errors to our error state
                                const backendErrors = data.errors;
                                const newErrors = {
                                    linkName: '',
                                    linkId: '',
                                    selectedProducts: '',
                                    discountValue: '',
                                    discountCodeValue: '',
                                    popupMessage: {
                                        headingText: '',
                                        messageText: '',
                                        timerText: '',
                                        copyText: '',
                                        checkoutButtonText: '',
                                        closeButtonText: '',
                                        closeButtonLink: '',
                                        general: ''
                                    }
                                };

                                Object.keys(backendErrors).forEach(key => {
                                    // Map backend error fields to our frontend error state
                                    switch (key) {
                                        case 'linkName':
                                            newErrors.linkName = backendErrors[key][0];
                                            break;
                                        case 'linkId':
                                            newErrors.linkId = backendErrors[key][0];
                                            break;
                                        case 'selectedProductItems':
                                            newErrors.selectedProducts = backendErrors[key][0];
                                            setProductsOpen(true);
                                            break;
                                        case 'discountData.discountValue':
                                        case 'discountValue':
                                            newErrors.discountValue = backendErrors[key][0];
                                            setDiscountsOpen(true);
                                            break;
                                        case 'discountData.discountCodeValue':
                                        case 'discountCodeValue':
                                            newErrors.discountCodeValue = backendErrors[key][0];
                                            setDiscountsOpen(true);
                                            break;
                                        // Map popup message errors
                                        case 'popupMessageData.headingText':
                                        case 'popupMessage.headingText':
                                            newErrors.popupMessage.headingText = backendErrors[key][0];
                                            setPopupMessageOpen(true);
                                            break;
                                        case 'popupMessageData.messageText':
                                        case 'popupMessage.messageText':
                                            newErrors.popupMessage.messageText = backendErrors[key][0];
                                            setPopupMessageOpen(true);
                                            break;
                                        default:
                                            // Handle other errors
                                            // console.log('Unhandled validation key:', key);
                                            break;
                                    }
                                });

                                setErrors(newErrors);
                            }

                            throw new Error(data.error || data.message || 'Failed to save link.');
                        }

                        // if (data.success) {
                        //     window.location.href = route('home', query);
                        // }

                        return data.message || (isEdit ? 'Link updated successfully!' : 'Link created successfully!');
                    } catch (error) {
                        console.error('Error in fetch operation:', error);
                        throw new Error(error.message || 'An unexpected error occurred while saving the link.');
                    }
                })(),
                {
                    loading: isEdit ? 'Updating link...' : 'Saving link...',
                    success: (msg) => msg,
                    error: (err) => err.message || 'Failed to save the link. Please try again.',
                }
            );
        } catch (error) {
            console.error('Error in saveLinkData:', error);
            toast.error(error.message || 'Failed to save the link. Please try again.');
        }
    }, [selectedProductItems, linkName, linkId, selectedProducts, discountData, popupMessageData, selectedVariantIds, link, query]);

    // -- Debounced page change handlers
    const handleNext = useCallback(() => {
        if (currentPage < totalPages && !isLoading) {
            setCurrentPage(prev => prev + 1);
        }
    }, [currentPage, totalPages, isLoading]);
    const handlePrevious = useCallback(() => {
        if (currentPage > 1 && !isLoading) {
            setCurrentPage(prev => prev - 1);
        }
    }, [currentPage, isLoading]);

    // -- Fetch on mount and when search/page changes (with AbortController)
    useEffect(() => {
        const controller = new AbortController();
        const searchTerm = isProductModalOpen ? debouncedProductSearchValue : debouncedMainProductSearch;
        fetchProducts(currentPage, searchTerm, controller);
        return () => controller.abort();
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
                    variantId: variant.shopify_product_varient_id,
                })) : [],
            }))
            : []
    ), [products]);

    // Log productData when it changes to help debug
    useEffect(() => {
        if (productData.length > 0) {
            console.log("Product data loaded:", productData);

            // Check if we need to update selected variant IDs based on Shopify IDs
            if (link && Array.isArray(link.linked_variants) && link.linked_variants.length > 0) {
                console.log("Re-syncing selected variant IDs from link data with loaded product data");

                // We need to match each linked variant to its corresponding product/variant in productData
                const updatedIds = [];

                link.linked_variants.forEach(linkVariant => {
                    // Find matching product
                    const matchingProduct = productData.find(p => p.id === `${linkVariant.product_id}`);
                    if (matchingProduct) {
                        if (linkVariant.variant_id) {
                            // Find matching variant
                            const matchingVariant = matchingProduct.variants.find(v =>
                                v.variantId === linkVariant.variant?.shopify_product_varient_id);

                            if (matchingVariant) {
                                updatedIds.push(matchingVariant.id); // Use the composite ID
                            }
                        } else {
                            // Simple product without variants
                            updatedIds.push(matchingProduct.id);
                        }
                    }
                });

                if (updatedIds.length > 0) {
                    console.log("Updating selected variant IDs after product data load:", updatedIds);
                    setSelectedVariantIds(updatedIds);
                }
            }
        }
    }, [productData, link]);
    // console.log(productData);

    // -- Basic UI Handlers
    const handleLinkNameChange = useCallback((value) => {
        setLinkName(value);
        // Clear error if value is not empty
        if (value.trim()) {
            setErrors(prev => ({ ...prev, linkName: '' }));
        } else {
            setErrors(prev => ({ ...prev, linkName: 'Link name is required' }));
        }
    }, []);
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
    const getAllVariantIds = (product) => {
        // Get all variant IDs for a product (or the product ID itself if no variants)
        const ids = product.variants.length > 0 ? product.variants.map(v => v.id) : [product.id];
        console.log(`Getting all variant IDs for product ${product.title}:`, ids);
        return ids;
    };

    // Handle product or variant checkbox change
    const handleProductOrVariantCheck = (id, checked, isProduct, product) => {
        console.log("Product/Variant Check:", { id, checked, isProduct, productTitle: product.title });

        if (isProduct) {
            // Product-level: select/deselect all its variants (or itself if no variants)
            const variantIds = getAllVariantIds(product);
            console.log("All variant IDs for product:", variantIds);

            setSelectedVariantIds(prev => {
                let newIds;
                if (checked) {
                    newIds = Array.from(new Set([...prev, ...variantIds]));
                } else {
                    newIds = prev.filter(vid => !variantIds.includes(vid));
                }
                // Update selectedProductItems
                console.log("New selected variant IDs:", newIds);
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
                console.log("New selected variant IDs (variant toggle):", newIds);
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
            variantId: v.variantId,
            shopifyVariantId: v.variantId, // Store the Shopify variant ID
            quantity: 1,
            price: v.price,
            image: product.image
        })) : [{
            id: product.id,
            productId: product.id,
            title: product.title,
            variant: null,
            variantId: null,
            shopifyVariantId: null,
            quantity: 1,
            price: product.price,
            image: product.image
        }]);

        console.log("Selected UI IDs to update product items:", variantIds);

        const selected = [];
        const seen = new Set();
        allVariants.forEach(v => {
            // The id in variantIds matches the composite id structure
            if (variantIds.includes(v.id) && !seen.has(v.id)) {
                console.log(`Adding variant to selection: ${v.title} ${v.variant || ''} (ID: ${v.id})`);
                selected.push(v);
                seen.add(v.id);
            }
        });

        // console.log("Selected product items:", selected.map(v => ({ id: v.id, shopifyVariantId: v.shopifyVariantId })));
        setSelectedProductItems(selected);

        // Clear selectedProducts error if products are selected
        if (selected.length > 0) {
            setErrors(prev => ({ ...prev, selectedProducts: '' }));
        }
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
                            shopifyVariantId: item.variantId, // Store the actual Shopify variant ID
                            quantity: 1,
                            price: item.price,
                            image: item.image
                        };

                        // console.log("Added to temp selection:", {
                        //     id: item.id,
                        //     shopifyVariantId: item.variantId
                        // });
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
    const handleDiscountValueChange = useCallback((value) => {
        setDiscountData(prev => ({ ...prev, discountValue: value }));
        // Clear error if value is not empty and order discount is enabled
        if (value.trim() && discountData.orderDiscount) {
            setErrors(prev => ({ ...prev, discountValue: '' }));
        }
    }, [discountData.orderDiscount]);
    const handleDiscountCodeChange = useCallback((value) => setDiscountData(prev => ({ ...prev, discountCode: value })), []);
    const handleDiscountCodeValueChange = useCallback((value) => {
        setDiscountData(prev => ({ ...prev, discountCodeValue: value }));
        // Clear error if value is not empty and discount code is enabled
        if (value.trim() && discountData.discountCode) {
            setErrors(prev => ({ ...prev, discountCodeValue: '' }));
        }
    }, [discountData.discountCode]);
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
    const handlePopupHeadingTextChange = useCallback((value) => {
        setPopupMessageData(prev => ({ ...prev, headingText: value }));
        // Clear error if value is not empty
        if (value.trim()) {
            setErrors(prev => ({
                ...prev,
                popupMessage: { ...prev.popupMessage, headingText: '' }
            }));
        }
    }, []);
    const handlePopupMessageTextChange = useCallback((value) => {
        setPopupMessageData(prev => ({ ...prev, messageText: value }));
        // Clear error if value is not empty
        if (value.trim()) {
            setErrors(prev => ({
                ...prev,
                popupMessage: { ...prev.popupMessage, messageText: '' }
            }));
        }
    }, []);
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
        // Clear error if value is not empty
        if (value.trim()) {
            setErrors(prev => ({
                ...prev,
                popupMessage: { ...prev.popupMessage, timerText: '' }
            }));
        }
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
        if (!checked) {
            // Remove from selectedProductItems and selectedVariantIds
            setSelectedProductItems(prev => prev.filter(item => item.id !== productId && item.productId !== productId && item.variantId !== productId));
            setSelectedVariantIds(prev => prev.filter(id => id !== productId));
        } else {
            // Optionally, re-add if needed (not required for deselect)
        }
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
        // Use fullUrl if available, otherwise use a default format with linkId
        // console.log("Copying link:", { fullUrl, linkId, shop });
        const linkUrl = fullUrl || (linkId ? `${shop}/checkout/${linkId}` : "");
        // console.log("Final link URL to copy:", linkUrl);

        if (!linkUrl) {
            if (app && app.toast) {
                app.toast.show('No link available to copy', {
                    isError: true,
                    duration: 3000
                });
            }
            return;
        }

        try {
            // Try the modern clipboard API first
            await navigator.clipboard.writeText(linkUrl);
            if (app && app.toast) {
                app.toast.show('Link copied to clipboard!', {
                    isError: false,
                    duration: 3000
                });
            }
        } catch (error) {
            console.error('Failed to use clipboard API, falling back to execCommand', error);
            // Fallback for browsers that don't support clipboard API
            try {
                const textArea = document.createElement('textarea');
                textArea.value = linkUrl;
                // Make the textarea out of viewport
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);

                if (successful) {
                    if (app && app.toast) {
                        app.toast.show('Link copied to clipboard!', {
                            isError: false,
                            duration: 3000
                        });
                    }
                } else {
                    throw new Error('execCommand copy failed');
                }
            } catch (fallbackError) {
                console.error('Clipboard copy failed completely', fallbackError);
                if (app && app.toast) {
                    app.toast.show('Failed to copy link. Please try again or copy manually.', {
                        isError: true,
                        duration: 3000
                    });
                }
            }
        }
    }, [fullUrl, linkId, app]);

    // Test link handler
    const handleTestLink = useCallback(() => {
        const linkUrl = fullUrl || (linkId ? `${shop}/checkout/${linkId}` : "");

        if (!linkUrl) {
            if (app && app.toast) {
                app.toast.show('No link available to test', {
                    isError: true,
                    duration: 3000
                });
            }
            return;
        }

        // Open the link in a new window
        window.open(linkUrl, '_blank');
    }, [fullUrl, linkId, shop, app]);

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
                    // Clear previous errors
                    setErrors({
                        linkName: '',
                        linkId: '',
                        selectedProducts: '',
                        discountValue: '',
                        discountCodeValue: '',
                        popupMessage: {
                            headingText: '',
                            messageText: '',
                            timerText: '',
                            copyText: '',
                            checkoutButtonText: '',
                            closeButtonText: '',
                            closeButtonLink: '',
                            general: ''
                        }
                    });

                    // Validate basic requirements before save
                    let hasBasicErrors = false;

                    if (!linkName.trim()) {
                        setErrors(prev => ({ ...prev, linkName: 'Link name is required' }));
                        hasBasicErrors = true;
                    }

                    if (selectedProductItems.length === 0) {
                        setErrors(prev => ({ ...prev, selectedProducts: 'At least one product must be selected' }));
                        setProductsOpen(true);
                        hasBasicErrors = true;
                    }

                    // Check if order discount is enabled but no value provided
                    if (discountData.orderDiscount && !discountData.discountValue) {
                        setErrors(prev => ({ ...prev, discountValue: 'Discount value is required' }));
                        setDiscountsOpen(true);
                        hasBasicErrors = true;
                    }

                    // Check if discount code is enabled but no value provided
                    if (discountData.discountCode && !discountData.discountCodeValue) {
                        setErrors(prev => ({ ...prev, discountCodeValue: 'Discount code is required' }));
                        setDiscountsOpen(true);
                        hasBasicErrors = true;
                    }

                    if (!hasBasicErrors) {
                        try {
                            // console.log('Link Name:', linkName);
                            // console.log('Link ID:', linkId);
                            // console.log('Selected Products:', selectedProductItems);
                            // console.log('Discount Data:', discountData);
                            // console.log('Popup Message Data:', popupMessageData);
                            saveLinkData();
                        } catch (error) {
                            console.error('Error when saving link:', error);
                            toast.error('An unexpected error occurred. Please try again.');
                        }
                    } else {
                        toast.error('Please fix the validation errors before saving');
                    }
                },
                disabled: false // Remove the disabled state to allow validation messages to show
            }}
        >
            <div className='scroll-wrapper'>
                <div className='custom-scroll'>
                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem', marginBottom: '20px' }}>
                        <BlockStack gap="300">
                            <Card>
                                <BlockStack gap="400" padding="400">
                                    <Text variant="bodyMd">Link Name</Text>
                                    <TextField
                                        label=""
                                        value={linkName}
                                        onChange={handleLinkNameChange}
                                        placeholder="Enter your Link Name"
                                        autoComplete="off"
                                        error={errors.linkName}
                                    />
                                    <Text variant="bodyMd">Link ID</Text>
                                    <TextField
                                        label=""
                                        value={linkId}
                                        // onChange={handleLinkIdChange}
                                        placeholder="https://www.example.com/ 3n49sjw3"
                                        autoComplete="off"
                                        readOnly
                                        error={errors.linkId}
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

                                    {/* Show product selection error if any */}
                                    {errors.selectedProducts && (
                                        <Box paddingInline="400">
                                            <Banner status="critical">
                                                {errors.selectedProducts}
                                            </Banner>
                                        </Box>
                                    )}

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
                                                    <>
                                                        {(() => {
                                                            const filteredProducts = productData.filter(product => product.title.toLowerCase().includes(mainProductSearch.toLowerCase()));
                                                            return (
                                                                <Text variant="bodySm" tone="subdued" style={{ display: 'block', padding: '0 18px 8px' }}>
                                                                    {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
                                                                </Text>
                                                            );
                                                        })()}
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
                                                                                    ? product.variants.every(v => {
                                                                                        const isIncluded = selectedVariantIds.includes(v.id);
                                                                                        // console.log(`Checking if variant ${v.variantTitle} (ID: ${v.id}) is included:`, isIncluded);
                                                                                        return isIncluded;
                                                                                    })
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
                                                            {currentPage < totalPages && (
                                                                <Box paddingBlockStart="200" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: '8px' }}>
                                                                    <Pagination
                                                                        hasPrevious={currentPage > 1 && !isLoading}
                                                                        onPrevious={handlePrevious}
                                                                        hasNext={currentPage < totalPages && !isLoading}
                                                                        onNext={handleNext}
                                                                        disabled={isLoading}
                                                                    />
                                                                    {isLoading && <Spinner size="small" />}
                                                                </Box>
                                                            )}
                                                            {productData.filter(product => product.title.toLowerCase().includes(mainProductSearch.toLowerCase())).length === 0 && (

                                                                <EmptyState
                                                                    heading="No products found"
                                                                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                                                                >

                                                                </EmptyState>

                                                            )}
                                                        </div>
                                                    </>
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
                                                errors={{
                                                    discountValue: errors.discountValue,
                                                    discountCodeValue: errors.discountCodeValue
                                                }}
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
                            {/* card  margin  bottom */}
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
                                                errors={errors.popupMessage}
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
                <div style={{ flex: 1, position: 'sticky', height: 'fit-content', paddingLeft: '0.5rem', overflow: 'auto' }}>
                    <BlockStack gap="300">

                        <Card>
                            <BlockStack gap="400" padding="400">
                                <InlineStack align="space-between">
                                    <Text variant="bodyMd">Summary</Text>
                                    <Button variant='plain' onClick={handleTestLink}>Test</Button>
                                </InlineStack>

                                <Box background="bg-surface-secondary" padding="400" borderRadius="2" border="base">
                                    <BlockStack gap="300">
                                        {selectedProducts > 0 &&
                                            <InlineStack gap="200" align="start">
                                                <div style={{ marginTop: "2px" }}>
                                                    <Icon source={StatusActiveIcon} tone='subdued' />
                                                </div>
                                                <Text as="span" tone="subdued">Pre-filled cart: {selectedProducts} products selected</Text>
                                            </InlineStack>


                                        }


                                        {discountData.freeShipping &&
                                            <InlineStack gap="200" align="start">
                                                <div style={{ marginTop: "2px" }}>
                                                    <Icon source={StatusActiveIcon} tone='subdued' />
                                                </div>
                                                <Text as="span" tone="subdued">Free shipping applied</Text>
                                            </InlineStack>
                                        }

                                        {discountData.orderDiscount && discountData.discountValue != '' &&
                                            <InlineStack gap="200" align="start">
                                                <div style={{ marginTop: "2px" }}>
                                                    <Icon source={StatusActiveIcon} tone='subdued' />
                                                </div>
                                                <Text as="span" tone="subdued" > Order Discount: {discountData.discountValue}% Off</Text>
                                            </InlineStack>
                                        }

                                        {discountData.discountCode &&
                                            <InlineStack gap="200" align="start">
                                                <div style={{ marginTop: "2px" }}>
                                                    <Icon source={StatusActiveIcon} tone='subdued' />
                                                </div>
                                                <Text as="span" tone="subdued">Discount code: {discountData.discountCodeValue}</Text>
                                            </InlineStack>
                                        }
                                        {popupMessageData.isActive &&

                                            <InlineStack gap="200" align="start">
                                                <div style={{ marginTop: "2px", }}>
                                                    <Icon source={StatusActiveIcon} tone='subdued' />
                                                </div>
                                                <Box maxWidth='260px'>
                                                    <Text as="span" tone="subdued"> User is prompted with popup message before checkout </Text>

                                                </Box>
                                            </InlineStack>
                                        }
                                        <InlineStack gap="500" justifyContent>
                                            <TextField
                                                id="link-url-field"
                                                value={fullUrl || (linkId ? `${shop}/checkout/${linkId}` : "")}
                                                autoComplete="off"
                                                labelHidden
                                                prefix={<Icon source={LinkIcon} tone="critical" />}
                                            />
                                            <Button icon={ClipboardIcon} onClick={handleCopyLink}>
                                                Copy
                                            </Button>
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
                                    <BlockStack gap="300">
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
                                                    <Text variant="headingSm" as="h3" textAlign='center' tone="subdued">No products selected</Text>
                                                ) : (

                                                    <Box background='' padding={'400'} borderRadius='200' border="base">
                                                        <BlockStack gap="400">

                                                            <div style={{
                                                                    maxHeight: selectedProductItems.length > 2 ? '160px' : 'auto',
                                                                    overflowY: selectedProductItems.length > 2 ? 'auto' : 'visible',
                                                                    paddingRight: selectedProductItems.length > 2 ? '8px' : '0'
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
                                                                                        <div title={product.title + (product.variant ? ` (${product.variant})` : '')}>
                                                                                            <Text
                                                                                                fontWeight="medium"
                                                                                                textAlign="center"
                                                                                                truncate
                                                                                            >
                                                                                                {product.title + (product.variant ? ` (${product.variant})` : '')}
                                                                                            </Text>
                                                                                        </div>

                                                                                    </Box>
                                                                                </InlineStack>
                                                                            </InlineStack>
                                                                            <Text fontWeight="medium" textAlign="center">${product.price || '0.00'}</Text>
                                                                        </InlineStack>
                                                                    ))}
                                                                </BlockStack>
                                                            </div>


                                                            <InlineStack align="space-between" gap="">
                                                                <Box minWidth='220px'>
                                                                    <TextField
                                                                        placeholder="Gift card"
                                                                        autoComplete="off"
                                                                            value={discountData.orderDiscount ? discountData.discountValue : ''}
                                                                            disabled={discountData.orderDiscount == 0}
                                                                    // connectedRight={
                                                                    //     <Button variant="secondary">Apply</Button>
                                                                    // }
                                                                    />

                                                                </Box>
                                                                    <Button variant="secondary" disabled={!discountData.orderDiscount}>Apply</Button>
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
                                                                                const discount = subtotal * (parseFloat(discountData.discountValue || 0) / 100);
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
                                                                                discount = subtotal * (parseFloat(discountData.discountValue || 0) / 100);
                                                                            } else if (discountData.discountCode && discountData.discountCodeValue && !isNaN(parseFloat(discountData.discountCodeValue))) {
                                                                                // Assuming discount code value represents a percentage
                                                                                const codeValue = parseFloat(discountData.discountCodeValue) || 0;
                                                                                discount = subtotal * (codeValue / 100);
                                                                            }
                                                                            // Free shipping doesn't affect the product total, only shipping cost
                                                                                return `${(subtotal - discount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
                                                            <div style={{ textAlign: 'center', whiteSpace: 'normal', wordBreak: 'break-word', width: '100%' }}>
                                                                <Text variant="bodySm" tone="subdued" as="p">
                                                                    {popupMessageData.messageText}
                                                                </Text>
                                                            </div>
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
                                                            maxHeight: selectedProductItems.filter(product => popupProductChecked[product.id] !== false).length > 2 ? '160px' : 'auto',
                                                            overflowY: selectedProductItems.filter(product => popupProductChecked[product.id] !== false).length > 2 ? 'auto' : 'visible',
                                                            paddingRight: selectedProductItems.filter(product => popupProductChecked[product.id] !== false).length > 2 ? '8px' : '0'
                                                        }}>
                                                            <BlockStack gap="400">
                                                                {selectedProductItems
                                                                    .filter(product => popupProductChecked[product.id] !== false)
                                                                    .map((product, index) => (
                                                                        <InlineStack key={product.id} align="space-between" gap="400" blockAlign='center' padding="200" borderRadius="2" border="base">
                                                                            <InlineStack gap="300" blockAlign='center' align='start' style={{ flex: 1, minWidth: 0 }}>
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
                                                                                                    <Text fontWeight="medium" textAlign='center' truncate>{product.title}</Text>
                                                                                                    {popupMessageData.showPrice && (
                                                                                                        <Text variant="bodyMd" color="subdued" style={{ display: 'flex', marginTop: 1 }}>
                                                                                                            ${product.price || '0.00'}
                                                                                                        </Text>
                                                                                                    )}
                                                                                                </div>
                                                                                            </Box>
                                                                                        </InlineStack>
                                                                                    </InlineStack>
                                                                                </Box>
                                                                            </InlineStack>
                                                                            <InlineStack gap='300' style={{ minWidth: 90, justifyContent: 'flex-end', alignItems: 'center' }}>
                                                                                {popupMessageData.allowDeselect ? (
                                                                                    <Box paddingBlockStart="100">
                                                                                        <Checkbox
                                                                                            label=""
                                                                                            checked={popupProductChecked[product.id] !== false}
                                                                                            onChange={(checked) => handlePopupProductCheck(product.id, checked)}
                                                                                        />
                                                                                    </Box>
                                                                                ) : null}
                                                                            </InlineStack>
                                                                        </InlineStack>
                                                                    ))}
                                                            </BlockStack>
                                                        </div>

                                                        {/* Order Total */}
                                                        {popupMessageData.showOrderTotal === true && (
                                                            <>
                                                                <Box borderBlockStart="base" />
                                                                <InlineStack align="space-between">
                                                                    <Text variant="headingLg" fontWeight="bold">Total </Text>
                                                                    <InlineStack align="end" gap="200" blockAlign='center'>
                                                                        <Text variant="headingXs" tone="subdued">AUD</Text>
                                                                        <Text variant="headingLg" fontWeight="bold">
                                                                            {(() => {
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
                    (() => {
                        // Count products fully selected and individual variants
                        const selectedIds = Object.keys(tempSelectedProductItems);
                        let productCount = 0;
                        let variantCount = 0;
                        productData.forEach(product => {
                            if (product.variants.length > 0) {
                                const allVariantIds = product.variants.map(v => v.id);
                                const allSelected = allVariantIds.every(id => selectedIds.includes(id));
                                if (allSelected) {
                                    productCount++;
                                } else {
                                    // Count only the selected variants for this product
                                    variantCount += allVariantIds.filter(id => selectedIds.includes(id)).length;
                                }
                            } else {
                                // Simple product (no variants)
                                if (selectedIds.includes(product.id)) {
                                    productCount++;
                                }
                            }
                        });
                        let text = '';
                        if (productCount > 0 && variantCount > 0) {
                            text = `${productCount} product${productCount !== 1 ? 's' : ''}, ${variantCount} variant${variantCount !== 1 ? 's' : ''} selected`;
                        } else if (productCount > 0) {
                            text = `${productCount} product${productCount !== 1 ? 's' : ''} selected`;
                        } else {
                            text = `${variantCount} variant${variantCount !== 1 ? 's' : ''} selected`;
                        }
                        return (
                            <div style={{ padding: '12px 16px', textAlign: 'left' }}>
                                <Text>{text}</Text>
                            </div>
                        );
                    })()
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
                            {productData.length === 0 ? (
                                <LegacyCard sectioned>
                                    <EmptyState
                                        heading="No products found"
                                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                                    >
                                    </EmptyState>
                                </LegacyCard>
                            ) : (
                                productData.map(product => (
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
                                ))
                            )}
                        </div>
                        {currentPage < totalPages && (
                            <Box
                                paddingBlockStart="200"
                                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                            >
                                <Pagination
                                    hasPrevious={currentPage > 1 && !isLoading}
                                    onPrevious={handlePrevious}
                                    hasNext={currentPage < totalPages && !isLoading}
                                    onNext={handleNext}
                                    disabled={isLoading}
                                />
                            </Box>
                        )}
                    </BlockStack>
                </Modal.Section>
            </Modal>
        </Page>
    );
}