<?php

namespace App\Http\Controllers;

use App\Models\Product;
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

        Log::info('Settings data received: ', $request->all());

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
}
