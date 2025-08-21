<?php

namespace App\Http\Controllers;

use App\Models\Products\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules\Unique;

class ProductController extends Controller
{
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
}
