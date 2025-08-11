<?php

namespace App\Http\Controllers;

use App\Models\Products\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

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
            ->where('status', 'active'); // only active products

        // Search in products or their variants
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhereHas('variants', fn($v) => $v->where('title', 'like', "%{$search}%"));
            });
        }

        $products = $query->get();

        // Filter variants and remove products with no variants left
        $filteredProducts = $products->filter(function ($product) {
            $filteredVariants = [];

            foreach ($product->variants as $variant) {
                $policy = strtolower(trim($variant->inventory_policy));
                $quantity = (int) $variant->inventory_quantity;
                $tracked = (bool) ($variant->inventory_tracked ?? true);

                if (
                    // If inventory is NOT tracked → always include
                    !$tracked ||

                        // If inventory is tracked → include based on policy & quantity
                    ($tracked && (
                        $policy === 'continue' ||
                        ($policy === 'deny' && $quantity > 0)
                    ))
                ) {
                    $filteredVariants[] = $variant;
                }
            }

            // Replace variants with filtered list
            $product->setRelation('variants', collect($filteredVariants)->values());

            // Keep product only if it has at least one variant left
            return count($filteredVariants) > 0;
        });

        // Manual pagination after filtering
        $paginated = $filteredProducts->forPage(
            $request->input('page', 1),
            $perPage
        )->values();

        return response()->json([
            'success' => true,
            'message' => 'Products retrieved successfully',
            'data' => $paginated,
            'pagination' => [
                'current_page' => (int) $request->input('page', 1),
                'last_page' => ceil($filteredProducts->count() / $perPage),
                'per_page' => $perPage,
                'total' => $filteredProducts->count(),
                'shop' => $shop,
            ]
        ]);
    }
}
