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
    ImageIcon,
} from '@shopify/polaris-icons';
import { router, usePage } from '@inertiajs/react';
import { TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import toast from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import Discount from './Discount';
import PopupMessage from './PopupMessage';
import '@/Components/style.css';
import '../../../../css/links.css';

// Global quantity tracker as a last resort fallback
const GLOBAL_QUANTITIES = {};

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
    const [variantsModal, setVariantsModal] = useState(false);
    const [variantQuantity, setVariantQuantity] = useState(1);
    const [currentEditingVariant, setCurrentEditingVariant] = useState(null);
    const [localLink, setLocalLink] = useState(link || null);
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
        if (localLink) {
            // console.log("Link data:", link);
            // Editing existing link - use stored values
            console.log("Editing existing link:", localLink);
            setLinkName(localLink.link_name || '');
            setLinkId(localLink.link_url || '');
            setDiscountData({
                freeShipping: !!localLink.free_shipping,
                orderDiscount: !!localLink.order_discount,
                discountValue: localLink.discount_value || '',
                discountCode: !!localLink.discount_code,
                discountCodeValue: localLink.discount_code_value || ''
            });

            if (localLink.popup_message) {
            // console.log("Popup message data:", localLink.popup_message);
                setPopupMessageData({
                    isActive: !!localLink.popup_message.is_active,
                    headingText: localLink.popup_message.heading_text || 'Order summary',
                    messageText: localLink.popup_message.message_text || 'I hope you enjoy your discount!',
                    countdownActive: !!localLink.popup_message.countdown_active,
                    timerText: localLink.popup_message.timer_text || '1 minute',
                    copyText: localLink.popup_message.copy_text || 'This offer will expire in',
                    allowDeselect: !!localLink.popup_message.allow_deselect,
                    showPrice: !!localLink.popup_message.show_price,
                    showOrderTotal: !!localLink.popup_message.show_order_total,
                    checkoutButtonText: localLink.popup_message.checkout_button_text || 'Confirm',
                    closeButtonText: localLink.popup_message.close_button_text || 'No thanks',
                    closeButtonLink: localLink.popup_message.close_button_link || '#'
                });

                // Start timer if popup is active with countdown
                if (localLink.popup_message.is_active && localLink.popup_message.countdown_active && localLink.popup_message.timer_text) {
                    const timeInSeconds = parseTimeToSeconds(localLink.popup_message.timer_text);
                    setTimerSeconds(timeInSeconds);
                    setIsTimerActive(true);
                }
            }

            if (Array.isArray(localLink.linked_variants)) {
                const selected = localLink.linked_variants.map(v => {
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
                        quantity: v.quantity || 1  // Use the quantity from the linked_variant
                    };
                });

                setSelectedProductItems(selected);
                setSelectedProducts(selected.length);

                // Store quantities in GLOBAL_QUANTITIES for reference
                selected.forEach(item => {
                    GLOBAL_QUANTITIES[item.id] = item.quantity;
                });

                // When editing a link, store the original variant data for later matching with productData
                if (Array.isArray(localLink.linked_variants)) {
                    // Extract the variant IDs that should be selected
                    const variantIdsToSelect = [];
                    localLink.linked_variants.forEach(v => {
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
    const [initialLinkDataLoaded, setInitialLinkDataLoaded] = useState(false);
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
        // Map selected product items to include shopify variant IDs clearly and ensure quantities
        const mappedSelectedProductItems = selectedProductItems.map(item => {
            // Use quantity directly from the selectedProductItems state
            const quantity = parseInt(item.quantity) || 1;

            return {
                ...item,
                shopify_variant_id: item.shopifyVariantId || item.variantId || null,
                quantity: quantity
            };
        });

        // Ensure we have products selected
        if (mappedSelectedProductItems.length === 0) {
            toast.error('Please select at least one product');
            return null;
        }

        // Extract the actual Shopify variant IDs from the selected products
        const actualVariantIds = selectedProductItems.map(item => item.shopifyVariantId || item.variantId || null);

        // Make sure close button link has the proper prefix for the backend
        const formattedPopupMessageData = {
            ...popupMessageData,
            closeButtonLink: popupMessageData.closeButtonLink.includes('://')
                ? popupMessageData.closeButtonLink
                : `${popupMessageData.closeButtonLink}`
        };

        return {
            linkName,
            linkId,
            selectedProducts,
            selectedProductItems: mappedSelectedProductItems,
            discountData,
            popupMessageData: formattedPopupMessageData,
            selectedVariantIds: actualVariantIds,
        };
    };

    const saveLinkData = useCallback(async () => {
        // Clear any existing toast notifications before starting the request
        toast.dismiss();

        // Define the URL based on whether we are editing an existing link or creating a new one
        const isEdit = link && localLink.id;
        const url = isEdit ? route('links.update', { ...query, id: localLink.id }) : route('products.save', query);
        const method = isEdit ? 'PUT' : 'POST';

        // Define the allData variable by calling collectAllPageData
        const allData = collectAllPageData();

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(allData),
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                console.error('Error saving link:', data);
                toast.error('Failed to save the localLink. Please try again.');

                if (data.errors && typeof data.errors === 'object' && Object.keys(data.errors).length > 0) {
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
                        switch (key) {
                            case 'linkName':
                                newErrors.linkName = Array.isArray(backendErrors[key]) ? backendErrors[key][0] : backendErrors[key];
                                break;
                            case 'linkId':
                                newErrors.linkId = Array.isArray(backendErrors[key]) ? backendErrors[key][0] : backendErrors[key];
                                break;
                            case 'selectedProductItems':
                                newErrors.selectedProducts = Array.isArray(backendErrors[key]) ? backendErrors[key][0] : backendErrors[key];
                                setProductsOpen(true);
                                break;
                            default:
                                break;
                        }
                    });

                    setErrors(newErrors);
                }
            } else {
                toast.success('Link saved successfully!');

                // Redirect to the links page after successful save
                setTimeout(() => {
                    router.visit(route('links', query));
                }, 1000); // Short delay to allow the toast message to be seen
            }
        } catch (error) {
            console.error('Unexpected error:', error);
            toast.error('An unexpected error occurred. Please try again.');
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
        console.log("Fetching products...22222222");
        const controller = new AbortController();
        const searchTerm = isProductModalOpen ? debouncedProductSearchValue : debouncedMainProductSearch;

        const loadProducts = async () => {
            try {
                await fetchProducts(currentPage, searchTerm, controller);

                // After products are fetched, if we're editing a link and initialLinkDataLoaded is false,
                // check if we need to sync the selected variant IDs from the link data
                if (link && Array.isArray(localLink.linked_variants) && localLink.linked_variants.length > 0 && !initialLinkDataLoaded) {
                    console.log("Products fetched, checking if we need to sync selected variant IDs");
                    // We'll set a flag to indicate this was triggered from here
                    const fromFetch = true;

                    // Re-apply the selectedVariantIds from the link data
                    const variantIdsToSelect = [];
                    localLink.linked_variants.forEach(v => {
                        const id = v.variant_id ? `${v.product_id}_${v.variant_id}` : `${v.product_id}`;
                        variantIdsToSelect.push(id);
                    });

                    if (variantIdsToSelect.length > 0) {
                        console.log("Re-applying selected variant IDs after product fetch:", variantIdsToSelect);

                        // First update the checked state
                        const checkedState = {};
                        variantIdsToSelect.forEach(id => {
                            checkedState[id] = true;
                        });
                        setPopupProductChecked(checkedState);

                        // Then update the selected variant IDs
                        setSelectedVariantIds(variantIdsToSelect);
                    }
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error("Error fetching products:", error);
                }
            }
        };

        loadProducts();

        return () => controller.abort();
    }, [fetchProducts, currentPage, debouncedMainProductSearch, debouncedProductSearchValue, isProductModalOpen, link, initialLinkDataLoaded]);

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
    const productData = React.useMemo(() => {
        if (!Array.isArray(products) || products.length === 0) {
            return [];
        }

        console.log("Building productData from products");

        return products.map(product => {
            // Determine the appropriate image source
            const productImage = product.image ||
                (product.media && product.media[0]?.src) ||
                (product.productMedias && product.productMedias[0]?.src) || 
                'https://via.placeholder.com/50';

            // Calculate available inventory
            const productAvailable = product.available !== undefined
                ? product.available
                : Array.isArray(product.product_varients)
                    ? product.product_varients.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0)
                    : 0;

            // Process variants
            const processedVariants = Array.isArray(product.variants)
                ? product.variants.map(variant => {
                    const compositeId = `${product.id}_${variant.id}`;
                    const isSelected = selectedVariantIds.includes(compositeId);

                    return {
                        id: compositeId,
                    productId: product.id,
                    title: product.title,
                    variantTitle: variant.title,
                    price: variant.price,
                    available: variant.inventory_quantity || 0,
                        image: variant.image || productImage,
                    variantId: variant.shopify_product_varient_id,
                        shopifyVariantId: variant.shopify_product_varient_id,
                        isSelected: isSelected, // Add this flag
                        rawVariant: variant
                    };
                })
                : [];

            const isProductSelected = selectedVariantIds.includes(`${product.id}`);

            return {
                id: `${product.id}`,
                title: product.title,
                image: productImage,
                available: productAvailable,
                price: product.price,
                variants: processedVariants,
                isSelected: isProductSelected, // Add this flag
                rawProduct: product
            };
        });
    }, [products, selectedVariantIds]);

    // Update products from link data when product data is first loaded
    useEffect(() => {
        console.log("Checking for link variant matching...3333333");
        if (productData.length > 0 && link && Array.isArray(localLink.linked_variants) && localLink.linked_variants.length > 0) {
            console.log("Product data loaded, checking for link variant matching:", productData.length, "products");

            if (!initialLinkDataLoaded) {
                console.log("Re-syncing selected variant IDs from link data with loaded product data");

                // We need to match each linked variant to its corresponding product/variant in productData
                const updatedIds = [];
                const mappedVariants = {};  // Keep track of which variants map to which IDs

                localLink.linked_variants.forEach(linkVariant => {
                    // Try to find matching product
                    const productId = `${linkVariant.product_id}`;
                    const matchingProduct = productData.find(p => p.id === productId);

                    if (matchingProduct) {
                        // Try to find the exact variant if we have a variant_id
                        if (linkVariant.variant_id) {
                            const variantId = `${linkVariant.product_id}_${linkVariant.variant_id}`;

                            // Find variant by trying different matching criteria
                            let matchingVariant = null;

                            // First try direct ID match
                            matchingVariant = matchingProduct.variants.find(v => v.id === variantId);

                            // Then try by Shopify variant ID
                            if (!matchingVariant && linkVariant.variant?.shopify_product_varient_id) {
                                matchingVariant = matchingProduct.variants.find(
                                    v => v.variantId === linkVariant.variant.shopify_product_varient_id
                                );
                            }

                            if (matchingVariant) {
                                console.log(`Found matching variant for ${matchingProduct.title}:`, matchingVariant.id);
                                updatedIds.push(matchingVariant.id);
                                mappedVariants[matchingVariant.id] = {
                                    linkVariant,
                                    matchingVariant,
                                    productTitle: matchingProduct.title
                                };
                            } else {
                                console.log(`No matching variant found for ${matchingProduct.title}, variantId: ${variantId}`);
                                // Add the base product if no variant match
                                if (!updatedIds.includes(matchingProduct.id)) {
                                    updatedIds.push(matchingProduct.id);
                                    mappedVariants[matchingProduct.id] = {
                                        linkVariant,
                                        productTitle: matchingProduct.title
                                    };
                                }
                            }
                        } else {
                            // Simple product without variants
                            console.log(`Adding simple product ${matchingProduct.title}:`, matchingProduct.id);
                            updatedIds.push(matchingProduct.id);
                            mappedVariants[matchingProduct.id] = {
                                linkVariant,
                                productTitle: matchingProduct.title
                            };
                        }
                    } else {
                        console.log(`No matching product found for product_id: ${productId}`);
                    }
                });

                if (updatedIds.length > 0) {
                    console.log("Updating selected variant IDs after product data load:", updatedIds);
                    console.log("Mapped variants:", mappedVariants);

                    // Set popup product checked state
                    const checkedState = {};
                    updatedIds.forEach(id => {
                        checkedState[id] = true;
                    });
                    setPopupProductChecked(checkedState);

                    // Update selected variant IDs
                    setSelectedVariantIds(updatedIds);

                    // Mark that we've loaded the initial link data
                    setInitialLinkDataLoaded(true);
                }
            }
        }
    }, [productData, link, initialLinkDataLoaded]);

    // Add a special useEffect to preserve quantities when productData changes
    useEffect(() => {
        console.log("ProductData changed - checking if quantities need preservation44444444");
        // Don't run this on initial load
        if (selectedProductItems.length === 0 || !productData.length) return;

        console.log("ProductData changed - checking if quantities need preservation");

        // Get current quantities from selectedProductItems
        const currentQuantities = {};
        selectedProductItems.forEach(item => {
            if (item.quantity && parseInt(item.quantity) > 1) {
                currentQuantities[item.id] = parseInt(item.quantity);
                console.log(`Stored quantity for preservation: ${item.id} = ${item.quantity}`);
            }
        });

        // If we have quantities to preserve, set a timeout to restore them
        if (Object.keys(currentQuantities).length > 0) {
            setTimeout(() => {
                setSelectedProductItems(items => {
                    const needsUpdate = items.some(item =>
                        currentQuantities[item.id] && parseInt(item.quantity || 1) !== currentQuantities[item.id]
                    );

                    if (needsUpdate) {
                        console.log("Some quantities need restoration after productData change");
                        return items.map(item => {
                            if (currentQuantities[item.id]) {
                                console.log(`Restoring quantity for ${item.id}: ${currentQuantities[item.id]}`);
                                return { ...item, quantity: currentQuantities[item.id] };
                            }
                            return item;
                        });
                    }
                    return items;
                });
            }, 100);
        }
    }, [productData]);
    // console.log(productData);

    // Load quantities from localStorage at component mount
    useEffect(() => {
        console.log("Loading quantities from localStorage on mount...55555555");
        try {
            // Load from multiple storage mechanisms

            // 1. General storage
            const quantityStorage = JSON.parse(localStorage.getItem('variantQuantities') || '{}');

            // 2. Link-specific storage (if in edit mode)
            let linkQuantities = {};
            if (link && localLink.id) {
                const linkStorageKey = `link_${localLink.id}_quantities`;
                linkQuantities = JSON.parse(localStorage.getItem(linkStorageKey) || '{}');
            }

            // 3. Global backup
            const globalQuantities = JSON.parse(localStorage.getItem('global_quantities') || '{}');

            // Merge all sources into the global tracker
            Object.keys(quantityStorage).forEach(id => {
                GLOBAL_QUANTITIES[id] = parseInt(quantityStorage[id]) || 1;
            });

            Object.keys(linkQuantities).forEach(id => {
                GLOBAL_QUANTITIES[id] = parseInt(linkQuantities[id]) || 1;
            });

            Object.keys(globalQuantities).forEach(id => {
                GLOBAL_QUANTITIES[id] = parseInt(globalQuantities[id]) || 1;
            });

            console.log('Loaded quantities from all storage mechanisms:', GLOBAL_QUANTITIES);
        } catch (e) {
            console.error('Failed to load quantities from localStorage:', e);
        }
    }, []);

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
        // Create a map of existing selections for tempSelectedProductItems when opening the modal
        const obj = {};
        selectedProductItems.forEach(item => {
            // Make sure we preserve all item data including quantity
            obj[item.id] = { ...item };
        });
        setTempSelectedProductItems(obj);

        // Also update selectedVariantIds to match exactly what's in selectedProductItems
        const selectedIds = selectedProductItems.map(item => item.id);
        console.log("Setting selectedVariantIds when opening modal:", selectedIds);
        setSelectedVariantIds(selectedIds);

        // Initialize popup product checked state to match current selections
        const checkedState = {};
        selectedProductItems.forEach(product => {
            checkedState[product.id] = true;
        });
        setPopupProductChecked(checkedState);
        setIsProductModalOpen(true);
        setProductSearchValue('');
    }, [selectedProductItems]);

    const handleProductModalClose = useCallback(() => {
        // Just close the modal without changing selections
        console.log("Closing product modal without changing selections");
        setIsProductModalOpen(false);
        setProductSearchValue('');
    }, []);

    const handleProductModalDone = useCallback(() => {
        // Get all selected product items from the temporary state
        const selectedArray = Object.values(tempSelectedProductItems);

        console.log("Product modal done with selections:", selectedArray.map(item => ({
            id: item.id,
            title: item.title,
            variant: item.variant,
            quantity: item.quantity
        })));

        // Extract the variant IDs first to ensure they're preserved correctly
        const variantIds = selectedArray.map(product => product.id);
        console.log("Setting selectedVariantIds from done button:", variantIds);

        // Ensure we don't re-load from link data since we have user selections now
        setInitialLinkDataLoaded(true);

        // Update the states in a specific order to avoid race conditions
        setSelectedVariantIds(variantIds);

        // Update selected product count immediately to match the total selections
        setSelectedProducts(selectedArray.length);

        // Create a map of existing quantities for preservation
        const quantityMap = {};
        selectedProductItems.forEach(item => {
            if (item && item.id) {
                quantityMap[item.id] = parseInt(item.quantity) || 1;
                console.log(`Adding to quantity map: ${item.id} = ${quantityMap[item.id]}`);
            }
        });

        // Also check localStorage for any saved quantities
        try {
            const storedQuantities = JSON.parse(localStorage.getItem('variantQuantities') || '{}');
            Object.keys(storedQuantities).forEach(id => {
                if (!quantityMap[id]) {
                    quantityMap[id] = parseInt(storedQuantities[id]) || 1;
                    console.log(`Adding from localStorage to quantity map: ${id} = ${quantityMap[id]}`);
                }
            });
        } catch (e) {
            console.error('Failed to load quantities from localStorage:', e);
        }

        // Use the selections from tempSelectedProductItems but preserve existing item data
        setSelectedProductItems(prevItems => {
            // Create a map of existing items for quick lookup
            const existingItemsMap = {};
            prevItems.forEach(item => {
                if (item && item.id) {
                    existingItemsMap[item.id] = item;
                }
            });

            // Process the selections from tempSelectedProductItems
            const newItems = selectedArray.map(item => {
                if (!item || !item.id) return null;

                // Keep existing item data when available to preserve any custom values
                const existingItem = existingItemsMap[item.id];
                if (existingItem) {
                    return existingItem;
                }

                // Otherwise use the new item data, but preserve quantity if available
                const quantity = item.quantity || quantityMap[item.id] || 1;
                console.log(`Setting quantity for new item ${item.id}: ${quantity}`);

                return {
                    ...item,
                    quantity: quantity
                };
            }).filter(Boolean); // Remove any null items

            // Log the new items for debugging
            newItems.forEach(item => {
                console.log(`Final item ${item.id} has quantity: ${item.quantity}`);
            });

            return newItems;
        });

        // Update popup product checked state
        const checkedState = {};
        selectedArray.forEach(product => {
            if (product && product.id) {
                checkedState[product.id] = true;
            }
        });
        setPopupProductChecked(checkedState);

        // Close the modal
        setIsProductModalOpen(false);
        setProductSearchValue('');
    }, [tempSelectedProductItems, selectedProductItems]);

    // Helper: get all variant ids for a product
    const getAllVariantIds = (product) => {
        // Get all variant IDs for a product (or the product ID itself if no variants)
        const ids = product.variants.length > 0 ? product.variants.map(v => v.id) : [product.id];
        console.log(`Getting all variant IDs for product ${product.title}:`, ids);
        return ids;
    };

    // Handle opening the variants modal with the specific variant
    const handleEditVariant = (product) => {
        setCurrentEditingVariant(product);

        // Get the current quantity from the product, or from localStorage as a fallback
        let quantity = parseInt(product.quantity) || 1;

        try {
            const storedQuantities = JSON.parse(localStorage.getItem('variantQuantities') || '{}');
            if (storedQuantities[product.id]) {
                quantity = parseInt(storedQuantities[product.id]) || quantity;
                console.log(`Loaded quantity from localStorage for ${product.id}: ${quantity}`);
            }
        } catch (e) {
            console.error('Failed to load quantity from localStorage:', e);
        }

        console.log(`Setting variant quantity for ${product.id} to ${quantity}`);
        setVariantQuantity(quantity);
        setVariantsModal(true);
    };

    // Save the updated quantity for the current variant
    // Save the updated quantity for the current variant
    const handleSaveVariantQuantity = () => {
        if (!currentEditingVariant) return;

        const quantityValue = parseInt(variantQuantity) || 1;
        console.log(`Saving quantity ${quantityValue} for variant ${currentEditingVariant.id}`);

        // Update the selected product items with the new quantity
        setSelectedProductItems(prevItems => {
            return prevItems.map(item => {
                if (item.id === currentEditingVariant.id) {
                    return {
                        ...item,
                        quantity: quantityValue
                    };
                }
                return item;
            });
        });

        // Also update the quantity in tempSelectedProductItems if modal is open
        if (Object.keys(tempSelectedProductItems).length > 0) {
            setTempSelectedProductItems(prev => {
                const updated = {
                    ...prev,
                    [currentEditingVariant.id]: {
                        ...(prev[currentEditingVariant.id] || {}),
                        quantity: quantityValue
                    }
                };
                return updated;
            });
        }

        // Store in GLOBAL_QUANTITIES for reference only
        GLOBAL_QUANTITIES[currentEditingVariant.id] = quantityValue;

        setVariantsModal(false);
    };
    const handleCancelVariantQuantity = () => {
        if (!currentEditingVariant) return;

        const resetValue = 1;

        // Reset in selectedProductItems
        setSelectedProductItems(prevItems => {
            return prevItems.map(item => {
                if (item.id === currentEditingVariant.id) {
                    return {
                        ...item,
                        quantity: resetValue
                    };
                }
                return item;
            });
        });

        // Reset in tempSelectedProductItems if modal is open
        if (Object.keys(tempSelectedProductItems).length > 0) {
            setTempSelectedProductItems(prev => {
                const updated = {
                    ...prev,
                    [currentEditingVariant.id]: {
                        ...(prev[currentEditingVariant.id] || {}),
                        quantity: resetValue
                    }
                };
                return updated;
            });
        }

        // Reset global reference too
        GLOBAL_QUANTITIES[currentEditingVariant.id] = resetValue;

        // Close modal & reset input
        setVariantQuantity("1");
        setVariantsModal(false);
    };


    // Handle product or variant checkbox change
    const handleProductOrVariantCheck = (id, checked, isProduct, product) => {
        setSelectedVariantIds(prev => {
            let newIds;
        if (isProduct) {
            // Product-level: select/deselect all its variants (or itself if no variants)
            const variantIds = getAllVariantIds(product);
            if (checked) {
                newIds = Array.from(new Set([...prev, ...variantIds]));
            } else {
                newIds = prev.filter(vid => !variantIds.includes(vid));
            }
        } else {
            // Variant-level: toggle only this variant
            if (checked) {
                newIds = Array.from(new Set([...prev, id]));
            } else {
                newIds = prev.filter(vid => vid !== id);
            }
            }

            // Also update popup product checked state
            const checkedState = {};
            newIds.forEach(id => checkedState[id] = true);
            setPopupProductChecked(prev => ({ ...prev, ...checkedState }));

            return newIds;
        });
    };
    // Helper to update selectedProductItems based on selectedVariantIds
    const updateSelectedProductItems = (variantIds, existingItems = {}) => {
        // Try to load global quantities from localStorage if we haven't already
        if (Object.keys(GLOBAL_QUANTITIES).length === 0) {
            try {
                const globalQuantities = JSON.parse(localStorage.getItem('global_quantities') || '{}');
                Object.assign(GLOBAL_QUANTITIES, globalQuantities);
                console.log('Loaded global quantities from localStorage:', GLOBAL_QUANTITIES);
            } catch (e) {
                console.error('Failed to load global quantities:', e);
            }
        }

        // Create a lookup from the current selectedProductItems to preserve quantities
        const existingQuantityMap = {};
        selectedProductItems.forEach(item => {
            if (item && item.id) {
                // Store the quantity and also update our global tracker
                const qty = parseInt(item.quantity) || 1;
                existingQuantityMap[item.id] = qty;
                GLOBAL_QUANTITIES[item.id] = qty;
                console.log(`Storing quantity for ${item.id}: ${qty}`);
            }
        });

        // Flatten all variants and products
        const allVariants = productData.flatMap(product => product.variants.length > 0 ? product.variants.map(v => {
            const existing = existingItems[v.id];
            // Check all possible sources for quantity in order of precedence
            let quantity = 1;

            if (existing && existing.quantity) {
                quantity = parseInt(existing.quantity) || 1;
                console.log(`Using existing quantity for ${v.id}: ${quantity}`);
            } else if (existing && existing._persistedQuantity) {
                quantity = parseInt(existing._persistedQuantity) || 1;
                console.log(`Using persisted quantity for ${v.id}: ${quantity}`);
            } else if (existingQuantityMap[v.id]) {
                quantity = existingQuantityMap[v.id];
                console.log(`Using stored quantity for ${v.id}: ${quantity}`);
            } else if (GLOBAL_QUANTITIES[v.id]) {
                quantity = GLOBAL_QUANTITIES[v.id];
                console.log(`Using global quantity for ${v.id}: ${quantity}`);
            }

            // Always update the global tracker
            GLOBAL_QUANTITIES[v.id] = quantity;

            return {
                id: v.id,
                productId: product.id,
                title: product.title,
                variant: v.variantTitle,
                variantId: v.variantId,
                shopifyVariantId: v.variantId, // Store the Shopify variant ID
                quantity: quantity, // Use preserved quantity
                price: v.price,
                image: product.image
            };
        }) : [{
            id: product.id,
            productId: product.id,
            title: product.title,
            variant: null,
            variantId: null,
            shopifyVariantId: null,
            quantity: (() => {
                // Check all possible sources for quantity in order of precedence
                let quantity = 1;

                if (existingItems[product.id] && existingItems[product.id].quantity) {
                    quantity = parseInt(existingItems[product.id].quantity) || 1;
                    console.log(`Using existing quantity for ${product.id}: ${quantity}`);
                } else if (existingItems[product.id] && existingItems[product.id]._persistedQuantity) {
                    quantity = parseInt(existingItems[product.id]._persistedQuantity) || 1;
                    console.log(`Using persisted quantity for ${product.id}: ${quantity}`);
                } else if (existingQuantityMap[product.id]) {
                    quantity = existingQuantityMap[product.id];
                    console.log(`Using stored quantity for ${product.id}: ${quantity}`);
                } else if (GLOBAL_QUANTITIES[product.id]) {
                    quantity = GLOBAL_QUANTITIES[product.id];
                    console.log(`Using global quantity for ${product.id}: ${quantity}`);
                }

                // Always update the global tracker
                GLOBAL_QUANTITIES[product.id] = quantity;

                return quantity;
            })(),
            price: product.price,
            image: product.image
        }]); console.log("Selected UI IDs to update product items:", variantIds);

        // Keep all existing selections that are not on the current page
        // and add new selections from the current page
        setSelectedProductItems(prev => {
            const currentPageItems = [];
            const currentPageIds = new Set();
            const seen = new Set();

            // Identify which IDs are on the current page
            allVariants.forEach(v => {
                currentPageIds.add(v.id);
            });

            // Keep all previous selections that are still in variantIds
            // (regardless of whether they're on the current page or not)
            const previousSelections = prev.filter(item =>
                variantIds.includes(item.id) && !currentPageIds.has(item.id)
            );            // Add items from the current page that are selected
            allVariants.forEach(v => {
                if (variantIds.includes(v.id) && !seen.has(v.id)) {
                    console.log(`Adding variant to selection: ${v.title} ${v.variant || ''} (ID: ${v.id})`);

                    // Find if this variant already exists in the previous items to preserve quantity
                    const existingItem = prev.find(item => item.id === v.id);
                    if (existingItem) {
                        // Use existing item with its quantity
                        const preservedQuantity = existingItem.quantity || 1;
                        console.log(`Preserving existing quantity for ${v.id}: ${preservedQuantity}`);
                        currentPageItems.push({
                            ...v,
                            quantity: preservedQuantity
                        });
                    } else {
                    // Use the new item
                        currentPageItems.push(v);
                    }
                    seen.add(v.id);
                }
            });

            // Combine previous selections with current page selections
            const mergedSelections = [...previousSelections, ...currentPageItems];

            // Clear selectedProducts error if products are selected
            if (mergedSelections.length > 0) {
                setErrors(prev => ({ ...prev, selectedProducts: '' }));
            }

            // Update the selected products count to reflect all selections
            setSelectedProducts(mergedSelections.length);

            return mergedSelections;
        });
    };

    // Update selectedProductItems when selectedVariantIds changes
    useEffect(() => {
        console.log("Checking for updates to selectedProductItems...666666");
        if (productData.length > 0) {
            console.log("Triggering updateSelectedProductItems due to change in selectedVariantIds or productData");

            // Store current quantities before update to preserve them
            const currentItems = {};
            const currentQuantities = {};

            selectedProductItems.forEach(item => {
                // Store the entire item data
                currentItems[item.id] = item;

                // Also store quantities separately for debugging and fallback
                if (item.quantity && item.quantity > 1) {
                    currentQuantities[item.id] = item.quantity;
                    console.log(`Storing quantity for ${item.id}: ${item.quantity}`);
                }
            });

            // Update selected items based on variant IDs
            updateSelectedProductItems(selectedVariantIds, currentItems);

            // After a short delay, check if any quantities were lost and restore them
            if (Object.keys(currentQuantities).length > 0) {
                setTimeout(() => {
                    setSelectedProductItems(items => {
                        const needsUpdate = items.some(item =>
                            currentQuantities[item.id] && parseInt(item.quantity || 1) !== parseInt(currentQuantities[item.id])
                        );

                        if (needsUpdate) {
                            console.log("Some quantities were lost, restoring them...");
                            return items.map(item => {
                                if (currentQuantities[item.id]) {
                                    console.log(`Restoring quantity for ${item.id}: ${currentQuantities[item.id]}`);
                                    return { ...item, quantity: currentQuantities[item.id] };
                                }
                                return item;
                            });
                        }
                        return items;
                    });
                }, 50);
            }
        }
    }, [selectedVariantIds, productData]);

    // Load saved quantities from localStorage when selectedProductItems changes
    useEffect(() => {
        console.log("Loading quantities from localStorage...7777777");
        try {
            // First try to load link-specific quantities if editing a link
            if (link && localLink.id) {
                const linkStorageKey = `link_${localLink.id}_quantities`;
                const linkQuantities = JSON.parse(localStorage.getItem(linkStorageKey) || '{}');

                if (Object.keys(linkQuantities).length > 0) {
                    console.log(`Found link-specific quantities for link ${localLink.id}`);
                    setSelectedProductItems(prevItems => {
                        return prevItems.map(item => {
                            // If we have a stored quantity for this item, use it
                            if (linkQuantities[item.id]) {
                                console.log(`Restoring quantity for ${item.id} from link storage: ${linkQuantities[item.id]}`);
                                return {
                                    ...item,
                                    quantity: parseInt(linkQuantities[item.id]) || 1
                                };
                            }
                            return item;
                        });
                    });
                    return; // If we loaded link-specific quantities, don't try general ones
                }
            }

            // Fall back to general quantities
            const storedQuantities = JSON.parse(localStorage.getItem('variantQuantities') || '{}');

            if (Object.keys(storedQuantities).length > 0) {
                setSelectedProductItems(prevItems => {
                    return prevItems.map(item => {
                        // If we have a stored quantity for this item, use it
                        if (storedQuantities[item.id]) {
                            console.log(`Restoring quantity for ${item.id} from localStorage: ${storedQuantities[item.id]}`);
                            return {
                                ...item,
                                quantity: parseInt(storedQuantities[item.id]) || 1
                            };
                        }
                        return item;
                    });
                });
            }
        } catch (e) {
            console.error('Failed to load quantities from localStorage:', e);
        }
    }, []);  // Only run once on component mount

    // Update tempSelectedProductItems when selectedVariantIds changes
    useEffect(() => {
        console.log("Checking for updates to tempSelectedProductItems...8888888");
        if (productData.length > 0 && selectedVariantIds.length > 0) {
            console.log("Updating tempSelectedProductItems from selectedVariantIds:", selectedVariantIds);

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

                // Create a copy of previous selections to retain items from other pages
                let updated = { ...prev };
                const currentPageIds = new Set(allVariants.map(v => v.id));

                // Update selections from current page
                allVariants.forEach(item => {
                    const isSelected = selectedVariantIds.includes(item.id);

                    if (isSelected) {
                        // This item is selected, add or update it
                        updated[item.id] = {
                            id: item.id,
                            productId: item.productId,
                            title: item.title,
                            variant: item.variantTitle,
                            variantId: item.variantId,
                            shopifyVariantId: item.variantId, // Store the actual Shopify variant ID
                            quantity: updated[item.id]?.quantity || 1,
                            price: item.price,
                            image: item.image
                        };
                    } else if (currentPageIds.has(item.id)) {
                        // Item is on current page but not selected, remove it
                        delete updated[item.id];
                    }
                });

                // Now handle IDs that are in selectedVariantIds but not on current page
                // We keep them as they are from previous selections

                // Finally, remove any selections that aren't in selectedVariantIds anymore
                Object.keys(updated).forEach(id => {
                    if (!selectedVariantIds.includes(id)) {
                        delete updated[id];
                    }
                });

                return updated;
            });
        }
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
    const handlePopupCloseButtonLinkChange = useCallback((value) => {
        // No need to normalize as the TextField already has a prefix
        setPopupMessageData(prev => ({ ...prev, closeButtonLink: value }));
    }, []);

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
        console.log("Setting up timer interval...9999999");
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
        toast.dismiss(); // Clear any existing toasts
        // Get the text value from the link-url-field TextField
        const linkUrlField = document.getElementById('link-url-field');
        const linkUrl = linkUrlField ? linkUrlField.value : (fullUrl || (linkId ? `${shop}/checkout/${linkId}` : ""));

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

            toast.success('Link copied to clipboard!', {
                isError: false,
                duration: 3000
            });
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
                    toast.success('Link copied to clipboard!', {
                        duration: 3000
                    });
                } else {
                    throw new Error('execCommand copy failed');
                }
            } catch (fallbackError) {
                // console.error('Clipboard copy failed completely', fallbackError);
                toast.error('Failed to copy localLink. Please try again or copy manually.', {
                    duration: 3000
                });
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

    // Function to normalize URLs
    const normalizeUrl = (url) => {
        if (!/^https?:\/\//i.test(url)) {
            return `http://${url}`;  // Changed from https to http
        }
        return url;
    };

    // Example usage in the close button link logic
    const handleCloseButtonClick = (link) => {
        const normalizedLink = normalizeUrl(link);
        // Use the normalized link for navigation or saving
        console.log('Navigating to:', normalizedLink);
        window.location.href = normalizedLink;
    };

    // -- UI Render
    return (
        <Page
            title='Create Link'
            backAction={{
                content: 'Links',
<<<<<<< HEAD
                onAction: () => router.get(route('links', query))

=======
                onAction: () => router.visit(route('links', query))
>>>>>>> 298da717bdcee1074ddd949fb82e240379fc263d
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

                            // Clear any existing toast notifications before trying to save
                            toast.dismiss();
                            saveLinkData();
                        } catch (error) {
                            console.error('Error when saving link:', error);
                            // Only show error if it's not a validation error (which already shows a toast)
                            if (!error.message || !error.message.includes('validation errors')) {
                                toast.dismiss();
                                toast.error('An unexpected error occurred. Please try again.');
                            }
                        }
                    } else {
                        // Clear any existing toast notifications before showing error
                        toast.dismiss();
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
                                                                    <div key={product.id} style={{ borderBottom: '1px solid #eee', padding: '12px 0' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                                            <Checkbox
                                                                                label=""
                                                                                checked={product.isSelected}
                                                                                indeterminate={product.variants.length > 0 &&
                                                                                    product.variants.some(v => v.isSelected) &&
                                                                                    !product.variants.every(v => v.isSelected)}
                                                                                onChange={checked => handleProductOrVariantCheck(product.id, checked, true, product)}
                                                                            />
                                                                            {product.image ? (
                                                                                <Thumbnail
                                                                                    source={product.image}
                                                                                    alt={product.title}
                                                                                    size="small"
                                                                                />
                                                                            ) : (
                                                                                <Thumbnail source={ImageIcon} size="small" alt={product.title} />
                                                                            )}
                                                                            <div style={{ flex: 1 }}>
                                                                                <Text fontWeight="medium">{product.title}</Text>
                                                                                <Text variant="bodySm" color="subdued">
                                                                                    Available: {product.available}
                                                                                </Text>
                                                                                {product.variants.length === 0 && (
                                                                                    <Text variant="bodySm" color="subdued">Price: ${product.price}</Text>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        {product.variants.length > 0 && (
                                                                            <div style={{ marginLeft: 44, marginTop: 8 }}>
                                                                                {product.variants.map(variant => (
                                                                                    <div key={variant.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                                                                        <Checkbox
                                                                                            label=""
                                                                                            checked={variant.isSelected}
                                                                                            onChange={checked => handleProductOrVariantCheck(variant.id, checked, false, product)}
                                                                                        />
                                                                                        <div style={{ flex: 1 }}>
                                                                                            <Text fontWeight="medium">{variant.variantTitle}</Text>
                                                                                            <Text variant="bodySm" color="subdued">
                                                                                                Available: {variant.available}
                                                                                            </Text>
                                                                                            <Text variant="bodySm" color="subdued">Price: ${variant.price}</Text>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))
                                                            }
                                                            {/* Show pagination only if needed - when there's more than one page */}
                                                            {(currentPage > 1 || currentPage < totalPages) && (
                                                                <Box paddingBlockStart="200" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: '8px' }}>
                                                                    <Pagination
                                                                        hasPrevious={currentPage > 1 && !isLoading}
                                                                        onPrevious={handlePrevious}
                                                                        hasNext={currentPage < totalPages && !isLoading}
                                                                        onNext={handleNext}
                                                                        disabled={isLoading}
                                                                    />

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
                                                                                            {product.image ? (
                                                                                                <Thumbnail
                                                                                                    source={product.image}
                                                                                                    alt={product.title}
                                                                                                    size="small"
                                                                                                />
                                                                                            ) : (
                                                                                                <Thumbnail source={ImageIcon} size="small" alt={product.title} />
                                                                                            )}
                                                                                            <Box maxWidth="180px">
                                                                                                <div style={{ display: 'inline-block', width: '100%' }} title={product.title + (product.variant ? ` (${product.variant})` : '')}>
                                                                                                    <Text fontWeight="medium" truncate as="span">
                                                                                                        {product.title}
                                                                                                        {product.variant && ` (${product.variant})`}
                                                                                                    </Text>
                                                                                                </div>
                                                                                                <Text variant="bodySm" tone="subdued" style={{ display: 'block', marginTop: '4px' }}>
                                                                                                    <span id={`quantity-${product.id}`} style={{ display: 'inline-block', minHeight: '18px', fontWeight: 'bold' }}>
                                                                                                        Quantity: {product.quantity || 1}
                                                                                                    </span>
                                                                                                </Text>
                                                                                                {/* Use a hidden component to persist quantity */}
                                                                                                <div style={{ display: 'none' }}>
                                                                                                    {product._persistedQuantity = product.quantity || product._persistedQuantity || GLOBAL_QUANTITIES[product.id] || 1}
                                                                                                    {console.log(`Rendering product ${product.title} with quantity:`, product.quantity || product._persistedQuantity || GLOBAL_QUANTITIES[product.id] || 1)}
                                                                                                </div>
                                                                                            </Box>
                                                                                        </InlineStack>
                                                                                        <InlineStack gap="200">
                                                                                            <Button variant="plain" onClick={() => handleEditVariant(product)}>
                                                                                                    Edit 
                                                                                            </Button>
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
                                    {errors.selectedProducts && (
                                        <Box paddingInline="400">
                                            <Banner status="critical" title="Error" tone='critical'>
                                                {errors.selectedProducts}
                                            </Banner>
                                        </Box>
                                    )}
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
                                    <Text variant="bodyMd" fontWeight='bold'>Summary</Text>
                                    <Button variant='plain' onClick={handleTestLink}>Test</Button>
                                </InlineStack>

                                <Box background="bg-surface-secondary" padding="400" borderRadius="2" border="base">
                                    <BlockStack gap="300">
                                        {selectedProducts > 0 &&
                                            <InlineStack gap="200" align="start">
                                                <div style={{ marginTop: "2px" }}>
                                                    <Icon source={StatusActiveIcon} tone='subdued' />
                                                </div>
                                                <Text as="span" tone="subdued">
                                                    Pre-filled cart: {selectedProductItems.length} {selectedProductItems.length === 1 ? 'item' : 'items'} selected
                                                </Text>
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
                                    <Text variant="bodyMd" fontWeight='bold'>Preview </Text>
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
                                                                                        {product.image ? (
                                                                                            <Thumbnail
                                                                                                source={product.image}
                                                                                                alt={product.title}
                                                                                                size="small"
                                                                                            />
                                                                                        ) : (
                                                                                            <Thumbnail source={ImageIcon} size="small" alt={product.title} />
                                                                                        )}
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
                                                                                                {(() => {
                                                                                                    const text = product.title;
                                                                                                    return text.length > 10 ? `${text.slice(0, 10)}...` : text;
                                                                                                })()}
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


                                                                <Box paddingBlock="300">
                                                                    <div style={{ borderTop: '1px solid var(--p-border-subdued)' }}></div>
                                                                </Box>

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

                                                                                discount = subtotal * (parseFloat(discountData.discountValue || 0) / 100);

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
                                                                        <InlineStack key={`${product.id}_${index}`} align="space-between" gap="400" blockAlign='center' padding="200" borderRadius="2" border="base">
                                                                            <InlineStack gap="300" blockAlign='center' align='start' style={{ flex: 1, minWidth: 0 }}>
                                                                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                                                                    <Box
                                                                                        background="bg-surface"
                                                                                        padding="200"
                                                                                        borderRadius="100"
                                                                                        minWidth="40px"
                                                                                        minHeight="40px"
                                                                                    >
                                                                                        {product.image ? (
                                                                                            <Thumbnail
                                                                                                source={product.image}
                                                                                                alt={product.title}
                                                                                                size="small"
                                                                                            />
                                                                                        ) : (
                                                                                            <Thumbnail source={ImageIcon} size="small" alt={product.title} />
                                                                                        )}
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
                                                                <Box paddingBlock="300">
                                                                    <div style={{ borderTop: '1px solid var(--p-border-subdued)' }}></div>
                                                                </Box>
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
                                                                                let hasDiscount = false;
                                                                                if (discountData.orderDiscount) {
                                                                                    discount = subtotal * (parseFloat(discountData.discountValue) / 100);
                                                                                    hasDiscount = true;
                                                                                } else if (discountData.discountCode) {
                                                                                    // Assuming discount code value represents a percentage
                                                                                    const codeValue = parseFloat(discountData.discountCodeValue) || 0;
                                                                                    discount = subtotal * (codeValue / 100);
                                                                                    hasDiscount = true;
                                                                                }
                                                                                // Free shipping doesn't affect the product total, only shipping cost

                                                                                return (subtotal - discount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                                                                            })()}
                                                                        </Text>
                                                                    </InlineStack>
                                                                </InlineStack>

                                                                {/* Display discount information */}
                                                                {(discountData.orderDiscount || discountData.discountCode) && (
                                                                    <InlineStack align="end" gap="200">
                                                                        <Box>
                                                                            <Icon
                                                                                source={ProductIcon}
                                                                                tone="subdued"
                                                                            />
                                                                        </Box>
                                                                        <Text variant="bodySm" tone="subdued">
                                                                            ${discountData.discountValue}% OFF ORDER
                                                                        </Text>
                                                                    </InlineStack>
                                                                )}
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


            {/* variants modal */}


           <Modal
  open={variantsModal}
  onClose={() => setVariantsModal(false)}
                title="Edit Variant Quantity"
  primaryAction={{
    content: 'Save',
      onAction: handleSaveVariantQuantity,
  }}
  secondaryActions={[
    {
      content: 'Cancel',
          onAction: handleCancelVariantQuantity
    },
  ]}
>
                <Modal.Section>
                    <BlockStack gap="400">
                        {currentEditingVariant && (
                            <InlineStack gap="400" align="center">
                                {/* {image ? (
                                    <Thumbnail
                                        source={image}
                                        alt={title}
                                        size="small"
                                    />
                                ) : (
                                    <Thumbnail source={ImageIcon} size="small" alt={title} />
                                )} */}
                                <Text fontWeight="medium">{currentEditingVariant.title} {currentEditingVariant.variant ? `(${currentEditingVariant.variant})` : ''}</Text>
                            </InlineStack>
                        )}
                        <TextField
                            label="Quantity"
                            value={variantQuantity}
                            min={1}
                            type="number"
                            onChange={(value) => {
                                const numberValue = parseInt(value) || 1;
                                setVariantQuantity(numberValue.toString());

                                // Pre-update the global quantity tracker in real-time
                                if (currentEditingVariant && currentEditingVariant.id) {
                                    GLOBAL_QUANTITIES[currentEditingVariant.id] = numberValue;
                                    console.log(`Pre-updated global quantity tracker for ${currentEditingVariant.id} to ${numberValue}`);
                                }
                            }}
                            autoComplete="off"
                            helpText="Set the quantity for this product variant"
                            onBlur={() => {
                                // Ensure minimum quantity of 1
                                if (!variantQuantity || parseInt(variantQuantity) < 1) {
                                    setVariantQuantity("1");
                                }
                            }}
                        />
                    </BlockStack>
                </Modal.Section>
</Modal>

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
                        // Group selected items by product id prefix
                        const productVariantMap = {};
                        selectedProductItems.forEach(item => {
                            // Assume id format is "productId_variantId" for variants, or just "productId" for products
                            const [productId, variantId] = item.id.split('_');
                            if (!productVariantMap[productId]) {
                                productVariantMap[productId] = [];
                            }
                            if (variantId) {
                                productVariantMap[productId].push(variantId);
                            } else {
                                productVariantMap[productId].push(null); // simple product
                            }
                        });
                        // Count products and variants
                        let productCount = 0;
                        let variantCount = 0;
                        Object.values(productVariantMap).forEach(variants => {
                            if (variants.length === 1 && variants[0] === null) {
                                productCount++;
                            } else {
                                productCount++;
                                variantCount += variants.filter(v => v !== null).length;
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
                            {productData.map(product => (
                                <div key={product.id} style={{ borderBottom: '1px solid #eee', padding: '12px 0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <Checkbox
                                            label=""
                                            checked={product.isSelected}
                                            indeterminate={product.variants.some(v => v.isSelected) &&
                                                !product.variants.every(v => v.isSelected)}
                                            onChange={checked => handleProductOrVariantCheck(product.id, checked, true, product)}
                                        />
                                        {product.image ? (
                                            <Thumbnail
                                                source={product.image}
                                                alt={product.title}
                                                size="small"
                                            />
                                        ) : (
                                            <Thumbnail source={ImageIcon} size="small" alt={product.title} />
                                        )}
                                        <div style={{ flex: 1 }}>
                                            <Text fontWeight="medium">{product.title}</Text>
                                            <Text variant="bodySm" color="subdued">
                                                Available: {product.available}
                                            </Text>
                                            {product.variants.length === 0 && (
                                                <Text variant="bodySm" color="subdued">Price: ${product.price}</Text>
                                            )}
                                        </div>
                                    </div>
                                    {product.variants.length > 0 && (
                                        <div style={{ marginLeft: 44, marginTop: 8 }}>
                                            {product.variants.map(variant => (
                                                <div key={variant.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                                    <Checkbox
                                                        label=""
                                                        checked={variant.isSelected}
                                                        onChange={checked => handleProductOrVariantCheck(variant.id, checked, false, product)}
                                                    />
                                                    <div style={{ flex: 1 }}>
                                                        <Text fontWeight="medium">{variant.variantTitle}</Text>
                                                        <Text variant="bodySm" color="subdued">Price: ${variant.price}</Text>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        {/* Show pagination only if needed - when there's more than one page */}
                        {(currentPage > 1 || currentPage < totalPages) && (
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
                        </div>
                    </BlockStack>
                </Modal.Section>
            </Modal>
        </Page>
    );
}  