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

        // Common variant filter closure
        $variantFilter = function ($q) {
            $q->where(function ($query) {
                $query->where('inventory_quantity', '>', 0)
                    ->orWhere(function ($subQuery) {
                        $subQuery->where('inventory_quantity', '=', 0)
                            ->where('inventory_policy', '=', 'continue');
                    });
            });
        };

        $query = Product::with([
            'variants' => $variantFilter,
            'media'
        ])
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->whereHas('variants', $variantFilter);

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', '%' . $search . '%');
                // $q->orWhere('description', 'like', '%' . $search . '%');
            });
        }

        $products = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Products retrieved successfully',
            'data' => $products->items(),
            'pagination' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
                'shop' => $shop,
            ]
        ]);
    }

}
