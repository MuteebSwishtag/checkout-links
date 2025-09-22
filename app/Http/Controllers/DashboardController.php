<?php

namespace App\Http\Controllers;

use App\Jobs\OrderSyncJob;
use Illuminate\Http\Request;
use App\Repositories\Order\OrderRepositoryInterface;
use Illuminate\Support\Facades\Auth;
use App\Jobs\ProductSyncJob;
use App\Models\User;
use Illuminate\Support\Facades\Log;


class DashboardController extends Controller
{
    protected $OrderRepository;

    public function __construct(OrderRepositoryInterface $OrderRepository)
    {
        $this->OrderRepository = $OrderRepository;
    }
    public function index()
    {
        // OrderSyncJob::dispatch(auth()->user()->id);
        $user = Auth::user();
        if ($user->product_sync == 0) {
            ProductSyncJob::dispatch($user->id);
            $user->product_sync = 1;
            $user->save();
        }
        return $this->render('Dashboard');
    }

    public function theme_setting_status(Request $request)
    {
        $shop = User::where("name", $request->query('shop'))->first();

        // Check if shop exists
        if (!$shop) {
            Log::error('Shop not found: ' . $request->query('shop'));
            return response()->json(['error' => 'Shop not found'], 404);
        }

        $parts = explode(".", $shop->name);
        $storeName = $parts[0];

        // Always get themes regardless of theme_status
        // GraphQL query to get themes
        $query = <<<QUERY
        {
          themes(first: 10) {
            edges {
              node {
                id
                name
                role
              }
            }
          }
        }
        QUERY;

        // Execute GraphQL query
        $response = $shop->api()->graph($query);
        Log::info('GraphQL Response: ' . print_r($response, true));
        Log::info('Store Name: ' . $storeName);
        Log::info('Theme Status: ' . $shop->theme_status);
        Log::info('Response Body: ' . print_r($response['body'], true));

        if (isset($response['body']['data']['themes']['edges']) && !empty($response['body']['data']['themes']['edges'])) {
            // Update theme status if it was 0
            if ($shop->theme_status == 0) {
                $previousStatus = $shop->theme_status;
                $updateResult = $shop->update(['theme_status' => 1]);
                Log::info('Theme status updated: ' . ($updateResult ? 'Success' : 'Failed') .
                    ' (Previous: ' . $previousStatus . ', Current: ' . $shop->theme_status . ')');
            }

            // Find the main theme
            foreach ($response['body']['data']['themes']['edges'] as $themeEdge) {
                $theme = $themeEdge['node'];
                if (strtoupper($theme['role']) == 'MAIN') {
                    // Extract the theme ID from the GraphQL ID (format: gid://shopify/OnlineStoreTheme/12345)
                    $themeIdParts = explode('/', $theme['id']);
                    $themeId = end($themeIdParts);

                    Log::info('Found main theme: ' . $theme['name'] . ' with ID: ' . $themeId);

                    // Make sure we have a valid numeric ID
                    if (is_numeric($themeId)) {
                        $url = "https://admin.shopify.com/store/" . $storeName . "/admin/themes/" . $themeId . "/editor?context=apps";
                        return response()->json($url, 201);
                    } else {
                        Log::error('Invalid theme ID format: ' . $theme['id']);
                    }
                }
            }
        }

        // If we reached here, no main theme was found
        Log::info('Theme setup failed: No main theme found');
        return response()->json(['error' => 'No main theme found'], 404);
    }

    public function checkThemeStatus(Request $request)
    {
        $shop = User::where("name", $request->query('shop'))->first();
        if (!$shop) {
            return response()->json(['theme_status' => 0], 200);
        }

        return response()->json(['theme_status' => (int) $shop->theme_status], 200);
    }

    public function orderSeacrhfilter(Request $request)
    {
        $filters = $request->all();
        $filters['relation'] = [
            'orderCustomer',
            'OrderFulfillments',
            'OrderLineItems',
            'OrderShippingAddress',
        ];

        $filters['financial_status'] = $request->financial_status;
        $filters['fulfillment_status'] = $request->fulfillment_status;

        return $this->OrderRepository->SearchFilter($filters);
    }

    private function randomKey20Digits()
    {
        $key = '';
        for ($i = 0; $i < 20; $i++) {
            $key .= random_int(0, 9);
        }
        return $key;
    }

