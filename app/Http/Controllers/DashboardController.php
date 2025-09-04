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

        return $this->OrderRepository->SearchFilter( $filters);
    }
}
