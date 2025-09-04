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
        $parts = explode(".", $shop->name);
        $storeName = $parts[0];

        if ($shop->theme_status == 0) {
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
                $shop->update(['theme_status' => 1]);

                // Find the main theme
                foreach ($response['body']['data']['themes']['edges'] as $themeEdge) {
                    $theme = $themeEdge['node'];
                    if ($theme['role'] == 'main') {
                        // Extract the theme ID from the GraphQL ID (format: gid://shopify/Theme/12345)
                        $themeIdParts = explode('/', $theme['id']);
                        $themeId = end($themeIdParts);

                        $url = "https://admin.shopify.com/store/" . $storeName . "/admin/themes/" . $themeId . "/editor?context=apps";
                        return response()->json($url, 201);
                    }
                }
            }
        }
        return response()->json(['error' => 'No main theme found or theme already activated'], 404);
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