    public function getAppBlock(Request $request)
    {
        $user = auth()->user();

        // Get the main theme ID using GraphQL
        $query = <<<GRAPHQL
        {
          themes(first: 1, query: "role:main") {
            edges {
              node {
                id
              }
            }
          }
        }
        GRAPHQL;

        $data = $user->api()->graph($query);
        if (isset($data['errors']) || empty($data['body']['data']['themes']['edges'])) {
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while fetching themes!',
                'data' => null
            ]);
        }
        $theme_id = $data['body']['data']['themes']['edges'][0]['node']['id'];

        // Get the settings_data.json file content
        $query = <<<GRAPHQL
        {
          onlineStoreTheme(id: "$theme_id") {
            files(first: 1, query: "filename:config/settings_data.json") {
              edges {
                node {
                  filename
                  body
                }
              }
            }
          }
        }
        GRAPHQL;

        $data = $user->api()->graph($query);
        if (isset($data['errors']) || empty($data['body']['data']['onlineStoreTheme']['files']['edges'])) {
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while fetching theme file!',
                'data' => null
            ]);
        }
        $theme_json = $data['body']['data']['onlineStoreTheme']['files']['edges'][0]['node']['body'];
        $theme_data = json_decode($theme_json, true);
        $theme_blocks = collect(isset($theme_data['current']['blocks']) ? $theme_data['current']['blocks'] : []);
        $theme_blocks = $theme_blocks->filter(function ($value) {
            return str_contains($value['type'], '75f1063a-3e3e-43ad-aaf4-91098c20048c');
        });

        if ($theme_blocks->count() < 1) {
            $randomKey = $this->randomKey20Digits();
            return response()->json([
                'success' => true,
                'message' => 'Theme app blocks not found!',
                'data' => json_decode('{
                    "' . $randomKey . '": {
                        "type": "shopify://apps/checkoutlinks/blocks/star_rating/75f1063a-3e3e-43ad-aaf4-91098c20048c",
                        "disabled": true,
                        "settings": {
                        }
                      }
                }')
            ]);
        }
        return response()->json([
            'success' => true,
            'message' => 'Theme app blocks retrieved successfully!',
            'data' => $theme_blocks
        ]);
    }

    public function enableAppBlock(Request $request)
    {
        $user = auth()->user();

        // Get the main theme ID using GraphQL
        $query = <<<GRAPHQL
        {
          themes(first: 1, query: "role:main") {
            edges {
              node {
                id
              }
            }
          }
        }
        GRAPHQL;

        $data = $user->api()->graph($query);
        if (isset($data['errors']) || empty($data['body']['data']['themes']['edges'])) {
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while fetching themes!',
                'data' => null
            ]);
        }
        $theme_id = $data['body']['data']['themes']['edges'][0]['node']['id'];

        // Get the settings_data.json file content
        $query = <<<GRAPHQL
        {
          onlineStoreTheme(id: "$theme_id") {
            files(first: 1, query: "filename:config/settings_data.json") {
              edges {
                node {
                  filename
                  body
                }
              }
            }
          }
        }
        GRAPHQL;

        $data = $user->api()->graph($query);
        if (isset($data['errors']) || empty($data['body']['data']['onlineStoreTheme']['files']['edges'])) {
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while fetching theme file!',
                'data' => null
            ]);
        }
        $theme_json = $data['body']['data']['onlineStoreTheme']['files']['edges'][0]['node']['body'];
        $theme_data = json_decode($theme_json);

        $theme_blocks = collect(isset($theme_data->current->blocks) ? $theme_data->current->blocks : []);
        if (is_string($theme_data->current)) {
            $theme_data->current = (object) [];
        }
        if ($theme_blocks->count() < 1) {
            $theme_data->current->blocks = (object) $theme_blocks->toArray();
        }
        $found = false;
        $theme_blocks->transform(function ($value) use (&$found) {
            if (str_contains($value->type, '75f1063a-3e3e-43ad-aaf4-91098c20048c')) {
                $value->disabled = false;
                $found = true;
            }
            return $value;
        });
        if (!$found) {
            $theme_blocks = $theme_blocks->toArray();
            $randomKey = $this->randomKey20Digits();
            $theme_blocks[$randomKey] = [
                'type' => 'shopify://apps/checkoutlinks/blocks/star_rating/75f1063a-3e3e-43ad-aaf4-91098c20048c',
                'disabled' => false,
                'settings' => (object) [],
            ];
        }
        $theme_data->current->blocks = (object) $theme_blocks;
        $new_theme_json = json_encode($theme_data, JSON_PRETTY_PRINT);

        // Update the theme file using GraphQL mutation
        $mutation = <<<GRAPHQL
        mutation themeFilesUpsert(\$files: [OnlineStoreThemeFileInput!]!, \$id: ID!) {
          onlineStoreThemeFilesUpsert(files: \$files, themeId: \$id) {
            upsertedThemeFiles {
              filename
            }
            userErrors {
              field
              message
            }
          }
        }
        GRAPHQL;

        $variables = [
            'id' => $theme_id,
            'files' => [
                [
                    'filename' => 'config/settings_data.json',
                    'body' => $new_theme_json
                ]
            ]
        ];

        $data = $user->api()->graph($mutation, $variables);
        if (isset($data['errors']) || !empty($data['body']['data']['onlineStoreThemeFilesUpsert']['userErrors'])) {
            return response()->json([
                'success' => false,
                'message' => 'An error occurred while updating theme file!',
                'data' => $data['body']['data']['onlineStoreThemeFilesUpsert']['userErrors'] ?? null
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'App block enabled successfully!',
            'data' => $data
        ]);
    }
}
