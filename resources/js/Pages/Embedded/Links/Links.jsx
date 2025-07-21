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
    EmptySearchResult
} from '@shopify/polaris'
import { EditIcon, DeleteIcon, DuplicateIcon } from '@shopify/polaris-icons'
import React, { useState, useCallback } from 'react'
import { Link, router, usePage } from '@inertiajs/react'

export default function Links() {
    const { props } = usePage();
    const query = props.ziggy.query;
    const [selectedTab, setSelectedTab] = useState(0);
    const [queryValue, setQueryValue] = useState('');
    const [sortValue, setSortValue] = useState(['linkName asc']);

    // Mock data for the table
    const links = [
        {
            id: '1',
            linkName: 'Test Link',
            urlCode: '3n49sjw3',
            status: 'Active',
            clicks: 2,
            placedOrder: 1
        },
        {
            id: '2',
            linkName: 'Ads link',
            urlCode: '5gb2d45',
            status: 'Active',
            clicks: 130,
            placedOrder: 55
        }
    ];

    const resourceName = {
        singular: 'link',
        plural: 'links',
    };

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
            content: 'Domestic',
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
        (value) => setQueryValue(value),
        [],
    );

    const handleQueryValueRemove = useCallback(() => setQueryValue(''), []);

    const handleClearAll = useCallback(() => {
        handleQueryValueRemove();
    }, [handleQueryValueRemove]);

    const { mode, setMode } = useSetIndexFiltersMode();

    const filters = [];

    const rowMarkup = links.map(
        ({ id, linkName, urlCode, status, clicks, placedOrder }, index) => (
            <IndexTable.Row
                id={id}
                key={id}
                position={index}
            >
                <IndexTable.Cell>
                    <Text variant="bodyMd" fontWeight="bold" as="span">
                        {linkName}
                    </Text>
                </IndexTable.Cell>
                <IndexTable.Cell>{urlCode}</IndexTable.Cell>
                <IndexTable.Cell>
                    <Badge tone="success">{status}</Badge>
                </IndexTable.Cell>
                <IndexTable.Cell>{clicks}</IndexTable.Cell>
                <IndexTable.Cell>{placedOrder}</IndexTable.Cell>
                <IndexTable.Cell>
                    <ButtonGroup>
                        <Tooltip content="Edit">
                            <Button size="slim" icon={EditIcon} />
                        </Tooltip>
                        <Tooltip content="Copy">
                            <Button size="slim" icon={DuplicateIcon} />
                        </Tooltip>
                        <Tooltip content="Delete">
                            <Button size="slim" icon={DeleteIcon} />
                        </Tooltip>
                    </ButtonGroup>
                </IndexTable.Cell>
            </IndexTable.Row>
        ),
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
            <Page 
                title="Links"
                primaryAction={{
                    content: 'Create a new link',
                    onAction: () => console.log(router.get(route('links.create', query)))
                }}
            >
                <Card>
                    <IndexFilters
                        queryValue={queryValue}
                        queryPlaceholder="Search links"
                        onQueryChange={handleQueryValueChange}
                        onQueryClear={handleQueryValueRemove}
                        primaryAction={{
                            content: 'Create link',
                            onAction: () => router.visit(route('links.create', query))
                        }}
                        tabs={tabs}
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
                            { title: 'Link name' },
                            { title: 'URL code' },
                            { title: 'Status' },
                            { title: 'Clicks' },
                            { title: 'Placed Order' },
                            { title: 'Actions' },
                        ]}
                        emptyState={emptyStateMarkup}
                    >
                        {rowMarkup}
                    </IndexTable>
                </Card>
            </Page>
        </div>
    )
}
