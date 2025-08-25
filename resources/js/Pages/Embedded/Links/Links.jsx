import {
    Card,
    Page,
    Text,
    IndexTable,
    Tabs,
    Link as PolarisLink,
    Button,
    Icon,
    useIndexResourceState,
    TextField,
    ButtonGroup,
    Badge,
    Tooltip,
    IndexFilters,
    useSetIndexFiltersMode,
    EmptySearchResult,
    Pagination,
    Box,
    Spinner,
    Modal,
    InlineStack,

} from '@shopify/polaris'
import { EditIcon, DeleteIcon, DuplicateIcon, ClipboardIcon } from '@shopify/polaris-icons'
import React, { useState, useCallback, useEffect } from 'react'
import { Link, router, usePage } from '@inertiajs/react'
// import toast from 'react-hot-toast';
import { useAppBridge } from '@shopify/app-bridge-react';;
import '../../../../css/links.css'

const LinksIndex = () => {
    const { props } = usePage();
    const app = useAppBridge();
    const query = props.ziggy.query;
    const [selectedTab, setSelectedTab] = useState(0);
    const [queryValue, setQueryValue] = useState('');
    const [sortValue, setSortValue] = useState(['linkName asc']);
    const [links, setLinks] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLinks, setTotalLinks] = useState(0);
    const [loading, setLoading] = useState(false); // Add loading state
    const fetchLinks = async (page = 1, search = '') => {
        setLoading(true); // Set loading when starting fetch
        try {
            // const params = new URLSearchParams({
            //     page: page,
            //     per_page: perPage,
            //     search: search,
            // });
            // console.log('Fetching links with params:', params.toString());
            const response = await fetch(route('links.get', { ...query, page: page, per_page: perPage, search: search }), {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();

            if (data.success) {
                const mappedLinks = data.links.map(link => ({
                    id: link.id,
                    linkName: link.link_name || 'Unnamed',
                    urlCode: link.full_url || '',
                    status: 'Active',
                    clicks: link.clicks ?? 0,
                    placedOrder: link.placed_order ?? 0,
                }));

                setLinks(mappedLinks);

                if (data.pagination) {
                    // Only update totalPages and totalLinks, not currentPage (let state drive currentPage)
                    setTotalPages(data.pagination.last_page);
                    setTotalLinks(data.pagination.total);
                }
            } else {
                setLinks([]);
                setTotalPages(1);
                setTotalLinks(0);
            }
        } catch (error) {
            console.error('Error fetching links:', error);
            setLinks([]);
            setTotalPages(1);
            setTotalLinks(0);
            if (app && app.toast) {
                app.toast.show('Failed to load links. Please try again.', { isError: true, duration: 3000 });
            }
        } finally {
            setLoading(false); // Always set loading to false when done
        }
    }


    const resourceName = {
        singular: 'link',
        plural: 'links',
    };

    useEffect(() => {
        fetchLinks(currentPage, queryValue);
    }, [currentPage, queryValue]);

    const { selectedResources, allResourcesSelected, handleSelectionChange } =
        useIndexResourceState(links);

    const tabs = [
        {
            id: 'all',
            content: 'All',
            accessibilityLabel: 'All links',
            panelID: 'all-links',
        },
        {
            id: 'domestic',
            content: 'Dynamic',
            panelID: 'domestic-links',
        },
        {
            id: 'active',
            content: 'Active',
            panelID: 'active-links',
        },
        {
            id: 'draft',
            content: 'Draft',
            panelID: 'draft-links',
        },
    ];

    const handleTabChange = useCallback(
        (selectedTabIndex) => setSelectedTab(selectedTabIndex),
        [],
    );

    const handleQueryValueChange = useCallback(
        (value) => {
            // console.log('Query value changed:', value);
            setQueryValue(value);
            setCurrentPage(1); // Reset to first page on search
            fetchLinks(1, value); // Trigger search immediately
        },
        [],
    );

    const handleQueryValueRemove = useCallback(() => {
        setQueryValue('');
        setCurrentPage(1);
    }, []);

    const handleClearAll = useCallback(() => {
        handleQueryValueRemove();
    }, [handleQueryValueRemove]);

    // Pagination handlers
    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const { mode, setMode } = useSetIndexFiltersMode();
    const filters = [];

    // Handle edit button click
    const handleEdit = (linkId) => {
        router.get(route('links.edit', { ...query, id: linkId }));
    };

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);


    // Clear any existing toasts
    const handleDelete = (linkId) => {
        if (app && app.toast && app.toast.dismiss) {
            app.toast.dismiss(); // Clear any existing toasts
        }
        setDeleteTargetId(linkId);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteTargetId) return;
        try {
            const response = await fetch(route('links.delete', { ...query, id: deleteTargetId }), {
                method: 'DELETE',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                if (app && app.toast) {
                    app.toast.show(result.message || 'Failed to delete the link. Please try again.', { isError: true, duration: 3000 });
                }
                throw new Error(result.message || 'Unexpected error.');
            }
            await fetchLinks(); // Refresh the list
            if (app && app.toast) {
                app.toast.show(result.message || 'Link deleted successfully.', { duration: 3000 });
            }
        } catch (error) {
            console.error('Error in confirmDelete:', error);
        }
        setDeleteModalOpen(false);
        setDeleteTargetId(null);
    };

    const cancelDelete = () => {
        setDeleteModalOpen(false);
        setDeleteTargetId(null);
    };

    const rowMarkup = links.map(
        ({ id, linkName, urlCode, status, clicks, placedOrder }, index) => {
            const handleCopy = () => {
                //with toast notification
                if (app && app.toast && app.toast.dismiss) {
                    app.toast.dismiss(); // Clear any existing toasts
                }
                if (app && app.toast) {
                    app.toast.show('URL code copied to clipboard!', { duration: 3000 });
                }
                if (navigator && navigator.clipboard) {
                    navigator.clipboard.writeText(urlCode);
                } else {
                    // fallback for older browsers
                    const textarea = document.createElement('textarea');
                    textarea.value = urlCode;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                }
            };
            const shortCode = urlCode.split('/').pop();
            return (
                <IndexTable.Row
                    id={id}
                    key={id}
                    position={index}
                >
                    <IndexTable.Cell>
                        <Text variant="bodyMd" as="span">
                            {linkName}
                        </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        {shortCode.length > 12 ? `${shortCode.slice(0, 12)}...` : shortCode}
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <Badge tone="success">{status}</Badge>
                    </IndexTable.Cell>
                    <IndexTable.Cell>{clicks}</IndexTable.Cell>
                    <IndexTable.Cell>{placedOrder}</IndexTable.Cell>
                    <IndexTable.Cell>
                        <ButtonGroup>
                            <Tooltip content="Copy">
                                <Button size="slim" icon={ClipboardIcon} onClick={handleCopy} />
                            </Tooltip>
                            <Tooltip content="Edit">
                                <Button size="slim" icon={EditIcon} onClick={() => handleEdit(id)} />
                            </Tooltip>
                            <Tooltip content="Delete">
                                <Button size="slim" icon={DeleteIcon} onClick={() => handleDelete(id)} />
                            </Tooltip>
                        </ButtonGroup>
                    </IndexTable.Cell>
                </IndexTable.Row>
            );
        }
    );
    const emptyStateMarkup = (
        <EmptySearchResult
            title="No links found"
            description="Try changing the filters or search term"
            withIllustration
        />
    );

    return (
        <div>
            <Modal
                open={deleteModalOpen}
                onClose={cancelDelete}
                title="Delete Link"
                primaryAction={{
                    content: 'Delete',
                    destructive: true,
                    onAction: confirmDelete,
                }}
                secondaryActions={[
                    {
                        content: 'Cancel',
                        onAction: cancelDelete,
                    },
                ]}
            >
                <Box padding="500">
                    {/* <InlineStack align="center" blockAlign="center" gap="400"> */}
                    {/* <div className="p-4 bg-red-50 rounded-full"> */}
                    {/* Control size with fontSize */}
                    {/* <div >
                        <Icon source={DeleteIcon} tone="critical" />
                    </div> */}
                    {/* </div> */}
                    {/* </InlineStack> */}

                    <Box paddingBlock="400" textAlign="center">
                        <Text as="h2" variant="headingMd" fontWeight="bold">
                            Are you sure you want to delete this link?
                        </Text>
                        <Text tone="subdued" as="p">
                            This action cannot be undone. Once deleted, you will not be able to recover this link.
                        </Text>
                    </Box>
                </Box>
            </Modal>

            <Page 
                title="Links"
                primaryAction={{
                    content: 'Create a new link',
                    onAction: () => router.get(route('links.create', query))
                }}
            >
                <Card>
                    <IndexFilters
                        queryValue={queryValue}
                        queryPlaceholder="Search Links"
                        onQueryChange={handleQueryValueChange}
                        onQueryClear={handleQueryValueRemove}
                        cancelAction={{ onAction: handleQueryValueRemove }}
                        loading={loading}
                        tabs={[]}
                        selected={selectedTab}
                        onSelect={handleTabChange}
                        canCreateNewView={false}
                        filters={filters}
                        onClearAll={handleClearAll}
                        mode={mode}
                        setMode={setMode}
                    />

                    <IndexTable
                        resourceName={resourceName}
                        itemCount={links.length}
                        selectable={false}
                        headings={[
                            { title: 'Link Name' },
                            { title: 'URL Code' },
                            { title: 'Status' },
                            { title: 'Clicks' },
                            { title: 'Placed Order' },
                            { title: 'Actions' },
                        ]}
                        emptyState={emptyStateMarkup}
                    >
                        {rowMarkup}
                    </IndexTable>
                    {(currentPage > 1 || currentPage < totalPages) && (
                        <Box
                            paddingBlockStart="200"
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                paddingTop: '8px',
                            }}
                        >
                            <Pagination
                                hasPrevious={currentPage > 1}
                                onPrevious={handlePreviousPage}
                                hasNext={currentPage < totalPages}
                                onNext={handleNextPage}
                            />
                        </Box>
                    )}
                </Card>
            </Page>
        </div>
    );
};

export default LinksIndex;