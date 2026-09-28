<?php

namespace App\Http\Controllers;

use App\Jobs\OrderSyncJob;
use App\Models\Orders\Order;
use App\Models\Product;
use App\Jobs\ProductSyncJob;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules\Unique;

class ProductController extends Controller
{
    // Fetch settings for the current user
    public function settingsGet(Request $request)
    {
        $user = Auth::user();
        $settings = $user->settings()->whereIn('key', ['brand_color_hex', 'custom_css'])->pluck('value', 'key');
        return response()->json([
            'brand_color_hex' => $settings['brand_color_hex'] ?? null,
            'custom_css' => $settings['custom_css'] ?? '',
        ]);
    }
    public function getProducts(Request $request)
    {
        $user = Auth::user();
        $shop = env('APP_URL');

        $perPage = $request->input('per_page', 10);
        $search = $request->input('search', '');

        $query = Product::with(['variants', 'media'])
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->where('published', 'web')
            ->orderBy('title', 'asc'); // Alphabetical order

        // Search in products or their variants
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhereHas('variants', fn($v) => $v->where('title', 'like', "%{$search}%"));
            });
        }

        $products = $query->get();

        // REMOVE THIS BLOCK:
        // $filteredProducts = $products->filter(function ($product) { ... });

        // Manual pagination (no filtering)
        $paginated = $products->forPage(
            $request->input('page', 1),
            $perPage
        )->values();

        // Log::info('hey how are  you  Abdullah', json_encode($paginated->toArray(), JSON_PRETTY_PRINT));

        return response()->json([
            'success' => true,
            'message' => 'Products retrieved successfully',
            'data' => $paginated,
            'pagination' => [
                'current_page' => (int) $request->input('page', 1),
                'last_page' => ceil($products->count() / $perPage),
                'per_page' => $perPage,
                'total' => $products->count(),
                'shop' => $shop,
            ]
        ]);
    }
    public function save(Request $request)
    {
        $data = $request->validate([
            // 'brand_color' => 'required|array',
            // 'brand_color.hue' => 'numeric',
            // 'brand_color.saturation' => 'numeric',
            // 'brand_color.brightness' => 'numeric',
            'brand_color_hex' => 'string',
            'custom_css' => 'nullable|string',
        ]);


        // Example: Save to DB in a `settings` table per user/shop
        $user = Auth::user();

        // $user->settings()->updateOrCreate(
        //     ['key' => 'brand_color'],
        //     ['value' => json_encode($data['brand_color'])]
        // );

        $user->settings()->updateOrCreate(
            ['key' => 'brand_color_hex'],
            ['value' => $data['brand_color_hex'] ?? null]
        );

        $user->settings()->updateOrCreate(
            ['key' => 'custom_css'],
            ['value' => $data['custom_css'] ?? null]
        );
        return response()->json(['status' => 'success']);
    }

    /**
     * Sync products from Shopify
     */
    public function syncProducts(Request $request)
    {
        $user = Auth::user();
        $userFiltered = $user->where("deleted_at", null)->where("id", $user->id)->first();
        try {
            // Dispatch the ProductSyncJob (uses 'top' queue for highest priority)
            // Manual syncs should be processed immediately
            ProductSyncJob::dispatch($user->id); // Uses 'top' queue by default
            
            return response()->json([
                'success' => true,
                'message' => 'Product sync started. This may take a few moments.'
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to dispatch product sync job: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to start product sync. Please try again.'
            ], 500);
        }
    }
    public function batchSyncAllUsers()
    {
        
        // Get total user count
        $totalUsers = User::where("deleted_at", null)->count();
        
        // Dispatch jobs to sync all users - iteration happens inside the jobs
        // Use 'high' queue for batch syncs (lower than 'top' but higher than 'default')
        ProductSyncJob::dispatch(null, 10)->onQueue('high')->delay(now()->addSeconds(5));
        // OrderSyncJob::dispatch(null, 10)->delay(now()->addSeconds(10));
        
        return response()->json([
            'success' => true,
            'message' => 'Batch sync initiated for all users',
            'total_users' => $totalUsers,
            'sync_type' => 'incremental (10 minutes)',
            'queue' => 'high'
        ]);
    }
    public  function allUsersSync(){
        $users = User::where("deleted_at", null)->get();
        $dispatched = 0;
        $failed = 0;
        
        foreach ($users as $user) {
            try {
                // Dispatch the ProductSyncJob for each user
                // Use 'high' queue for batch syncs
                ProductSyncJob::dispatch($user->id)->onQueue('high');
                $dispatched++;
            } catch (\Exception $e) {
                Log::error('Failed to dispatch product sync job for user ID ' . $user->id . ': ' . $e->getMessage());
                $failed++;
            }
        }
        
        return response()->json([
            'success' => true,
            'message' => 'Full sync jobs dispatched for all users',
            'total_users' => $users->count(),
            'dispatched' => $dispatched,
            'failed' => $failed,
            'sync_type' => 'full',
            'queue' => 'high'
        ]);
    }
}
