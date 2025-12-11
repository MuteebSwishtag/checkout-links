<?php
namespace App\Repositories\ProductVarient;

use App\Http\Traits\ResponseTrait;
use App\Models\ProductVarient;
use App\Repositories\ProductVarient\ProductVarientRepositoryInterface;


class ProductVarientRepository implements ProductVarientRepositoryInterface
{
    use ResponseTrait;
    protected $model;

    public function __construct(ProductVarient $ProductVarient)
    {
        $this->model = $ProductVarient;
    }
    public function getById(int $id)
    {
        $variant = $this->model->find($id);
        return $variant;
    }
    public function getByShopifyId(int $id)
    {
        $variant = $this->model->where('shopify_product_Varient_id', $id)->first();
        return $variant;
    }
    public function getByProductId(int $id)
    {
        $variants = $this->model->where('product_id', $id)->get();
        return $variants;
    }
    public function updateOrCreate(array $data)
    {
        // Handle any negative inventory quantities gracefully
        if (isset($data['inventory_quantity']) && $data['inventory_quantity'] < 0) {
            // Log the negative inventory instead of failing
            \Log::info('Handling negative inventory for product variant', [
                'variant_id' => $data['shopify_product_varient_id'] ?? 'unknown',
                'inventory_quantity' => $data['inventory_quantity']
            ]);
        }

        // Separate unique identifier from update fields
        $uniqueKeys = [
            'shopify_product_varient_id' => $data['shopify_product_varient_id'],
        ];
        
        // Fields to update
        $updateFields = [
            'product_id' => $data['product_id'],
            'shopify_inventory_item_id' => $data['shopify_inventory_item_id'] ?? null,
            'title' => $data['title'],
            'price' => $data['price'],
            'compare_at_price' => $data['compare_at_price'] ?? null,
            'inventory_quantity' => $data['inventory_quantity'] ?? 0,
            'inventory_policy' => strtoupper($data['inventory_policy'] ?? 'DENY'),
            'inventory_tracked' => $data['inventory_tracked'] ?? true,
        ];

        $productVarient = $this->model->updateOrCreate($uniqueKeys, $updateFields);
        return $productVarient;
    }
    public function delete(int $id)
    {
        $varient = $this->getById($id);
        $varient->delete();
    }
}

